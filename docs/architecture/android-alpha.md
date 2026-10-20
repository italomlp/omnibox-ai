# Android alpha shell

The Android build wraps the same client-side SPA with Capacitor 8. It bundles `dist` and has no development server URL, backend, cloud SDK, native HTTP interception, or native microphone permission. App identity is `com.italomlp.omniboxai`; alpha version is `0.1.0-alpha.1` (code 1).

## Capability and data boundaries

`src/platform/runtime.ts` detects native Android. Execution policy rejects WebLLM and Ollama even if a stale selection reaches dispatch. Their selectors and settings are unavailable on Android. Speech capture and synthesis are disabled at the platform boundary and in the UI. All six tools remain in the catalog with Android availability copy. Bundled Harper grammar, JavaScript regex, and TXT/PDF/DOCX parsing remain local.

Cloud requests retain the existing browser fetch/SSE path and privacy-mode guard. Android disables automatic provider fallback. Use HTTPS provider endpoints; native cleartext and mixed content are disabled. API keys live only in Zustand memory on Android. Persisted settings strip keys when read and exclude session keys when written. This does not change IndexedDB documents or runs. Web key persistence stays unchanged. Android backup is disabled.

`src/platform/nativeLifecycle.ts` handles Back in palette, mobile drawer, overlay, then WebView history order. At the root it minimizes the app, matching modern Android root Back behavior. Backgrounding aborts active inference and records terminal cancellation. Capacitor SystemBars manages WebView keyboard resize and safe-area CSS; system-bar icons follow the app theme. Capacitor opens external navigation in Android's system browser through ACTION_VIEW; app assets stay in the WebView.

## Build locally

Use Node 22+, JDK 21, Android SDK Platform 36, and installed Android build tools. Capacitor's Gradle wrapper downloads its pinned Gradle version. Android SDK licenses must already be accepted by the developer; scripts do not accept them.

```sh
npm ci
npm test
npm run lint
npm run android:debug
npm run android:release
```

Set `JAVA_HOME` and `ANDROID_HOME` for the host; an ignored `android/local.properties` can also point to the SDK. Do not commit machine-specific paths or signing credentials. `android:release` produces unsigned APK/AAB files until the private release signing configuration is supplied. Signing/upload credentials and Play Console setup are managed separately.

Outputs: `android/app/build/outputs/apk/debug/app-debug.apk`, `android/app/build/outputs/apk/release/app-release-unsigned.apk`, and `android/app/build/outputs/bundle/release/app-release.aab`. Build web assets and run `cap sync android` after every SPA change before rebuilding native artifacts.

Device acceptance should cover offline launch, all routes, disabled provider/speech controls, local grammar/regex, synthetic TXT/PDF/DOCX import, Back/keyboard/rotation, background cancellation, and process restart (keys absent, documents/runs retained). Paid cloud responses and Play Console distribution require separate credentials and review.
