import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  RotateCcw,
  TriangleAlert as AlertTriangle,
  Brain,
  Wifi,
  WifiOff,
  Settings as SettingsIcon
} from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';

export default function CameraScreen() {
  const { settings, updateSettings } = useSettings();
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const logMessage = (message: string) => {
    setLogs((prevLogs) => [message, ...prevLogs.slice(0, 4)]);
    if (settings.audioEnabled && Platform.OS === 'web') {
      Speech.speak(message, {
        language: 'en',
        pitch: 1.0,
        rate: 0.8,
      });
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Alert.alert('Error', 'This screen is configured for web simulation only.');
    }
  }, []);

  const toggleScanning = () => {
    const newState = !isActive;
    setIsActive(newState);
    logMessage(newState ? 'Simulation started' : 'Simulation stopped');
  };

  const simulateDetection = () => {
    if (!isActive) return;
    const objects = ['chair', 'table', 'person', 'door'];
    const object = objects[Math.floor(Math.random() * objects.length)];
    const distance = Math.floor(Math.random() * 5) + 1;
    logMessage(`${object} detected in ${distance} steps`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.title}>Web Simulation Mode</Text>
        <TouchableOpacity
          style={[styles.mainButton, isActive && styles.mainButtonActive]}
          onPress={toggleScanning}
        >
          {isActive ? (
            <Pause size={32} color="#FFFFFF" />
          ) : (
            <Play size={32} color="#FFFFFF" />
          )}
          <Text style={styles.mainButtonText}>{isActive ? 'STOP' : 'START'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.simulateButton}
          onPress={simulateDetection}
          disabled={!isActive}
        >
          <Text style={styles.simulateButtonText}>Simulate Detection</Text>
        </TouchableOpacity>

        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            const newState = !settings.audioEnabled;
            updateSettings({ audioEnabled: newState });
            logMessage(newState ? 'Audio enabled' : 'Audio disabled');
          }}
        >
          {settings.audioEnabled ? (
            <Volume2 size={24} color="#FFFFFF" />
          ) : (
            <VolumeX size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  mainButton: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  mainButtonActive: {
    backgroundColor: '#3B82F6',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  simulateButton: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  simulateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  logText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginVertical: 4,
  },
  controlButton: {
    marginTop: 20,
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 50,
  },
});
