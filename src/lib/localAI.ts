/**
 * Local AI — Transformers.js wrapper for offline Bible Q&A
 * Uses Xenova/flan-t5-small for text generation (lazy loaded)
 */

type Pipeline = any;

let pipeline: Pipeline | null = null;
let generator: any = null;
let isLoadingModel = false;
let loadError: string | null = null;
let loadProgress = 0;

export const getModelStatus = () => ({
  isLoaded: !!generator,
  isLoading: isLoadingModel,
  error: loadError,
  progress: loadProgress,
});

/**
 * Load the Transformers.js model (lazy — only when user opts in)
 * Downloads ~250MB on first use, then cached by browser.
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

    // Dynamic import to avoid bundling Transformers.js unless needed
    const { pipeline: createPipeline } = await import('@huggingface/transformers');

    onProgress?.(15, 'Downloading AI model (~250MB first time)...');

    generator = await createPipeline('text2text-generation', 'Xenova/flan-t5-small', {
      progress_callback: (data: any) => {
        if (data.status === 'progress' && data.progress) {
          loadProgress = Math.round(15 + data.progress * 0.8);
          onProgress?.(loadProgress, `Downloading model: ${Math.round(data.progress)}%`);
        }
      },
    });

    loadProgress = 100;
    onProgress?.(100, 'AI model ready!');
    console.log('[localAI] Model loaded successfully');
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

/**
 * Generate a response using the local model.
 * Best for simple Q&A, summaries, and paraphrasing.
 */
export const generateLocalResponse = async (
  prompt: string,
  context?: string
): Promise<string | null> => {
  if (!generator) return null;

  try {
    // Construct a focused prompt for the small model
    let fullPrompt = '';
    if (context) {
      fullPrompt = `Based on these Bible verses: ${context.slice(0, 500)}\n\nAnswer this question: ${prompt}`;
    } else {
      fullPrompt = `Answer this Bible question briefly: ${prompt}`;
    }

    const result = await generator(fullPrompt, {
      max_new_tokens: 200,
      temperature: 0.7,
      do_sample: true,
    });

    const text = result?.[0]?.generated_text?.trim();
    return text || null;
  } catch (err) {
    console.error('[localAI] Generation error:', err);
    return null;
  }
};

/**
 * Check if the model is available (cached in browser)
 */
export const isModelCached = (): boolean => {
  // Check if the model files exist in the browser cache
  // This is a heuristic — Transformers.js caches in Cache Storage
  return !!generator;
};

/**
 * Unload model to free memory
 */
export const unloadModel = () => {
  generator = null;
  pipeline = null;
  loadProgress = 0;
  console.log('[localAI] Model unloaded');
};
