import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratedQuestion {
  game_type: "trivia" | "guess_character";
  question: string;
  options: string[];
  correct_answer: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
  bible_reference: string;
  points: number;
  bible_story?: string;
  testament?: "old" | "new";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { game_type, count = 3, bible_story, testament } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Generating ${count} ${game_type} questions using AI...`);

    // Fetch existing questions to avoid duplicates
    const { data: existingQuestions } = await supabase
      .from("bible_games")
      .select("question, correct_answer")
      .eq("game_type", game_type)
      .limit(50);

    const existingQuestionsText = existingQuestions
      ?.map((q) => `- ${q.question} (Answer: ${q.correct_answer})`)
      .join("\n") || "None";

    let systemPrompt = "";
    
    // Build story context if provided
    let storyContext = "";
    if (bible_story) {
      storyContext = `\nFOCUS ON BIBLE STORY: Generate questions specifically about "${bible_story}".`;
    } else if (testament) {
      storyContext = `\nFOCUS ON TESTAMENT: Generate questions from the ${testament === 'old' ? 'Old' : 'New'} Testament.`;
    }
    
    if (game_type === "trivia") {
      systemPrompt = `You are a Bible trivia expert. Generate unique, engaging Bible trivia questions that test knowledge of the Holy Bible. 
         Each question should have exactly 4 answer options with one correct answer.
         ${bible_story ? `Focus on the story of "${bible_story}".` : testament ? `Include questions from the ${testament === 'old' ? 'Old' : 'New'} Testament.` : 'Include questions from both Old and New Testament.'}
         Vary difficulty levels: easy (basic facts), medium (requires familiarity), hard (deep knowledge).
         Always include the specific Bible verse reference where the answer can be found.
         Make questions educational and suitable for Christian fellowship groups.${storyContext}`;
    } else if (game_type === "guess_character") {
      systemPrompt = `You are a Bible character expert. Generate "Guess the Character" questions where players identify biblical figures from clues.
         Each question should have 3-4 clues that progressively reveal more about the character.
         Format clues as: "Clue 1: [first clue]\\nClue 2: [second clue]\\nClue 3: [third clue]"
         ${bible_story ? `Focus on characters from the story of "${bible_story}".` : testament ? `Include characters from the ${testament === 'old' ? 'Old' : 'New'} Testament.` : 'Include both major and minor biblical characters.'}
         Provide 4 character name options for the answer.
         Always include a Bible verse reference where this character appears.${storyContext}`;
    } else if (game_type === "fill_blank") {
      systemPrompt = `You are a Bible verse expert. Generate "Fill in the Blank" questions where players complete famous Bible verses.
         Format the question as: "Complete the verse: '[verse with _____ for missing word(s)]'"
         The blank should replace 1-3 meaningful words (not common words like 'the', 'and', 'a').
         The correct_answer should be the missing word(s) only.
         Provide 4 options including the correct answer and 3 plausible alternatives.
         ${bible_story ? `Use verses from the story of "${bible_story}".` : testament ? `Use verses from the ${testament === 'old' ? 'Old' : 'New'} Testament.` : 'Use well-known, impactful verses that Christians commonly memorize.'}
         Always include the specific Bible verse reference.
         The hint should help recall the verse without giving away the answer.${storyContext}`;
    } else if (game_type === "memory_verse") {
      systemPrompt = `You are a Bible memorization expert. Generate Memory Verse challenges for Scripture memorization.
         The question field should describe the verse topic/theme briefly (e.g., "God's love for the world" or "The Lord's guidance").
         The correct_answer field should contain the COMPLETE verse text that players will memorize and arrange.
         Keep verses to 15-30 words for manageable memorization.
         ${bible_story ? `Select verses from the story of "${bible_story}".` : testament ? `Select verses from the ${testament === 'old' ? 'Old' : 'New'} Testament.` : 'Select impactful, commonly memorized verses.'}
         Provide 4 options with similar verse themes (these are for display, the game uses word arrangement).
         Always include the specific Bible verse reference.
         The hint should describe the key message or theme of the verse.${storyContext}`;
    }

    const gameTypeLabels: Record<string, string> = {
      trivia: "Bible trivia",
      guess_character: "Guess the Character",
      fill_blank: "Fill in the Blank",
      memory_verse: "Memory Verse"
    };
    
    const userPrompt = `Generate ${count} unique ${gameTypeLabels[game_type] || game_type} questions.

EXISTING QUESTIONS TO AVOID (do not repeat these topics or characters):
${existingQuestionsText}

Return the response using the generate_questions function.`;

    let questionDescription = "The trivia question";
    if (game_type === "guess_character") {
      questionDescription = "The clues formatted as 'Clue 1: [text]\\nClue 2: [text]\\nClue 3: [text]'";
    } else if (game_type === "fill_blank") {
      questionDescription = "The verse with blank(s) as 'Complete the verse: [verse with _____ for missing word(s)]'";
    } else if (game_type === "memory_verse") {
      questionDescription = "A brief description of the verse topic/theme";
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_questions",
          description: `Generate ${count} Bible game questions`,
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { 
                      type: "string", 
                      description: questionDescription
                    },
                    options: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "Exactly 4 possible answers"
                    },
                    correct_answer: { 
                      type: "string",
                      description: "The correct answer (must be one of the options)"
                    },
                    hint: { 
                      type: "string",
                      description: "A helpful hint without giving away the answer"
                    },
                    difficulty: { 
                      type: "string", 
                      enum: ["easy", "medium", "hard"]
                    },
                    bible_reference: { 
                      type: "string",
                      description: "The specific Bible verse(s) reference"
                    },
                    points: { 
                      type: "number",
                      description: "Points awarded: 10 for easy, 20 for medium, 30 for hard"
                    }
                  },
                  required: ["question", "options", "correct_answer", "hint", "difficulty", "bible_reference", "points"],
                  additionalProperties: false
                }
              }
            },
            required: ["questions"],
            additionalProperties: false
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received:", JSON.stringify(aiResponse, null, 2));

    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "generate_questions") {
      console.error("No valid tool call in response");
      throw new Error("AI did not return questions in the expected format");
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    const questions: GeneratedQuestion[] = generatedData.questions;

    console.log(`Generated ${questions.length} questions`);

    // Save questions to database
    // Helper to sanitize text: remove CJK characters and control characters, trim whitespace
    const sanitizeText = (s: string | null | undefined) => {
      if (!s) return '';
      // Remove CJK (Han/Kana) scripts which sometimes get injected, and control chars
      let cleaned = s.replace(/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/gu, '');
      cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
      // Collapse multiple spaces and trim
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    };

    const questionsToInsert = questions.map((q) => {
      const options = (q.options || []).map((opt) => sanitizeText(opt));
      const correct = sanitizeText(q.correct_answer);
      // Ensure correct answer is one of the options after sanitization; if not, add it
      if (correct && !options.includes(correct)) {
        options[0] = correct; // prefer correct answer first to keep 4 options
      }

      return {
        game_type,
        question: sanitizeText(q.question),
        options,
        correct_answer: correct,
        hint: sanitizeText(q.hint),
        difficulty: q.difficulty,
        bible_reference: sanitizeText(q.bible_reference),
        points: q.points,
        is_active: true,
        bible_story: bible_story || null,
        testament: testament || null,
      };
    });

    const { data: insertedData, error: insertError } = await supabase
      .from("bible_games")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting questions:", insertError);
      throw new Error(`Failed to save questions: ${insertError.message}`);
    }

    console.log(`Successfully saved ${insertedData?.length || 0} questions to database`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: insertedData?.length || 0,
        questions: insertedData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating questions:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate questions" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
