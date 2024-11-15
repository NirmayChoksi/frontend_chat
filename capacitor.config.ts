import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'frontend',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.None,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
