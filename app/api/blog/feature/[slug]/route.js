
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !hasAnyRole(session.user.role, ['DEVELOPER', 'REPORTER'])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const slug = params.slug;

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Un-feature all other posts
      await tx.blogPost.updateMany({
        where: {
          isFeatured: true,
        },
        data: {
          isFeatured: false,
        },
      });

      // 2. Feature the selected post
      await tx.blogPost.update({
        where: {
          slug: slug,
        },
        data: {
          isFeatured: true,
        },
      });
    });

    return NextResponse.json({ message: `Post ${slug} has been featured.` });

  } catch (error) {
    console.error("Error featuring post:", error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
} 