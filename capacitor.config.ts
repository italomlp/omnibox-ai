import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.italomlp.omniboxai',
  appName: 'OmniBox AI',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    SystemBars: { style: 'DARK', insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
    CapacitorHttp: { enabled: false },
    CapacitorCookies: { enabled: false },
  },
}

export default config
