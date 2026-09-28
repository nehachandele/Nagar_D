import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_API_URL = '@nagar_drishti_api_url';

// Priority 1: Environment Variable (e.g., set via build or .env)
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

// Priority 2: Platform defaults (Wi-Fi LAN IP works wirelessly and over USB)
const DEFAULT_HOST = 'http://192.168.1.9:8000';
const INITIAL_API_URL = ENV_API_URL || `${DEFAULT_HOST}/api/v1`;

export const CONFIG = {
  API_BASE_URL: INITIAL_API_URL,
  STORAGE_KEY_TOKEN: '@nagar_drishti_token',
  STORAGE_KEY_USER: '@nagar_drishti_user',
  STORAGE_KEY_API_URL,
  APP_NAME: 'Nagar Drishti',
  DEFAULT_MAP_DELTA: {
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  }
};

/**
 * Retrieves the persisted API Base URL or defaults to standard host.
 */
export const loadSavedApiBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved && saved.trim().length > 0) {
      CONFIG.API_BASE_URL = saved.trim();
      return saved.trim();
    }
  } catch (err) {
    console.warn('[Config] Failed to load saved API URL:', err);
  }
  return CONFIG.API_BASE_URL;
};

/**
 * Formats and saves a custom API Base URL to persistent storage.
 */
export const saveApiBaseUrl = async (inputUrl: string): Promise<string> => {
  let formatted = inputUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `http://${formatted}`;
  }
  formatted = formatted.replace(/\/+$/, '');
  if (!formatted.endsWith('/api/v1')) {
    formatted = `${formatted}/api/v1`;
  }

  CONFIG.API_BASE_URL = formatted;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, formatted);
  } catch (err) {
    console.warn('[Config] Failed to save API URL:', err);
  }
  return formatted;
};
