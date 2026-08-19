import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.germanwithboka.app',
  appName: 'German with Boka',
  webDir: 'capacitor-web',
  server: {
    url: process.env.CAPACITOR_SERVER_URL,
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FFF3E8'
    }
  }
};

export default config;
