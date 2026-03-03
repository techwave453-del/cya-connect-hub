import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const STORY_GENERATION_PROMPT = `You are a compelling Bible story narrator. Your task is to:

1. Start with a line labeled "[TITLE]:" followed by a short, clear biblical story title (e.g. "David and Goliath", "The Burning Bush", "Jonah and the Whale"). This should be the name of the Bible story, NOT a sentence.
2. Then write the complete Bible story in full narrative format (4-6 rich paragraphs)
3. Write it in an engaging, accessible way
4. Include character development, dialogue, and vivid details
5. Weave in 3-4 relevant scripture references naturally
6. IMPORTANT: End with a section labeled "[VISUAL_DESCRIPTION]:" followed by 2-3 sentences describing key visual scenes perfect for AI image generation.

Example [TITLE]: The Widow's Oil
Example [VISUAL_DESCRIPTION]: "A young shepherd boy stands on a hillside at sunset, with golden light behind him."

Generate a compelling, lesser-known Bible story now. Ensure the title is a proper biblical story name and the visual description is vivid.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Starting daily story generation...");

    // Check if a story already exists for today (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    const { data: existingStories } = await supabase
      .from('posts')
      .select('id')
      .eq('hashtag', '#DailyBibleStory')
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', tomorrowStart.toISOString())
      .limit(1);

    if (existingStories && existingStories.length > 0) {
      console.log("Story already exists for today:", existingStories[0].id);
      return new Response(
        JSON.stringify({ success: true, postId: existingStories[0].id, alreadyExists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Generate story text
    console.log("Generating Bible story...");
    const storyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: STORY_GENERATION_PROMPT }],
        temperature: 1,
      }),
    });

    if (!storyResponse.ok) {
      const errorText = await storyResponse.text();
      console.error("Story generation error:", storyResponse.status, errorText);
      throw new Error(`Story generation failed: ${storyResponse.status}`);
    }

    const storyData = await storyResponse.json();
    const fullStory = storyData.choices[0].message.content;
    console.log("Story generated, length:", fullStory.length);

    // Step 2: Extract title, visual description and story text
    const titleMatch = fullStory.match(/\[TITLE\]:\s*(.+)/);
    const storyTitle = titleMatch ? titleMatch[1].trim() : "Daily Bible Story";

    const visualMatch = fullStory.match(/\[VISUAL_DESCRIPTION\]:\s*([\s\S]*?)$/);
    const visualDescription = visualMatch ? visualMatch[1].trim() : "";

    let storyText = fullStory;
    if (titleMatch) {
      storyText = storyText.replace(/\[TITLE\]:\s*.+\n?/, '').trim();
    }
    if (visualMatch) {
      storyText = storyText.substring(0, storyText.indexOf('[VISUAL_DESCRIPTION]')).trim();
    }

    console.log("Story title:", storyTitle);

    // Step 3: Generate image using Lovable AI (with modalities for image output)
    let storedImageUrl: string | null = null;

    if (visualDescription) {
      try {
        console.log("Generating image with Lovable AI...");
        const imagePrompt = `Generate a beautiful biblical illustration painting: ${visualDescription} Style: warm lighting, spiritual and reverent atmosphere, classical painting style, 16:9 aspect ratio`;

        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!imageResponse.ok) {
          console.error("Image generation error:", imageResponse.status, await imageResponse.text());
        } else {
          const imageData = await imageResponse.json();
          const images = imageData.choices?.[0]?.message?.images;

          if (images && images.length > 0) {
            const base64Data = images[0]?.image_url?.url;
            if (base64Data && base64Data.startsWith('data:image')) {
              // Extract base64 content and upload to storage
              const base64Content = base64Data.split(',')[1];
              const binaryData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
              
              const timestamp = new Date().getTime();
              const fileName = `daily-story-${timestamp}.png`;

              const { error: uploadError } = await supabase.storage
                .from("post-images")
                .upload(fileName, binaryData, {
                  contentType: "image/png",
                  upsert: false,
                });

              if (uploadError) {
                console.error("Storage upload error:", uploadError);
              } else {
                const { data: publicUrlData } = supabase.storage
                  .from("post-images")
                  .getPublicUrl(fileName);
                storedImageUrl = publicUrlData.publicUrl;
                console.log("Image uploaded successfully:", storedImageUrl);
              }
            }
          } else {
            console.log("No images in response");
          }
        }
      } catch (error) {
        console.error("Image generation error:", error);
      }
    }

    // Step 4: Create post in database
    console.log("Creating post in database...");
    const systemUserId = "00000000-0000-0000-0000-000000000000";
    const systemUsername = "Scripture Guide";

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: systemUserId,
        username: systemUsername,
        hashtag: "#DailyBibleStory",
        title: storyTitle,
        description: storyText,
        image_url: storedImageUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError) {
      console.error("Post creation error:", postError);
      throw postError;
    }

    console.log("Post created successfully:", post.id);

    return new Response(
      JSON.stringify({
        success: true,
        postId: post.id,
        imageGenerated: !!storedImageUrl,
        title: storyTitle,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-daily-story:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
