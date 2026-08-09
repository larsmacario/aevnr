import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.larsmacario.rephive',
  appName: 'ÆVNR',
  webDir: 'dist',
  backgroundColor: '#FFFFFF',
  ios: {
    scrollEnabled: true,
    contentInset: 'never',
    backgroundColor: '#FFFFFF'
  }
};

export default config;
