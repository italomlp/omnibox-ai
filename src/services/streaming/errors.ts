/**
 * Thrown when a fetch to the local Ollama daemon fails — almost always a
 * CORS misconfiguration or the daemon not running.
 */
export class OllamaCORSException extends Error {
  constructor(
    message = 'Ollama connection failed. Please ensure Ollama is running and OLLAMA_ORIGINS="*" is configured.'
  ) {
    super(message)
    this.name = 'OllamaCORSException'
  }
}

/**
 * Thrown when a direct browser request to Anthropic's API is blocked by
 * CORS.  Users should route through OpenRouter or a local proxy instead.
 */
export class AnthropicCORSException extends Error {
  constructor(
    message = 'Direct browser requests to Anthropic are blocked by CORS. Please route via OpenRouter, or set up a custom local CORS proxy URL in Settings.'
  ) {
    super(message)
    this.name = 'AnthropicCORSException'
  }
}
