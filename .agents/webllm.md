# WebLLM and WebGPU

Local inference uses WebLLM through WebGPU.

- Check `navigator.gpu` before initializing WebLLM engines.
- Show model loading progress with percentage, state, and speed in MB/s when available.
- Fallback gracefully to Ollama or cloud gateways when WebGPU is unavailable and privacy settings allow it.
- Prefer supported model IDs from the installed `@mlc-ai/web-llm` prebuilt config.
- Use labeled tiers for WebLLM model choices:
  - `fast`: lowest VRAM and latency.
  - `balanced`: default local quality/speed tradeoff.
  - `quality`: higher VRAM and slower startup for better output.
