// Full modified CameraScreen with web support

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Play, Pause, Volume2, VolumeX, Zap, ZapOff, RotateCcw, TriangleAlert as AlertTriangle, Brain, Target, Activity, Wifi, WifiOff, Settings as SettingsIcon
} from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';
import { ProcessedAlert } from '@/services/APIDetectionService';
import { EnhancedDetectionOverlay } from '@/components/EnhancedDetectionOverlay';

const { width, height } = Dimensions.get('window');

interface DetectionStats {
  totalDetections: number;
  apiCalls: number;
  errors: number;
  lastDetectionTime: number;
  apiStatus: 'unknown' | 'available' | 'unavailable';
}

export default function CameraScreen() {
  const { settings, updateSettings } = useSettings();

  // WEB MODE
  if (Platform.OS === 'web') {
    const [isActive, setIsActive] = useState(false);
    const [currentAlert, setCurrentAlert] = useState<ProcessedAlert | null>(null);
    const [webLog, setWebLog] = useState<string[]>([]);
    const detectionInterval = useRef<NodeJS.Timeout>(null);

    const toggleSimulation = () => {
      setIsActive(!isActive);
      if (!isActive) {
        startSimulation();
      } else {
        stopSimulation();
      }
    };

    const startSimulation = () => {
      detectionInterval.current = setInterval(() => {
        const simulatedAlert = generateSimulatedAlert();
        setCurrentAlert(simulatedAlert);
        setWebLog((prev) => [...prev, simulatedAlert.message]);

        if (settings.audioEnabled) {
          Speech.speak(simulatedAlert.message, { language: 'en' });
        }
      }, 3000);
    };

    const stopSimulation = () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
    };

    const generateSimulatedAlert = (): ProcessedAlert => {
      const objects = ['chair', 'door', 'wall', 'table', 'person'];
      const label = objects[Math.floor(Math.random() * objects.length)];
      const steps = Math.floor(Math.random() * 6) + 1;

      return {
        detection: {
          id: `web_${Date.now()}`,
          label,
          confidence: 0.9,
          distance: steps * (settings.stepLength / 100),
          steps,
          x: 0.5,
          y: 0.5,
          width: 0.3,
          height: 0.3,
          timestamp: Date.now(),
        },
        priority: 100 - steps * 10,
        shouldAnnounce: true,
        shouldVibrate: steps <= 2,
        message: `${label} ahead in ${steps} ${steps === 1 ? 'step' : 'steps'}`,
      };
    };

    return (
      <SafeAreaView style={styles.webContainer}>
        <Text style={styles.webTitle}>StepSight Web Simulation</Text>

        <TouchableOpacity style={styles.mainButton} onPress={toggleSimulation}>
          {isActive ? <Pause size={32} color="#FFFFFF" /> : <Play size={32} color="#FFFFFF" />}
          <Text style={styles.mainButtonText}>{isActive ? 'STOP' : 'START'} SIMULATION</Text>
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, settings.audioEnabled && styles.controlButtonActive]}
            onPress={() => updateSettings({ audioEnabled: !settings.audioEnabled })}
          >
            {settings.audioEnabled ? <Volume2 size={24} color="#FFFFFF" /> : <VolumeX size={24} color="#9CA3AF" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, settings.hapticEnabled && styles.controlButtonActive]}
            onPress={() => updateSettings({ hapticEnabled: !settings.hapticEnabled })}
          >
            {settings.hapticEnabled ? <Zap size={24} color="#FFFFFF" /> : <ZapOff size={24} color="#9CA3AF" />}
          </TouchableOpacity>
        </View>

        <View style={styles.logContainer}>
          <Text style={styles.webSubtitle}>Detection Log:</Text>
          {webLog.slice(-5).map((log, index) => (
            <Text key={index} style={styles.logEntry}>{log}</Text>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Keep your full mobile code unchanged below (already provided)
  return (<Text style={{ color: 'white' }}>Mobile version not shown here for brevity</Text>);
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  webSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 10,
    fontWeight: '600',
  },
  mainButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  controls: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  controlButton: {
    backgroundColor: '#374151',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  controlButtonActive: {
    backgroundColor: '#059669',
  },
  logContainer: {
    width: '100%',
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#1F2937',
  },
  logEntry: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 5,
  },
});
