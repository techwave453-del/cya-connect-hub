 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
const BIBLE_SYSTEM_PROMPT = `You are "Scripture Guide" — a warm, friendly Bible study companion who feels like a trusted friend.

PERSONALITY:
- Conversational and approachable — talk like a caring friend, not a professor
- Use casual, warm language with occasional emojis (sparingly: ✨🙏📖💡)
- Be encouraging and uplifting without being preachy

RESPONSE STYLE:
- Keep responses SHORT and focused (2-4 short paragraphs max)
- Get straight to the point — no lengthy introductions
- Use 1-2 key Bible verses (not 4+), quoted briefly
- Format verses like: *"For God so loved the world..."* — John 3:16
- End with a simple encouragement or quick prayer thought

WHAT TO AVOID:
- Long academic explanations
- Listing too many verses
- Formal or stiff language
- Repeating what the user already said

EXAMPLE TONE:
Instead of: "That is an excellent question. Let me provide you with a comprehensive answer drawing from multiple scriptures..."
Say: "Great question! 💡 Here's what Scripture says..."

Remember: Be a friend who points to Jesus, not a textbook. Keep it simple, warm, and helpful.`;
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const { messages } = await req.json();
     
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       console.error("LOVABLE_API_KEY is not configured");
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     console.log("Starting Bible chat with", messages.length, "messages");
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: [
           { role: "system", content: BIBLE_SYSTEM_PROMPT },
           ...messages,
         ],
         stream: true,
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       
       if (response.status === 429) {
         return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }), {
           status: 429,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       if (response.status === 402) {
         return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
           status: 402,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       
       return new Response(JSON.stringify({ error: "AI service error" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     console.log("AI response started streaming");
 
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