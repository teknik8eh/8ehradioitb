import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasRole } from "@/lib/roleUtils";

async function checkDeveloper(req) {
    const session = await getServerSession(authOptions);
    if (!session || !hasRole(session.user.role, "DEVELOPER")) {
      return { error: "Forbidden", status: 403 };
    }
    return { session };
}

export async function POST(req) {
    const { error, status } = await checkDeveloper(req);
    if (error) return NextResponse.json({ error }, { status });

    try {
        const allUsers = await prisma.user.findMany({
            select: { email: true, role: true }
        });

        const existingWhitelistedEmails = (await prisma.whitelistedEmail.findMany({
            select: { email: true }
        })).map(e => e.email.toLowerCase());

        const usersToWhitelist = allUsers.filter(user => 
            user.email && !existingWhitelistedEmails.includes(user.email.toLowerCase())
        );

        if (usersToWhitelist.length === 0) {
            return NextResponse.json({ message: "All existing users are already in the whitelist.", count: 0 });
        }

        const result = await prisma.whitelistedEmail.createMany({
            data: usersToWhitelist.map(user => ({
                email: user.email.toLowerCase(),
            })),
        });

        return NextResponse.json({ message: `Successfully synced ${result.count} users to the whitelist.` , count: result.count });
    } catch (err) {
        console.error("Error syncing existing users to whitelist:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
} 