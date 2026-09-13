import { Platform } from 'react-native';

// In Android emulator, 10.0.2.2 maps to host machine localhost.
// In iOS Simulator or Web, localhost works directly.
// On physical device, replace with your development machine's local Wi-Fi IP (e.g. http://192.168.1.15:8000/api/v1)
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const CONFIG = {
  API_BASE_URL: `${DEFAULT_HOST}/api/v1`,
  STORAGE_KEY_TOKEN: '@nagar_drishti_token',
  STORAGE_KEY_USER: '@nagar_drishti_user',
  APP_NAME: 'Nagar Drishti',
  DEFAULT_MAP_DELTA: {
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  }
};
