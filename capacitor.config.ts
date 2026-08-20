import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.larsmacario.rephive',
  appName: 'ÆVNR',
  webDir: 'dist',
  backgroundColor: '#F6F6F4',
  ios: {
    scrollEnabled: true,
    contentInset: 'never',
    backgroundColor: '#F6F6F4'
  }
};

export default config;
