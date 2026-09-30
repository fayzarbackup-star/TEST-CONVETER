export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const payload = body.payload;
      let model = body.model || 'gemini-3-flash-preview';

      // 1. Get the list of API keys from KV
      let apiKeysStr = await env.FAYZAR_OCR_KEYS.get('API_KEYS');
      let apiKeys = [];
      if (apiKeysStr) {
        try {
          apiKeys = JSON.parse(apiKeysStr);
        } catch (e) {
          apiKeys = [];
        }
      }

      if (!apiKeys || apiKeys.length === 0) {
        return new Response(JSON.stringify({ error: "No API keys configured in KV" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Get the list of exhausted keys from KV
      let exhaustedKeysStr = await env.FAYZAR_OCR_KEYS.get('EXHAUSTED_KEYS');
      let exhaustedKeys = {};
      if (exhaustedKeysStr) {
        try {
          exhaustedKeys = JSON.parse(exhaustedKeysStr);
        } catch (e) {
          exhaustedKeys = {};
        }
      }

      // Cleanup expired exhausted keys (24 hours cooldown)
      const now = Date.now();
      const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
      let keysChanged = false;
      for (const k in exhaustedKeys) {
        if (now - exhaustedKeys[k] > cooldownMs) {
          delete exhaustedKeys[k];
          keysChanged = true;
        }
      }

      let attemptCount = 0;
      let lastGeminiResponse = null;

      // Internal retry loop
      for (let i = 0; i < apiKeys.length; i++) {
        const currentKey = apiKeys[i];
        if (exhaustedKeys[currentKey]) continue;

        attemptCount++;
        // alt=sse বাধ্যতামূলক: এছাড়া Gemini JSON-array স্ট্রিম দেয়, কিন্তু ক্লায়েন্ট `data:` SSE লাইন পার্স করে
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${currentKey}`;
        
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (geminiResponse.status === 429) {
          // Mark this key as exhausted and retry next
          exhaustedKeys[currentKey] = Date.now();
          keysChanged = true;
          lastGeminiResponse = geminiResponse;
          continue;
        }

        if (!geminiResponse.ok) {
          // For other errors (400, 500), we return immediately or maybe retry depending on logic.
          // Usually a 400 is a bad request (e.g. payload too large), so no point in retrying.
          const errorText = await geminiResponse.text();
          return new Response(JSON.stringify({ error: `Gemini API Error: ${geminiResponse.status}`, details: errorText, keyId: `Key-${i+1}` }), {
            status: geminiResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Success! Save KV if changed and return stream
        if (keysChanged) {
          await env.FAYZAR_OCR_KEYS.put('EXHAUSTED_KEYS', JSON.stringify(exhaustedKeys));
        }

        return new Response(geminiResponse.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': geminiResponse.headers.get('Content-Type') || 'text/event-stream'
          }
        });
      }

      // If we exit the loop, all keys are exhausted or failed with 429
      if (keysChanged) {
        await env.FAYZAR_OCR_KEYS.put('EXHAUSTED_KEYS', JSON.stringify(exhaustedKeys));
      }

      return new Response(JSON.stringify({ error: "All keys exhausted or rate limited.", attempts: attemptCount }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
};

