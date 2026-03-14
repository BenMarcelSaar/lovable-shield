import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY');
  if (!VIRUSTOTAL_API_KEY) {
    return new Response(JSON.stringify({ error: 'VIRUSTOTAL_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { type, url, fileHash, fileName, fileSize } = await req.json();

    let result;

    if (type === 'url') {
      // Submit URL for scanning
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
        throw new Error(`VirusTotal returned non-JSON response (${submitRes.status}). API key may be invalid.`);
      }
      if (!submitRes.ok) {
        throw new Error(`VT URL submit failed [${submitRes.status}]: ${JSON.stringify(submitData)}`);
      }

      // Wait a moment then get results
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
        throw new Error(`VirusTotal analysis returned non-JSON response (${analysisRes.status}).`);
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
      // Look up file hash
      const hashRes = await fetch(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
        headers: { 'x-apikey': VIRUSTOTAL_API_KEY },
      });

      const hashText = await hashRes.text();

      if (hashRes.status === 404) {
        result = {
          name: fileName || fileHash,
          size: fileSize || '-',
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
          throw new Error(`VirusTotal file lookup returned non-JSON response (${hashRes.status}).`);
        }
        if (!hashRes.ok) {
          throw new Error(`VT file lookup failed [${hashRes.status}]: ${JSON.stringify(hashData)}`);
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
          name: fileName || hashData.data?.attributes?.meaningful_name || fileHash,
          size: fileSize || '-',
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
    } else {
      throw new Error('Invalid scan type. Use "url" or "file".');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Scan error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
