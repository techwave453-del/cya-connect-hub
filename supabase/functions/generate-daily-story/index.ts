import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt to generate full Bible stories with image-friendly descriptions
const STORY_GENERATION_PROMPT = `You are a compelling Bible story narrator. Your task is to:

1. Generate a random, complete Bible story in full narrative format
2. Write it in an engaging, accessible way (4-6 rich paragraphs)
3. Include character development, dialogue, and vivid details
4. Weave in 3-4 relevant scripture references naturally
5. IMPORTANT: End with a section labeled "[VISUAL_DESCRIPTION]:" followed by 2-3 sentences describing key visual scenes perfect for AI image generation. Be specific about settings, actions, emotions, lighting, and mystical elements.

Example [VISUAL_DESCRIPTION]: "A young shepherd boy stands on a hillside at sunset, with golden light behind him. He holds a simple stone in one hand, eyes focused with determination. Far below, a massive armored giant looms against the horizon, sunlight glinting off his bronze armor."

Generate a compelling, lesser-known Bible story now. Ensure the visual description is vivid and ready for image generation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    if (!replicateApiToken) {
      console.warn("REPLICATE_API_TOKEN not configured - will create post without image");
    }

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting daily story generation...");

    // Step 1: Generate story using bible-chat API
    console.log("Generating Bible story...");
    const storyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: STORY_GENERATION_PROMPT,
          },
        ],
        temperature: 1, // Allow more creativity for story generation
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

    // Step 2: Extract visual description and story text
    const visualMatch = fullStory.match(/\[VISUAL_DESCRIPTION\]:\s*([\s\S]*?)$/);
    const visualDescription = visualMatch ? visualMatch[1].trim() : "";
    const storyText = visualMatch ? fullStory.substring(0, visualMatch.index).trim() : fullStory;

    if (!visualDescription) {
      console.warn("No visual description found, will use default");
    }

    console.log("Visual description:", visualDescription.substring(0, 100) + "...");

    // Step 3: Generate image using Replicate API
    let imageUrl: string | null = null;

    if (replicateApiToken) {
      try {
        console.log("Generating image with Replicate...");

        const imagePrompt = `A beautiful, biblical illustration. ${visualDescription} Style: painting, warm lighting, spiritual and reverent atmosphere, high quality, 16:9 aspect ratio`;

        // Use Replicate API to generate image
        const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Token ${replicateApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "aa9f2b34fe55373d547af6c1a9edd4f15d9152c2b1af74a1173cc14f17e903af", // Flux Pro
            input: {
              prompt: imagePrompt,
              aspect_ratio: "16:9",
              output_format: "jpeg",
              num_inference_steps: 25,
            },
          }),
        });

        if (!replicateResponse.ok) {
          const error = await replicateResponse.text();
          console.error("Replicate error:", replicateResponse.status, error);
        } else {
          const prediction = await replicateResponse.json();
          console.log("Prediction ID:", prediction.id);

          // Poll for completion (Replicate predictions are async)
          let attempts = 0;
          const maxAttempts = 60; // 5 minutes with 5-second intervals
          let completed = false;

          while (attempts < maxAttempts && !completed) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
            attempts++;

            const statusResponse = await fetch(
              `https://api.replicate.com/v1/predictions/${prediction.id}`,
              {
                headers: {
                  Authorization: `Token ${replicateApiToken}`,
                },
              }
            );

            const statusData = await statusResponse.json();
            console.log(`Poll attempt ${attempts}: status = ${statusData.status}`);

            if (statusData.status === "succeeded") {
              imageUrl = statusData.output?.[0];
              completed = true;
              console.log("Image generated:", imageUrl?.substring(0, 50) + "...");
            } else if (statusData.status === "failed") {
              console.error("Image generation failed:", statusData.error);
              break;
            }
          }

          if (!completed) {
            console.warn("Image generation timed out");
          }
        }
      } catch (error) {
        console.error("Image generation error:", error);
        // Continue anyway - we'll create post without image
      }
    }

    // Step 4: Upload image to Supabase Storage if generated
    let storedImageUrl: string | null = null;

    if (imageUrl) {
      try {
        console.log("Downloading and uploading image to Supabase Storage...");

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error("Failed to fetch generated image");

        const imageBuffer = await imageResponse.arrayBuffer();
        const timestamp = new Date().getTime();
        const fileName = `daily-story-${timestamp}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageBuffer, {
            contentType: "image/jpeg",
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
      } catch (error) {
        console.error("Error handling generated image:", error);
      }
    }

    // Step 5: Extract story title (first line or first sentence)
    const titleMatch = storyText.match(/^[^.!?]+[.!?]/);
    const storyTitle = titleMatch
      ? titleMatch[0].substring(0, 100) // Limit to 100 chars
      : "Daily Bible Story";

    // Step 6: Create post in database
    console.log("Creating post in database...");

    // Use system UUID (00000000...) for automated posts, bypasses need for admin user
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
        imageGenerated: !!imageUrl,
        imagePath: !!storedImageUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
