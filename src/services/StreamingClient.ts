import type { ProviderId, ProviderConfig } from '../store/store'

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class OllamaCORSException extends Error {
  constructor(message = 'Ollama connection failed. Please ensure Ollama is running and OLLAMA_ORIGINS="*" is configured.') {
    super(message)
    this.name = 'OllamaCORSException'
  }
}

export class AnthropicCORSException extends Error {
  constructor(message = 'Direct browser requests to Anthropic are blocked by CORS. Please route via OpenRouter, or set up a custom local CORS proxy URL in Settings.') {
    super(message)
    this.name = 'AnthropicCORSException'
  }
}

export class StreamingClient {
  static async stream(
    provider: ProviderId,
    config: ProviderConfig,
    request: LLMRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const { apiKey, baseUrl, selectedModel } = config
    const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048 } = request

    try {
      if (provider === 'webgpu') {
        throw new Error('WebGPU mode should be handled by the useWebLLM hook directly.')
      }

      let url = ''
      let headers: HeadersInit = {}
      let body: any = {}

      if (provider === 'openai' || provider === 'openrouter' || provider === 'ollama') {
        // OpenAI compatibility router
        const resolvedBaseUrl = baseUrl || (
          provider === 'openai' 
            ? 'https://api.openai.com' 
            : provider === 'openrouter' 
              ? 'https://openrouter.ai' 
              : 'http://localhost:11434'
        )
        url = `${resolvedBaseUrl}/v1/chat/completions`
        
        headers = {
          'Content-Type': 'application/json',
        }

        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`
        }
        
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = window.location.origin
          headers['X-Title'] = 'OmniBox AI'
        }

        const messages = []
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt })
        }
        messages.push({ role: 'user', content: prompt })

        body = {
          model: selectedModel,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }
      } else if (provider === 'gemini') {
        // Gemini serverless REST streaming endpoint
        const modelName = selectedModel || 'gemini-1.5-flash'
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`
        
        headers = {
          'Content-Type': 'application/json',
        }

        let finalPrompt = prompt
        if (systemPrompt) {
          finalPrompt = `${systemPrompt}\n\nUser Input:\n${prompt}`
        }

        body = {
          contents: [
            {
              role: 'user',
              parts: [{ text: finalPrompt }]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          }
        }
      } else if (provider === 'anthropic') {
        // Anthropic Claude, requires proxy URL to avoid browser CORS policy blocks
        const defaultBase = 'https://api.anthropic.com'
        const activeBase = baseUrl && baseUrl !== 'https://api.anthropic.com' ? baseUrl : defaultBase
        url = `${activeBase}/v1/messages`

        headers = {
          'content-type': 'application/json',
          'x-api-key': apiKey || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerously-allow-developer-in-browser': 'true',
        }

        const messages = [{ role: 'user', content: prompt }]
        body = {
          model: selectedModel,
          max_tokens: maxTokens,
          messages,
          temperature,
          stream: true,
        }
        if (systemPrompt) {
          body.system = systemPrompt
        }
      }

      let response: Response
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
      } catch (fetchError: any) {
        // Detect network errors indicating CORS block or server down
        if (provider === 'ollama') {
          throw new OllamaCORSException()
        }
        if (provider === 'anthropic' && baseUrl === 'https://api.anthropic.com') {
          throw new AnthropicCORSException()
        }
        throw fetchError
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      if (!response.body) {
        throw new Error('Response body is not readable.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let fullText = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Save the last partial line back to the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (provider === 'openai' || provider === 'openrouter' || provider === 'ollama') {
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6)
              if (dataStr === '[DONE]') continue

              try {
                const parsed = JSON.parse(dataStr)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullText += content
                  callbacks.onChunk(content)
                }
              } catch (e) {
                // Ignore incomplete JSON chunks inside streams
              }
            }
          } else if (provider === 'gemini') {
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6)
              try {
                const parsed = JSON.parse(dataStr)
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
                if (content) {
                  fullText += content
                  callbacks.onChunk(content)
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          } else if (provider === 'anthropic') {
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6)
              try {
                const parsed = JSON.parse(dataStr)
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  const content = parsed.delta.text
                  fullText += content
                  callbacks.onChunk(content)
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }

      // Flush remaining buffer item
      const finalTrimmed = buffer.trim()
      if (finalTrimmed.startsWith('data: ')) {
        const dataStr = finalTrimmed.slice(6)
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr)
            let content = ''
            if (provider === 'openai' || provider === 'openrouter' || provider === 'ollama') {
              content = parsed.choices?.[0]?.delta?.content || ''
            } else if (provider === 'gemini') {
              content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
            } else if (provider === 'anthropic') {
              content = parsed.delta?.text || ''
            }
            if (content) {
              fullText += content
              callbacks.onChunk(content)
            }
          } catch (e) {}
        }
      }

      callbacks.onComplete(fullText)

    } catch (err: any) {
      callbacks.onError(err)
    }
  }
}
