import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHA256_RE = /^[a-f0-9]{64}$/i;
const URL_RE = /^https?:\/\/.+/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY');
  if (!VIRUSTOTAL_API_KEY) {
    console.error('VIRUSTOTAL_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Scan-Dienst vorübergehend nicht verfügbar.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { type, url, fileHash, fileName, fileSize } = await req.json();

    // Validate type
    if (type !== 'url' && type !== 'file') {
      return new Response(JSON.stringify({ error: 'Ungültiger Scan-Typ.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    if (type === 'url') {
      // Validate URL
      if (!url || typeof url !== 'string' || !URL_RE.test(url) || url.length > 2048) {
        return new Response(JSON.stringify({ error: 'Ungültige URL.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const submitRes = await fetch('https://www.virustotal.com/api/v3/urls', {
        method: 'POST',
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(url)}`,
      });

      const submitText = await submitRes.text();
      let submitData;
      try {
        submitData = JSON.parse(submitText);
      } catch {
        console.error('VT submit response not JSON:', submitRes.status, submitText.substring(0, 200));
        throw new Error('VirusTotal API error');
      }
      if (!submitRes.ok) {
        console.error('VT URL submit failed:', submitRes.status, JSON.stringify(submitData));
        throw new Error('VirusTotal API error');
      }

      await new Promise(r => setTimeout(r, 3000));

      const analysisId = submitData.data?.id;
      const analysisRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { 'x-apikey': VIRUSTOTAL_API_KEY },
      });

      const analysisText = await analysisRes.text();
      let analysisData;
      try {
        analysisData = JSON.parse(analysisText);
      } catch {
        console.error('VT analysis response not JSON:', analysisRes.status, analysisText.substring(0, 200));
        throw new Error('VirusTotal API error');
      }
      const stats = analysisData.data?.attributes?.stats || {};
      const results = analysisData.data?.attributes?.results || {};

      const threats: string[] = [];
      for (const [engine, detail] of Object.entries(results)) {
        const d = detail as any;
        if (d.category === 'malicious' || d.category === 'suspicious') {
          threats.push(`${engine}: ${d.result || d.category}`);
        }
      }

      const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
      result = {
        name: url,
        size: '-',
        type: 'url',
        status: malicious > 0 ? 'threat' : 'clean',
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0,
        harmless: stats.harmless || 0,
        undetected: stats.undetected || 0,
        threats: threats.slice(0, 5),
        totalEngines: Object.keys(results).length,
      };
    } else if (type === 'file') {
      // Validate file hash
      if (!fileHash || typeof fileHash !== 'string' || !SHA256_RE.test(fileHash)) {
        return new Response(JSON.stringify({ error: 'Ungültiger Datei-Hash.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Sanitize fileName and fileSize
      const safeName = typeof fileName === 'string' ? fileName.slice(0, 255) : fileHash;
      const safeSize = typeof fileSize === 'string' ? fileSize.slice(0, 50) : '-';

      const hashRes = await fetch(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
        headers: { 'x-apikey': VIRUSTOTAL_API_KEY },
      });

      const hashText = await hashRes.text();

      if (hashRes.status === 404) {
        result = {
          name: safeName,
          size: safeSize,
          type: 'file',
          status: 'unknown',
          malicious: 0,
          suspicious: 0,
          harmless: 0,
          undetected: 0,
          threats: [],
          totalEngines: 0,
          message: 'File not found in VirusTotal database. Upload it to virustotal.com for a full scan.',
        };
      } else {
        let hashData;
        try {
          hashData = JSON.parse(hashText);
        } catch {
          console.error('VT file response not JSON:', hashRes.status, hashText.substring(0, 200));
          throw new Error('VirusTotal API error');
        }
        if (!hashRes.ok) {
          console.error('VT file lookup failed:', hashRes.status, JSON.stringify(hashData));
          throw new Error('VirusTotal API error');
        }

        const stats = hashData.data?.attributes?.last_analysis_stats || {};
        const results = hashData.data?.attributes?.last_analysis_results || {};

        const threats: string[] = [];
        for (const [engine, detail] of Object.entries(results)) {
          const d = detail as any;
          if (d.category === 'malicious' || d.category === 'suspicious') {
            threats.push(`${engine}: ${d.result || d.category}`);
          }
        }

        const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
        result = {
          name: safeName,
          size: safeSize,
          type: 'file',
          status: malicious > 0 ? 'threat' : 'clean',
          malicious: stats.malicious || 0,
          suspicious: stats.suspicious || 0,
          harmless: stats.harmless || 0,
          undetected: stats.undetected || 0,
          threats: threats.slice(0, 5),
          totalEngines: Object.keys(results).length,
        };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Scan error:', error);
    return new Response(JSON.stringify({ error: 'Scan-Dienst vorübergehend nicht verfügbar.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
