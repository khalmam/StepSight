import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  stepLength: number;
  audioEnabled: boolean;
  hapticEnabled: boolean;
  sensitivity: number;
  announcementDelay: number; // seconds between alerts for same object type
  detectionMode: 'ai' | 'simulation' | 'hybrid';
  confidenceThreshold: number;
  centerFocusOnly: boolean;
  spatialAudio: boolean;
}

const defaultSettings: Settings = {
  stepLength: 65, // centimeters
  audioEnabled: true,
  hapticEnabled: true,
  sensitivity: 0.7,
  announcementDelay: 4.0, // 4 seconds cooldown for better filtering
  detectionMode: 'hybrid', // Use AI when available, fallback to simulation
  confidenceThreshold: 0.6,
  centerFocusOnly: true,
  spatialAudio: false,
};

const SETTINGS_KEY = 'stepsight_settings_v2';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to handle new settings
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.log('Error loading settings:', error);
      // Use defaults on error
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
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

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    } catch (error) {
      console.log('Error resetting settings:', error);
    }
  };

  const exportSettings = async (): Promise<string> => {
    try {
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.log('Error exporting settings:', error);
      return '';
    }
  };

  const importSettings = async (settingsJson: string): Promise<boolean> => {
    try {
      const importedSettings = JSON.parse(settingsJson);
      const validatedSettings = { ...defaultSettings, ...importedSettings };
      await updateSettings(validatedSettings);
      return true;
    } catch (error) {
      console.log('Error importing settings:', error);
      return false;
    }
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    isLoading,
  };
}