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
    const { content, title } = await req.json();

    if (!content || content.length < 50) {
      return new Response(
        JSON.stringify({
          error: "Konten terlalu pendek (minimal 50 karakter)",
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
Tugasmu adalah menyarankan tags yang relevan untuk artikel blog.

ATURAN:
- Sarankan 3-6 tags yang relevan
- Tags harus dalam bahasa Indonesia
- Gunakan kata kunci yang umum dicari
- Format output: tag1, tag2, tag3 (dipisahkan koma)
- HANYA output tags, tanpa penjelasan atau nomor`,
      prompt: `Sarankan tags untuk artikel berikut:\n\nJudul: ${title || "Tidak ada judul"}\n\nKonten:\n${content.substring(0, 1500)}`,
      maxTokens: 50,
    });

    // Clean up the tags
    const tags = text
      .trim()
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag && tag.length > 0)
      .join(", ");

    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Tags Error:", error);
    return new Response(
      JSON.stringify({ error: "AI service error. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
