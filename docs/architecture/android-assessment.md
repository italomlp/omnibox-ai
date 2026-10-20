# Android effort assessment

Assessed 2026-10-20 from the current source and browser validation. These are engineering estimates, not measured implementation times. No Android project was created and no device was tested.

## Scope and estimates

Assume one experienced developer, Android only, all six existing tools, bring-your-own cloud keys, local records, foreground execution, file import/export, and basic speech support. Estimates include development and device QA, but exclude store-review waiting time and guaranteed on-device LLM parity.

| Approach | Proof of concept | Usable beta | Release candidate, total |
| --- | --- | --- | --- |
| Capacitor around the existing Vite SPA | 1–3 person-days | 8–15 person-days | 15–25 person-days |
| React Native with Expo and shared TypeScript logic | 3–5 person-days | 25–40 person-days | 40–60 person-days |

The columns are cumulative. Allow roughly another 10–25 person-days for a production-quality native local-LLM adapter after a device feasibility spike; unsupported devices or model requirements may increase scope substantially. Fully offline speech is also separate scope. Confidence is moderate for cloud-first packaging and low for local AI before device testing.

## Capacitor

[Capacitor supports adding a native runtime to an existing web project](https://capacitorjs.com/docs/getting-started), making it the smaller first release for this repository. Bundle Vite's static output into the APK/AAB; a backend is unnecessary. Most UI, Tailwind styling, Zustand state, Dexie repositories, regex logic, and browser inference orchestration can remain.

Expected work includes Android configuration/signing, mobile keyboard and safe-area behavior, Android back navigation, app links, secure key storage, document picker and sharing behavior, speech adapters, lifecycle cancellation, and physical-device testing. Verify IndexedDB durability through restarts, upgrades and process death before relying on it. Confirm worker/WASM assets and PDF imports in the packaged origin. Test provider CORS and streaming from that origin.

## React Native / Expo

React concepts and business logic transfer, but the present HTML controls, CSS, contenteditable grammar editor, and browser navigation require native replacements. [React Native exposes native View, Text and TextInput components](https://reactnative.dev/docs/components-and-apis).

Likely reusable areas are the tool registry, types, prompts, validation, provider request construction, SSE parsers, execution policy, and some Zustand logic. Extract them behind platform-neutral interfaces. Replace Dexie/IndexedDB with a native repository implementation such as [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), and persist keys using [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). Validate the existing stream reader with [Expo streaming fetch](https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api), including abort and app-background behavior.

Harper currently uses a browser Worker/WASM loader; it needs a feasibility spike, native adapter, or contained WebView. PDF/DOCX parsing and native speech also need platform-specific decisions. A React Native shell containing the entire existing SPA is another WebView wrapper and does not eliminate those compatibility checks.

## Main risks

- **Local LLM execution:** do not assume Chrome WebGPU support establishes Android WebView support or that the browser WebLLM hook works in React Native. Check the actual packaged runtime on target devices. The current default model advertises a 1.6 GB download and 2.5 GB recommended available GPU/shared memory. Model storage, thermals, battery use, interruption, and low-memory handling need device measurements. [MLC offers a separate Android SDK](https://llm.mlc.ai/docs/deploy/android.html), which entails native runtime and model-library integration.
- **Ollama:** `localhost:11434` on a phone refers to the phone. A desktop Ollama connection requires an explicitly configured reachable endpoint. LAN execution must not be silently treated as on-device execution; revisit the current locality metadata and privacy semantics before adding that support. [Android documents the emulator's separate network address space](https://developer.android.com/studio/run/emulator-networking-address).
- **Speech:** existing browser recognition is deliberately blocked in privacy mode because it is not verified local-only. Preserve that boundary in native adapters; OS speech availability does not guarantee offline recognition.
- **Startup and memory:** the production output is approximately 27 MB, with a 6.5 MB main JS chunk and 18.2 MB Harper WASM asset. Profile startup and defer heavy runtimes before mobile release.
- **Storage and credentials:** test native secure storage and document retention, and plan explicit import/export between website and app. Browser data does not automatically migrate into an installed application's storage.

## Recommendation

Choose Capacitor for the first Android release if reusing this product quickly is the priority. Spend the first 2–3 days proving packaged startup, storage, provider streaming, file import, and local-runtime capability on a mid-range physical phone. Keep local LLM support capability-gated until verified.

Choose Expo/React Native if a native mobile interface and ongoing mobile-specific development justify approximately 8–12 developer-weeks for the initial release candidate. The web SPA can remain intact while shared domain logic moves behind platform adapters. The main uncertainty is offline AI parity, which should be evaluated before committing to either timeline.
