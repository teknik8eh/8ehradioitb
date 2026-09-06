import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasAnyRole(session.user.role, ["DEVELOPER", "REPORTER", "KRU"])
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { content } = await req.json();

    if (!content || content.length < 100) {
      return new Response(
        JSON.stringify({
          error: "Konten terlalu pendek (minimal 100 karakter)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: `Kamu adalah SEO specialist untuk 8EH Radio ITB.
Tugasmu adalah membuat meta description yang menarik untuk artikel blog.

ATURAN:
- Maksimal 155-160 karakter
- Harus menarik dan mengundang klik
- Gunakan bahasa Indonesia
- Hindari clickbait berlebihan
- Sertakan kata kunci penting dari artikel
- Output HANYA deskripsi, tanpa penjelasan atau tanda kutip`,
      prompt: `Buatkan meta description untuk artikel berikut:\n\n${content.substring(0, 2000)}`,
      maxTokens: 100,
    });

    return new Response(JSON.stringify({ description: text.trim() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Summarize Error:", error);
    return new Response(
      JSON.stringify({ error: "AI service error. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
