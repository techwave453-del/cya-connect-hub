/**
 * Local AI — Transformers.js wrapper for offline Bible Q&A
 * Uses Qwen2.5-0.5B-Instruct (quantized) for text generation
 */

let generator: any = null;
let tokenizer: any = null;
let isLoadingModel = false;
let loadError: string | null = null;
let loadProgress = 0;

export const getModelStatus = () => ({
  isLoaded: !!generator,
  isLoading: isLoadingModel,
  error: loadError,
  progress: loadProgress,
});

const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';

/**
 * Load the Transformers.js model (lazy — only when user opts in)
 * Downloads ~400MB (quantized) on first use, then cached by browser.
 */
export const loadModel = async (
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> => {
  if (generator) return true;
  if (isLoadingModel) return false;

  isLoadingModel = true;
  loadError = null;
  loadProgress = 0;

  try {
    onProgress?.(5, 'Loading AI engine...');

    const { pipeline, AutoTokenizer } = await import('@huggingface/transformers');

    onProgress?.(10, 'Downloading AI model (~400MB first time)...');

    // Load tokenizer and model in parallel
    const [tok, gen] = await Promise.all([
      AutoTokenizer.from_pretrained(MODEL_ID, {
        progress_callback: (data: any) => {
          if (data.status === 'progress' && data.progress) {
            const p = Math.round(10 + data.progress * 0.3);
            loadProgress = p;
            onProgress?.(p, `Downloading tokenizer: ${Math.round(data.progress)}%`);
          }
        },
      }),
      pipeline('text-generation', MODEL_ID, {
        dtype: 'q4f16',
        device: 'wasm',
        progress_callback: (data: any) => {
          if (data.status === 'progress' && data.progress) {
            const p = Math.round(40 + data.progress * 0.55);
            loadProgress = p;
            onProgress?.(p, `Downloading model: ${Math.round(data.progress)}%`);
          }
        },
      }),
    ]);

    tokenizer = tok;
    generator = gen;
    loadProgress = 100;
    onProgress?.(100, 'AI model ready!');
    console.log('[localAI] Qwen2.5-0.5B-Instruct loaded successfully');
    return true;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load AI model';
    console.error('[localAI] Model load error:', err);
    onProgress?.(0, `Error: ${loadError}`);
    return false;
  } finally {
    isLoadingModel = false;
  }
};

const SYSTEM_PROMPT = `You are Scripture Guide, a caring and knowledgeable Bible assistant. You help users understand the Bible, explore scripture, and apply biblical teachings to daily life.

Rules:
- Give concise, clear answers (2-4 paragraphs max)
- Always reference specific Bible verses when relevant
- Be warm, encouraging, and spiritually uplifting
- If given Bible verse context, use it to ground your answer
- You understand English, Swahili, and Sheng (Kenyan slang)
- Respond in the same language style the user uses`;

/**
 * Generate a response using the local model.
 */
export const generateLocalResponse = async (
  prompt: string,
  context?: string
): Promise<string | null> => {
  if (!generator || !tokenizer) return null;

  try {
    const userContent = context
      ? `Bible verses for reference:\n${context.slice(0, 800)}\n\nQuestion: ${prompt}`
      : prompt;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];

    const result = await generator(messages, {
      max_new_tokens: 300,
      temperature: 0.7,
      do_sample: true,
      top_p: 0.9,
      return_full_text: false,
    });

    const text = result?.[0]?.generated_text?.trim();
    
    // For chat models, the result may be the last message object
    if (typeof text === 'object' && text?.content) {
      return text.content.trim() || null;
    }
    
    // If it's an array of messages, get the last assistant message
    if (Array.isArray(result?.[0]?.generated_text)) {
      const lastMsg = result[0].generated_text[result[0].generated_text.length - 1];
      if (lastMsg?.role === 'assistant') return lastMsg.content?.trim() || null;
    }

    return typeof text === 'string' ? text : null;
  } catch (err) {
    console.error('[localAI] Generation error:', err);
    return null;
  }
};

/**
 * Check if the model is available (cached in browser)
 */
export const isModelCached = (): boolean => {
  return !!generator;
};

/**
 * Unload model to free memory
 */
export const unloadModel = () => {
  generator = null;
  tokenizer = null;
  loadProgress = 0;
  console.log('[localAI] Model unloaded');
};
