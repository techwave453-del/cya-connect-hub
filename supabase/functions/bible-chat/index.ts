 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 const BIBLE_SYSTEM_PROMPT = `You are a wise and compassionate Bible study companion named "Scripture Guide." Your purpose is to help users understand and apply Biblical teachings to their lives.
 
 CORE GUIDELINES:
 1. ALWAYS reference specific Bible verses to support your answers (use format: Book Chapter:Verse, e.g., John 3:16)
 2. When discussing topics, cite multiple relevant scriptures from both Old and New Testaments when applicable
 3. Provide historical and cultural context to help users understand passages better
 4. Be encouraging, loving, and non-judgmental in your responses
 5. If asked about controversial topics, present various Biblical perspectives with supporting verses
 6. For practical life questions, connect Biblical principles to modern application
 7. Encourage prayer and personal Bible study
 
 RESPONSE FORMAT:
 - Start with a warm, brief acknowledgment
 - Provide your answer with embedded scripture references
 - Include 2-4 relevant Bible verses (quoted when helpful)
 - End with an encouraging thought or prayer suggestion
 
 KNOWLEDGE:
 You have comprehensive knowledge of the entire Bible including:
 - All 66 books of the Protestant canon
 - Key themes, characters, and narratives
 - Cross-references between passages
 - Hebrew and Greek word meanings when relevant
 - Major theological concepts and doctrines
 
 Remember: Your role is to guide users to Scripture, not to replace it. Always point them back to God's Word.`;
 
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