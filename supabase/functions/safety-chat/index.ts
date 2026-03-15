import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple bad-word detection (German + English)
const BAD_WORDS = [
  "fick", "fck", "scheiße", "scheisse", "hurensohn", "wichser", "arschloch",
  "missgeburt", "bastard", "hure", "fotze", "schwuchtel", "spast",
  "fuck", "shit", "bitch", "asshole", "nigger", "faggot", "cunt",
  "motherfucker", "dick", "pussy", "retard", "whore",
  "nazi", "heil hitler", "sieg heil",
  "ich bring dich um", "ich töte dich", "du sollst sterben",
  "kill yourself", "kys",
];

function containsBadContent(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-zäöüß\s]/g, "");
  return BAD_WORDS.some((w) => lower.includes(w));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    // Check the latest user message for bad content
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg && containsBadContent(lastUserMsg.content)) {
      return new Response(
        JSON.stringify({
          blocked: true,
          reason: "Unangemessene Sprache erkannt. Du wirst für 5 Minuten gesperrt.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Du bist "Sentinel AI", ein freundlicher und hilfsbereiter Sicherheitsexperte für das Internet. 
Du hilfst Nutzern bei Fragen zu:
- Datenschutz und Privatsphäre im Internet
- Sichere Passwörter und Passwort-Manager
- Phishing und Online-Betrug erkennen
- Sichere Nutzung von Social Media
- VPN, Verschlüsselung und anonymes Surfen
- Malware, Viren und wie man sich schützt
- Kindersicherheit im Internet
- DSGVO und Datenschutzrechte
- Sichere E-Mail-Kommunikation
- Zwei-Faktor-Authentifizierung

Antworte immer auf Deutsch, sei freundlich und erkläre Dinge verständlich – auch für Anfänger. 
Verwende Emojis sparsam aber passend. Halte Antworten kurz und präzise (max 3-4 Absätze).
Wenn du dir bei etwas nicht sicher bist, sage es ehrlich.`,
            },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es gleich nochmal." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "KI-Guthaben aufgebraucht." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "KI-Fehler aufgetreten" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("safety-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
