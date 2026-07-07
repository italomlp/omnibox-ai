import { useState, useEffect } from 'react'
import * as webLLM from '@mlc-ai/web-llm'

// Cache the loaded model engine in memory to prevent reloading it on every hook mount
let cachedEngine: webLLM.MLCEngineInterface | null = null
let cachedModelId: string | null = null

export interface WebLLMHook {
  isSupported: boolean;
  isLoading: boolean;
  loadProgress: string;
  loadPercent: number;
  speed: string;
  error: string | null;
  loadModel: (modelId: string) => Promise<webLLM.MLCEngineInterface | null>;
  generate: (
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    onChunk?: (text: string) => void
  ) => Promise<string>;
}

export function useWebLLM(): WebLLMHook {
  const [isSupported, setIsSupported] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadProgress, setLoadProgress] = useState<string>('')
  const [loadPercent, setLoadPercent] = useState<number>(0)
  const [speed, setSpeed] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasGPU = 'gpu' in navigator && navigator.gpu !== undefined
      setIsSupported(hasGPU)
    }
  }, [])

  const loadModel = async (modelId: string): Promise<webLLM.MLCEngineInterface | null> => {
    if (!isSupported) {
      setError('WebGPU is not supported on this browser or device hardware.')
      return null
    }

    if (cachedEngine && cachedModelId === modelId) {
      return cachedEngine
    }

    setIsLoading(true)
    setError(null)
    setLoadProgress('Initializing WebGPU MLC Engine...')
    setLoadPercent(0)
    setSpeed('')

    try {
      // Create the MLC Engine instance
      const engine = await webLLM.CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          setLoadProgress(report.text)
          
          // Attempt to parse download percentage (e.g. "Loading model... 45.3%")
          const percentMatch = report.text.match(/(\d+(?:\.\d+)?)%/)
          if (percentMatch) {
            setLoadPercent(parseFloat(percentMatch[1]))
          }
          
          // Attempt to parse download speed (e.g. "5.43 MB/s")
          const speedMatch = report.text.match(/(\d+(?:\.\d+)?\s*MB\/s)/)
          if (speedMatch) {
            setSpeed(speedMatch[1])
          }
        },
      })

      cachedEngine = engine
      cachedModelId = modelId
      setIsLoading(false)
      setLoadProgress('Model loaded successfully.')
      setLoadPercent(100)
      return engine
    } catch (err: any) {
      console.error('WebLLM load error:', err)
      setError(err.message || 'Failed to initialize WebLLM engine.')
      setIsLoading(false)
      throw err
    }
  }

  const generate = async (
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    onChunk?: (text: string) => void
  ): Promise<string> => {
    try {
      let engine = cachedEngine
      if (!engine || cachedModelId !== modelId) {
        engine = await loadModel(modelId)
      }
      if (!engine) {
        throw new Error('WebLLM engine failed to initialize.')
      }

      const messages: webLLM.ChatCompletionMessageParam[] = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      const completion = await engine.chat.completions.create({
        messages,
        stream: true,
      })

      let fullText = ''
      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          fullText += text
          if (onChunk) {
            onChunk(text)
          }
        }
      }

      return fullText
    } catch (err: any) {
      console.error('WebLLM generation error:', err)
      setError(err.message || 'Generation failed.')
      throw err
    }
  }

  return {
    isSupported,
    isLoading,
    loadProgress,
    loadPercent,
    speed,
    error,
    loadModel,
    generate,
  }
}
