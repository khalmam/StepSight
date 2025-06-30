import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, AlertTriangle } from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';

export default function CameraScreenWeb() {
  const [isActive, setIsActive] = useState(false);
  const [detections, setDetections] = useState<string[]>([]);
  const { settings } = useSettings();

  const simulateDetection = () => {
    const objects = ['chair', 'table', 'door', 'person'];
    const object = objects[Math.floor(Math.random() * objects.length)];
    const steps = Math.floor(Math.random() * 5) + 1;

    const message = `${object} ahead in ${steps} ${steps === 1 ? 'step' : 'steps'}`;

    setDetections((prev) => [message, ...prev]);

    if (settings.audioEnabled) {
      Speech.speak(message, { rate: 0.9 });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>StepSight Web Simulation</Text>
      <TouchableOpacity
        style={[styles.button, isActive ? styles.active : styles.inactive]}
        onPress={() => setIsActive((prev) => !prev)}
      >
        {isActive ? <Pause size={32} color="#FFF" /> : <Play size={32} color="#FFF" />}
        <Text style={styles.buttonText}>{isActive ? 'Stop Scanning' : 'Start Scanning'}</Text>
      </TouchableOpacity>

      {isActive && (
        <TouchableOpacity style={styles.simulateButton} onPress={simulateDetection}>
          <Text style={styles.simulateButtonText}>Simulate Detection</Text>
        </TouchableOpacity>
      )}

      <View style={styles.log}>
        {detections.map((det, index) => (
          <Text key={index} style={styles.logText}>• {det}</Text>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 20 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12 },
  active: { backgroundColor: '#3B82F6' },
  inactive: { backgroundColor: '#374151' },
  buttonText: { color: '#FFF', fontSize: 18, marginLeft: 12 },
  simulateButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  simulateButtonText: { color: '#FFF', fontSize: 16 },
  log: { marginTop: 30 },
  logText: { color: '#9CA3AF', fontSize: 14, marginBottom: 6 },
});
