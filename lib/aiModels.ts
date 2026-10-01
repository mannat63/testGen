/**
 * Centralized Groq model configuration.
 *
 * The previous model `llama-3.1-8b-instant` was decommissioned by Groq and now
 * returns 404 `model_not_found`, which broke both /api/generate (every slot fell
 * back to placeholder text) and /api/regenerate (hard 500). These are current,
 * verified-working models on the account.
 *
 * Tiering: question GENERATION is the quality-critical path; regeneration,
 * answer-key extraction and validation are lightweight. Both currently use the
 * same clean, fast model (qwen3.8-27b). To route generation to a stronger model
 * later (e.g. Gemini, once GEMINI_API_KEY is configured), change only
 * GROQ_GENERATION_MODEL / add a provider here — callers read these constants.
 *
 * qwen/qwen3.8-27b is preferred over openai/gpt-oss-* because the gpt-oss models
 * emit a hidden reasoning channel that inflates token usage against the free-tier
 * TPM limit and returns empty content unless given extra max_tokens headroom.
 */

export const GROQ_GENERATION_MODEL = 'qwen/qwen3.8-27b';
export const GROQ_LIGHTWEIGHT_MODEL = 'qwen/qwen3.8-27b';

// A known-good fallback model to try if the primary returns model_not_found,
// so a future Groq decommission degrades gracefully instead of failing hard.
export const GROQ_FALLBACK_MODEL = 'openai/gpt-oss-20b';
