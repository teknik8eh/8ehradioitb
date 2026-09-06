import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  debug: process.env.NODE_ENV !== "production",
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!profile?.email) {
        return false;
      }

      // Look up whitelisted email case-insensitively (covers historical mixed-case entries)
      const whitelistedEmail = await prisma.whitelistedEmail.findFirst({
        where: {
          email: {
            equals: profile.email,
            mode: "insensitive",
          },
        },
      });

      if (!whitelistedEmail) {
        return false; // Deny access
      }

      // Keep Account tokens fresh on every sign-in so server-side API calls
      // (e.g. Drive export) always have a valid access_token + refresh_token.
      // Only update tokens if user.id is a valid MongoDB ObjectId.
      // On first login for script-seeded users, user.id is the Google sub ID
      // (a 21-digit number), not an ObjectId — updateMany would throw a
      // Malformed ObjectID error in that case.
      const isValidObjectId = /^[0-9a-f]{24}$/i.test(user?.id ?? "");
      if (account?.provider === "google" && isValidObjectId) {
        // Sync Google profile picture and name into User on every sign-in so
        // the avatar stays current if the user updates their Google account.
        await prisma.user.update({
          where: { id: user.id },
          data: {
            image: profile.picture ?? user.image,
            name: profile.name ?? user.name,
          },
        });

        // Keep Account tokens fresh so server-side API calls always have a
        // valid access_token + refresh_token.
        await prisma.account.updateMany({
          where: { userId: user.id, provider: "google" },
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            ...(account.refresh_token && { refresh_token: account.refresh_token }),
          },
        });
      }

      return true; // Allow access
    },
    async jwt({ token, user }) {
      // Always fetch fresh user data from DB — on sign-in, user.role/image are
      // stale (pre-signIn callback). On subsequent requests, token.sub is used.
      const id = user?.id ?? token?.sub;
      if (id) {
        const latestUser = await prisma.user.findUnique({
          where: { id },
          select: { role: true, image: true },
        });
        token.role = latestUser?.role ?? user?.role ?? token.role;
        token.image = latestUser?.image ?? user?.image ?? token.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.image = token.image;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
