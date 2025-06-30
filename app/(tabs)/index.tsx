import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, Volume2, VolumeX, Zap, ZapOff, RotateCcw, Settings as SettingsIcon } from 'lucide-react-native';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');

  const cameraRef = useRef<CameraView>(null);

  const toggleCamera = () => {
    console.log('Toggle camera pressed');
    setIsActive(!isActive);
  };

  const toggleAudio = () => {
    console.log('Toggle audio pressed');
  };

  const toggleHaptic = () => {
    console.log('Toggle haptic pressed');
  };

  const flipCamera = () => {
    console.log('Flip camera pressed');
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const testConnection = () => {
    console.log('Test API connection pressed');
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading camera permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Camera access is required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        />

        {/* Overlay UI */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Control Panel */}
          <View style={styles.controlPanel}>
            <TouchableOpacity
              style={[styles.mainButton, isActive && styles.mainButtonActive]}
              onPress={toggleCamera}
            >
              {isActive ? (
                <Pause size={32} color="#FFFFFF" />
              ) : (
                <Play size={32} color="#FFFFFF" />
              )}
              <Text style={styles.mainButtonText}>{isActive ? 'STOP' : 'START'}</Text>
            </TouchableOpacity>

            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleAudio}
              >
                <Volume2 size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleHaptic}
              >
                <Zap size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={flipCamera}
              >
                <RotateCcw size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={testConnection}
              >
                <SettingsIcon size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: 'center',
  },
  mainButton: {
    backgroundColor: '#374151',
    height: 80,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mainButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  controlButton: {
    backgroundColor: '#374151',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    marginTop: 20,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
