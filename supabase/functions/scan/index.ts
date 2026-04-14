import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHA256_RE = /^[a-f0-9]{64}$/i;
const URL_RE = /^https?:\/\/.+/i;

async function getUrlId(url: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  // VT URL identifier = base64url of the URL (without padding)
  return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function checkExistingReport(apiKey: string, url: string) {
  const urlId = await getUrlId(url);
  const res = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
    headers: { 'x-apikey': apiKey },
  });
  if (res.status === 404) return null;
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function submitAndPollUrl(apiKey: string, url: string) {
  // Submit URL for scanning
  const submitRes = await fetch('https://www.virustotal.com/api/v3/urls', {
    method: 'POST',
    headers: {
      'x-apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `url=${encodeURIComponent(url)}`,
  });

  const submitText = await submitRes.text();
  let submitData;
  try {
    submitData = JSON.parse(submitText);
  } catch {
    throw new Error('VirusTotal API error');
  }
  if (!submitRes.ok) throw new Error('VirusTotal API error');

  const analysisId = submitData.data?.id;
  if (!analysisId) throw new Error('No analysis ID');

  // Poll up to 5 times (total ~15s wait)
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const analysisRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { 'x-apikey': apiKey },
    });
    const analysisText = await analysisRes.text();
    let analysisData;
    try {
      analysisData = JSON.parse(analysisText);
    } catch {
      continue;
    }
    const status = analysisData.data?.attributes?.status;
    if (status === 'completed') return analysisData;
  }
  // Return last attempt even if not completed
  const lastRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
    headers: { 'x-apikey': apiKey },
  });
  return JSON.parse(await lastRes.text());
}

function extractThreats(results: Record<string, any>): { threats: string[]; malicious: number; suspicious: number; phishing: number; harmless: number; undetected: number } {
  const threats: string[] = [];
  let malicious = 0, suspicious = 0, phishing = 0, harmless = 0, undetected = 0;

  for (const [engine, detail] of Object.entries(results)) {
    const d = detail as any;
    const cat = d.category?.toLowerCase() || '';
    const result = (d.result || '').toLowerCase();

    if (cat === 'malicious' || cat === 'suspicious' || cat === 'phishing' ||
        result.includes('phishing') || result.includes('malware') || result.includes('malicious') ||
        result.includes('spam') || result.includes('suspicious')) {
      threats.push(`${engine}: ${d.result || d.category}`);
      if (cat === 'phishing' || result.includes('phishing')) {
        phishing++;
        malicious++;
      } else if (cat === 'malicious') {
        malicious++;
      } else {
        suspicious++;
      }
    } else if (cat === 'harmless' || cat === 'clean') {
      harmless++;
    } else {
      undetected++;
    }
  }

  return { threats, malicious, suspicious, phishing, harmless, undetected };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY');
  if (!VIRUSTOTAL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Scan-Dienst vorübergehend nicht verfügbar.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { type, url, fileHash, fileName, fileSize } = await req.json();

    if (type !== 'url' && type !== 'file') {
      return new Response(JSON.stringify({ error: 'Ungültiger Scan-Typ.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    if (type === 'url') {
      if (!url || typeof url !== 'string' || !URL_RE.test(url) || url.length > 2048) {
        return new Response(JSON.stringify({ error: 'Ungültige URL.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 1: Check existing VT report first (catches known phishing/malware)
      const existing = await checkExistingReport(VIRUSTOTAL_API_KEY, url);
      let stats: any = {};
      let results: Record<string, any> = {};
      let categories: Record<string, string> = {};
      let reputation = 0;

      if (existing?.data?.attributes) {
        const attrs = existing.data.attributes;
        stats = attrs.last_analysis_stats || {};
        results = attrs.last_analysis_results || {};
        categories = attrs.categories || {};
        reputation = attrs.reputation || 0;
      }

      // Step 2: Also submit fresh scan and poll for completion
      const freshAnalysis = await submitAndPollUrl(VIRUSTOTAL_API_KEY, url);
      const freshStats = freshAnalysis?.data?.attributes?.stats || {};
      const freshResults = freshAnalysis?.data?.attributes?.results || {};

      // Merge: use whichever has more detections
      const existingDetections = (stats.malicious || 0) + (stats.suspicious || 0);
      const freshDetections = (freshStats.malicious || 0) + (freshStats.suspicious || 0);

      const useResults = freshDetections >= existingDetections ? freshResults : results;

      // Check categories for phishing indicators
      let categoryPhishing = false;
      for (const [, cat] of Object.entries(categories)) {
        const c = (cat as string).toLowerCase();
        if (c.includes('phishing') || c.includes('malware') || c.includes('malicious') || c.includes('spam')) {
          categoryPhishing = true;
          break;
        }
      }

      const extracted = extractThreats(useResults);

      // Also consider bad reputation as threat
      const isThreat = extracted.malicious > 0 || extracted.suspicious > 0 || categoryPhishing || reputation < -5;

      if (categoryPhishing && extracted.threats.length === 0) {
        extracted.threats.push('Category: Phishing/Malicious');
        extracted.malicious++;
      }

      result = {
        name: url,
        size: '-',
        type: 'url',
        status: isThreat ? 'threat' : 'clean',
        malicious: extracted.malicious,
        suspicious: extracted.suspicious,
        harmless: extracted.harmless,
        undetected: extracted.undetected,
        threats: extracted.threats.slice(0, 10),
        totalEngines: Object.keys(useResults).length,
      };
    } else if (type === 'file') {
      if (!fileHash || typeof fileHash !== 'string' || !SHA256_RE.test(fileHash)) {
        return new Response(JSON.stringify({ error: 'Ungültiger Datei-Hash.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const safeName = typeof fileName === 'string' ? fileName.slice(0, 255) : fileHash;
      const safeSize = typeof fileSize === 'string' ? fileSize.slice(0, 50) : '-';

      const hashRes = await fetch(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
        headers: { 'x-apikey': VIRUSTOTAL_API_KEY },
      });
      const hashText = await hashRes.text();

      if (hashRes.status === 404) {
        result = {
          name: safeName, size: safeSize, type: 'file', status: 'unknown',
          malicious: 0, suspicious: 0, harmless: 0, undetected: 0,
          threats: [], totalEngines: 0,
          message: 'File not found in VirusTotal database. Upload it to virustotal.com for a full scan.',
        };
      } else {
        let hashData;
        try { hashData = JSON.parse(hashText); } catch { throw new Error('VirusTotal API error'); }
        if (!hashRes.ok) throw new Error('VirusTotal API error');

        const fileResults = hashData.data?.attributes?.last_analysis_results || {};
        const extracted = extractThreats(fileResults);

        result = {
          name: safeName, size: safeSize, type: 'file',
          status: (extracted.malicious + extracted.suspicious) > 0 ? 'threat' : 'clean',
          malicious: extracted.malicious,
          suspicious: extracted.suspicious,
          harmless: extracted.harmless,
          undetected: extracted.undetected,
          threats: extracted.threats.slice(0, 10),
          totalEngines: Object.keys(fileResults).length,
        };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Scan error:', error);
    return new Response(JSON.stringify({ error: 'Scan-Dienst vorübergehend nicht verfügbar.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
