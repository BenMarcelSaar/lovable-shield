import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    // Authenticate user and check Plus status server-side
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Check global AI toggle
    const { data: aiSettings } = await supabaseAdmin
      .from('ai_settings')
      .select('ai_enabled')
      .limit(1)
      .maybeSingle();

    if (aiSettings && aiSettings.ai_enabled === false) {
      return new Response(
        JSON.stringify({ error: "🛑 Sentinel AI ist aktuell deaktiviert. Bitte versuche es später erneut." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let isPlus = false;
    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('sentinel_plus_until, is_admin')
          .eq('id', user.id)
          .single();
        
        isPlus = profile?.is_admin === true || 
          (!!profile?.sentinel_plus_until && new Date(profile.sentinel_plus_until) > new Date());
      }
    }

    const { messages } = await req.json();

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
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "KI-Dienst vorübergehend nicht verfügbar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const model = isPlus ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
    
    const systemPrompt = isPlus
      ? `Du bist "Sentinel AI Plus", ein erstklassiger Premium-Sicherheitsexperte für das Internet.
Du bist die erweiterte Version von Sentinel AI mit tieferem Fachwissen und ausführlicheren Antworten.

Du hilfst Nutzern bei allen Fragen zu:
- Datenschutz und Privatsphäre im Internet (inkl. fortgeschrittene Techniken)
- Sichere Passwörter, Passwort-Manager und Hardware-Sicherheitsschlüssel
- Phishing, Spear-Phishing und Social Engineering erkennen und verhindern
- Sichere Nutzung von Social Media und Datenschutzeinstellungen
- VPN, Tor, Verschlüsselung (E2E, PGP) und anonymes Surfen
- Malware, Ransomware, Zero-Day-Exploits und wie man sich schützt
- Kindersicherheit im Internet und Jugendschutz
- DSGVO, Datenschutzrechte und digitale Selbstverteidigung
- Sichere E-Mail-Kommunikation und verschlüsselte Messenger
- Zwei-Faktor-Authentifizierung und biometrische Sicherheit
- Netzwerksicherheit, Firewall-Konfiguration und IoT-Sicherheit
- Dark Web Monitoring und Identitätsschutz
- Code-Sicherheit und sichere Entwicklungspraktiken

Du bist ein Premium-Berater: Antworte ausführlich, detailliert und mit konkreten Schritt-für-Schritt-Anleitungen.
Gib praktische Empfehlungen mit spezifischen Tool-Vorschlägen. Erkläre auch technische Hintergründe.
Antworte immer auf Deutsch, sei professionell aber freundlich. Verwende Emojis passend.
Du darfst bis zu 6-8 Absätze verwenden wenn nötig.`
      : `Du bist "Sentinel AI", ein freundlicher und hilfsbereiter Sicherheitsexperte für das Internet. 
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
Wenn du dir bei etwas nicht sicher bist, sage es ehrlich.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
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
      JSON.stringify({ error: "KI-Dienst vorübergehend nicht verfügbar." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
