# Local models, privacy, and interface improvements

- Keep model metadata, provider suggestions, local speech model and task defaults in `src/config/modelCatalog.ts`; check WebLLM IDs against the installed runtime.
- Use task defaults automatically and let explicit model choices override them. Gemma 4 E2B is the grammar/tone candidate; Qwen3 4B is the career candidate. Model fitness remains an estimate, not a guarantee.
- Enable privacy by default and migrate old settings once. Block cloud inference, remote Ollama and browser recognition; allow loopback Ollama and user-initiated downloads for local models. Model runtimes are bundled locally where practical.
- Offer multilingual Whisper transcription after recording audio locally, with clear download and microphone states. Browser recognition remains available with privacy off.
- Present local models in a dialog with concise compatibility information and fix grammar and career workspace layout.
- Verify with the test suite, lint before build, browser UI review, and real model/microphone checks on supported hardware.
