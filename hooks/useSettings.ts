import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  stepLength: number;
  audioEnabled: boolean;
  hapticEnabled: boolean;
  sensitivity: number;
  announcementDelay: number; // seconds between alerts for same object type
}

const defaultSettings: Settings = {
  stepLength: 65, // centimeters
  audioEnabled: true,
  hapticEnabled: true,
  sensitivity: 0.7,
  announcementDelay: 3.0, // 3 seconds cooldown for better filtering
};

const SETTINGS_KEY = 'stepsight_settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  };

  return {
    settings,
    updateSettings,
  };
}