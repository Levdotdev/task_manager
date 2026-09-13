import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.daily.taskmanager',
  appName: 'Daily Task Manager',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_reminder',
      iconColor: '#287451',
      presentationOptions: ['sound', 'banner', 'list']
    }
  }
};

export default config;
