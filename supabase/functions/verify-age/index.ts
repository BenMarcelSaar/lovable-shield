import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Kein Bild bereitgestellt.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service nicht verfügbar.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an age estimation expert. Analyze the photo and estimate the person's age. 
Reply ONLY with valid JSON: {"estimated_age": <number>, "confidence": "low"|"medium"|"high"}
If the image doesn't show a clear face, reply: {"error": "no_face"}
Be conservative - if unsure, estimate younger rather than older.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Estimate the age of the person in this photo.' },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Zu viele Anfragen, bitte warte.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service vorübergehend nicht verfügbar.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Analyse fehlgeschlagen.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Analyse fehlgeschlagen.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (result.error === 'no_face') {
      return new Response(JSON.stringify({ success: false, error: 'Kein Gesicht erkannt. Bitte mache ein deutliches Foto von dir.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const age = result.estimated_age;
    const allowed = typeof age === 'number' && age >= 11;

    return new Response(JSON.stringify({ 
      success: true, 
      estimated_age: age, 
      allowed,
      confidence: result.confidence || 'medium'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Age verify error:', error);
    return new Response(JSON.stringify({ error: 'Analyse fehlgeschlagen.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
