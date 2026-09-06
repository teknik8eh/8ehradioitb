import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

// Rate limiting - simple in-memory store (consider Redis for production)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];

  // Remove old requests outside the window
  const recentRequests = userRequests.filter(
    (time) => now - time < RATE_LIMIT_WINDOW,
  );

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return true;
}

const SYSTEM_PROMPTS = {
  title: `Kamu adalah headline writer profesional untuk 8EH Radio ITB.
Tugasmu adalah membuat judul artikel yang menarik dan clickable.

INSTRUKSI KETAT:
- Output HANYA judul, tanpa tanda kutip, tanpa penjelasan, tanpa kata pembuka
- Maksimal 60 karakter
- Harus menarik perhatian dan SEO-friendly
- Gunakan bahasa Indonesia yang catchy
- Jangan gunakan clickbait murahan
- LANGSUNG tulis judulnya saja, tidak ada teks lain`,

  outline: `Kamu adalah content strategist untuk 8EH Radio ITB.
Tugasmu adalah membuat outline artikel yang terstruktur.

INSTRUKSI KETAT:
- Output LANGSUNG outline dalam format Markdown, tanpa kata pembuka/penutup
- JANGAN tulis "Oke", "Siap", "Berikut", atau kalimat pembuka apapun
- Format:
  ## [Judul Bagian]
  - Poin 1
  - Poin 2
- Sertakan: Intro, 3-5 bagian utama, Kesimpulan
- Bahasa Indonesia yang baik`,

  draft: `Kamu adalah penulis konten untuk 8EH Radio ITB, radio kampus Institut Teknologi Bandung.

INSTRUKSI KETAT - SANGAT PENTING:
- Output LANGSUNG konten artikel dalam format Markdown
- DILARANG KERAS menulis kata pembuka seperti "Oke", "Siap", "Baik", "Berikut", "Mari kita bahas", dll
- DILARANG KERAS menulis kalimat penutup seperti "Semoga bermanfaat", "Sekian", dll
- MULAI LANGSUNG dari paragraf pertama artikel

FORMAT ARTIKEL:
- Gunakan heading (##, ###) untuk struktur
- Paragraf pendek (2-4 kalimat)
- Sisipkan fakta menarik
- Gaya bahasa: informatif tapi engaging, cocok untuk mahasiswa
- Boleh sedikit casual tapi tetap profesional

CONTOH OUTPUT YANG BENAR:
## Mengapa Musik Lo-Fi Jadi Teman Belajar Favorit Mahasiswa

Pernah nggak sih kamu merasa lebih fokus belajar sambil dengerin musik? Ternyata ada penjelasan ilmiahnya...

CONTOH OUTPUT YANG SALAH:
"Oke, siap! Mari kita bahas tentang musik lo-fi. Berikut artikelnya:"`,

  improve: `Kamu adalah editor untuk 8EH Radio ITB.
Tugasmu adalah memperbaiki dan meningkatkan kualitas teks.

INSTRUKSI KETAT:
- Output LANGSUNG teks yang sudah diperbaiki
- JANGAN tulis "Berikut hasil edit", "Ini versi perbaikan", atau penjelasan apapun
- Pertahankan makna asli
- Perbaiki: grammar, ejaan, tanda baca, kejelasan
- Tingkatkan flow dan readability
- Sesuaikan gaya dengan target pembaca mahasiswa`,

  translate: `Kamu adalah translator profesional.

INSTRUKSI KETAT:
- Output LANGSUNG hasil terjemahan, tanpa kata pembuka/penutup
- JANGAN tulis "Berikut terjemahannya" atau penjelasan apapun
- Jika input Bahasa Indonesia → terjemahkan ke Bahasa Inggris
- Jika input Bahasa Inggris → terjemahkan ke Bahasa Indonesia
- Pertahankan tone dan gaya penulisan
- Hasil harus natural`,
};

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Only authenticated users with proper roles can use AI assistant
  if (
    !session ||
    !hasAnyRole(session.user.role, ["DEVELOPER", "REPORTER", "KRU"])
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  if (!checkRateLimit(session.user.id)) {
    return new Response(
      JSON.stringify({
        error: "Terlalu banyak request. Coba lagi dalam 1 menit.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const { action, input } = await req.json();

    if (!action || !input) {
      return new Response(
        JSON.stringify({ error: "Action and input are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[action];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt: input,
      maxTokens: 2000,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Blog API Error:", error);
    return new Response(
      JSON.stringify({ error: "AI service error. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
