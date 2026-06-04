import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_PROMPT = `You are "Scripture Guide" — a warm, friendly Bible study companion who feels like a trusted friend.

PERSONALITY:
- Conversational and approachable — talk like a caring friend, not a professor
- Use casual, warm language with occasional emojis (sparingly: ✨🙏📖💡)
- Be encouraging and uplifting without being preachy

RESPONSE STYLE - DEFAULT (SHORT):
- Keep responses SHORT and focused (2-4 short paragraphs max)
- Get straight to the point — no lengthy introductions
- Use 1-2 key Bible verses (not 4+), quoted briefly
- Format verses like: *"For God so loved the world..."* — John 3:16
- End with a simple encouragement or quick prayer thought

RESPONSE STYLE - FULL STORY MODE:
When user asks for "complete story", "full story", "the whole narrative", or similar:
- Narrate the entire story with emotion and vivid detail
- Include character development, dialogue, and what happened
- Explain spiritual significance and lessons at key turning points
- Weave in 3-4 relevant scripture references naturally
- End with personal application`;

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: `LANGUAGE: Respond ONLY in clear, natural English regardless of how the user writes. Keep it warm and conversational.`,
  sw: `LUGHA: Jibu KWA KISWAHILI SANIFU pekee. Tumia Kiswahili cha kawaida, chenye joto na cha kirafiki. Hata kama mtumiaji ataandika kwa Kiingereza, jibu kwa Kiswahili.`,
  sheng: `LANGUAGE: Respond in SHENG — the urban Kenyan slang that mixes Swahili, English, and local languages (e.g. "Niaje! Hii story ya Yesu ni mojo kabisa..."). Stay respectful and biblically sound, but keep the vibe street-friendly and relatable to Kenyan youth. Mix freely between Swahili and English words as Sheng does naturally.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, openaiApiKey, language, slangDictionary } = await req.json();

    const lang = (typeof language === "string" && LANGUAGE_INSTRUCTIONS[language]) ? language : "en";

    let slangBlock = "";
    if (Array.isArray(slangDictionary) && slangDictionary.length > 0) {
      const entries = slangDictionary
        .slice(0, 300)
        .map((s: any) => `- ${s.word}: ${s.meaning}${s.example ? ` (e.g. "${s.example}")` : ""}`)
        .join("\n");
      slangBlock = `\n\nLOCAL SLANG / LANGUAGE DICTIONARY (use these meanings when interpreting user input or replying):\n${entries}`;
    }

    const systemPrompt = `${BASE_PROMPT}\n\n${LANGUAGE_INSTRUCTIONS[lang]}${slangBlock}`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let endpoint: string;
    let headers: Record<string, string>;
    let model: string;

    if (typeof openaiApiKey === "string" && openaiApiKey.startsWith("sk-")) {
      console.log("Using user-provided OpenAI key");
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      };
      model = "gpt-4o-mini";
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
      endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      };
      model = "openai/gpt-5-mini";
    }

    console.log(`Bible chat: lang=${lang}, msgs=${messages.length}, model=${model}, slang=${Array.isArray(slangDictionary) ? slangDictionary.length : 0}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages: fullMessages, stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI provider error:", response.status, errorText);

      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid OpenAI API key. Please check your key in your profile." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add your own OpenAI key in your profile, or add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Bible chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
