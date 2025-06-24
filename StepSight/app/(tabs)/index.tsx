import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, Volume2, VolumeX, Zap, ZapOff, RotateCcw, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';
import { DetectionService, ProcessedAlert } from '@/services/DetectionService';
import { DetectionOverlay } from '@/components/DetectionOverlay';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [currentAlert, setCurrentAlert] = useState<ProcessedAlert | null>(null);
  const [detectionStats, setDetectionStats] = useState({ total: 0, filtered: 0 });
  const { settings, updateSettings } = useSettings();
  const detectionService = useRef(new DetectionService()).current;
  const detectionInterval = useRef<NodeJS.Timeout>();
  const cleanupInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Update detection service when step length changes
    detectionService.updateStepLength(settings.stepLength);
  }, [settings.stepLength]);

  useEffect(() => {
    if (isActive) {
      startDetection();
      announceMessage('StepSight activated. Scanning for obstacles in your path.');
    } else {
      stopDetection();
    }

    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
      }
    };
  }, [isActive]);

  const startDetection = () => {
    // Process detections with intelligent filtering
    const processDetections = () => {
      const alerts = detectionService.processDetections();
      const totalDetections = detectionService.simulateDetection().length;
      
      setDetectionStats({
        total: totalDetections,
        filtered: alerts.length
      });

      // Handle the top priority alert
      if (alerts.length > 0) {
        const topAlert = alerts[0];
        setCurrentAlert(topAlert);
        
        if (topAlert.shouldAnnounce && settings.audioEnabled) {
          announceDetection(topAlert);
        }
        
        if (topAlert.shouldVibrate && settings.hapticEnabled && Platform.OS !== 'web') {
          triggerHapticFeedback(topAlert.detection.steps);
        }
      } else {
        setCurrentAlert(null);
      }
    };

    // Run detection every 1.5 seconds
    detectionInterval.current = setInterval(processDetections, 1500);
    
    // Clean up old tracking data every 30 seconds
    cleanupInterval.current = setInterval(() => {
      detectionService.clearOldTrackingData();
    }, 30000);
  };

  const stopDetection = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }
    if (cleanupInterval.current) {
      clearInterval(cleanupInterval.current);
    }
    setCurrentAlert(null);
    setDetectionStats({ total: 0, filtered: 0 });
  };

  const announceDetection = (alert: ProcessedAlert) => {
    if (!settings.audioEnabled) return;

    Speech.speak(alert.message, {
      language: 'en',
      pitch: alert.detection.steps <= 2 ? 1.2 : 1.0, // Higher pitch for urgent alerts
      rate: alert.detection.steps <= 2 ? 0.9 : 0.8, // Slightly faster for urgent alerts
    });
  };

  const triggerHapticFeedback = (steps: number) => {
    if (Platform.OS === 'web') return;

    // Different haptic patterns based on proximity
    if (steps === 1) {
      // Urgent - strong repeated vibration
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    } else if (steps === 2) {
      // Warning - medium vibration
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const announceMessage = (message: string) => {
    if (settings.audioEnabled) {
      Speech.speak(message, {
        language: 'en',
        pitch: 1.0,
        rate: 0.8,
      });
    }
  };

  const toggleCamera = () => {
    setIsActive(!isActive);
    const message = !isActive ? 'Camera activated' : 'Camera deactivated';
    announceMessage(message);
  };

  const toggleAudio = () => {
    const newState = !settings.audioEnabled;
    updateSettings({ audioEnabled: newState });
    announceMessage(newState ? 'Audio enabled' : 'Audio disabled');
  };

  const toggleHaptic = () => {
    const newState = !settings.hapticEnabled;
    updateSettings({ hapticEnabled: newState });
    announceMessage(newState ? 'Haptic feedback enabled' : 'Haptic feedback disabled');
    
    if (newState && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const flipCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    announceMessage('Camera flipped');
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Loading camera permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <AlertTriangle size={64} color="#EA580C" style={styles.icon} />
          <Text style={styles.title}>Camera Access Required</Text>
          <Text style={styles.message}>
            StepSight needs camera access to detect obstacles and help with navigation.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermission}
            accessibilityLabel="Grant camera permission"
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing={facing}
          active={isActive}
        >
          <DetectionOverlay detections={currentAlert ? [currentAlert.detection] : []} />
          
          {/* Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.statusText}>
                {isActive ? 'SCANNING' : 'INACTIVE'}
              </Text>
            </View>
            <Text style={styles.stepInfo}>
              Step Length: {settings.stepLength}cm
            </Text>
          </View>

          {/* Center Focus Indicator */}
          {isActive && (
            <View style={styles.focusIndicator}>
              <View style={styles.focusZone} />
              <Text style={styles.focusText}>Focus Zone</Text>
            </View>
          )}

          {/* Current Alert Display */}
          {currentAlert && (
            <View style={styles.alertDisplay}>
              <View style={[
                styles.alertBadge,
                { backgroundColor: currentAlert.detection.steps <= 2 ? '#EF4444' : currentAlert.detection.steps <= 4 ? '#F59E0B' : '#10B981' }
              ]}>
                <Text style={styles.alertSteps}>
                  {currentAlert.detection.steps} {currentAlert.detection.steps === 1 ? 'STEP' : 'STEPS'}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{currentAlert.message}</Text>
              <View style={styles.alertMeta}>
                <Text style={styles.alertConfidence}>
                  {Math.round(currentAlert.detection.confidence * 100)}% confident
                </Text>
                {currentAlert.detection.isMoving && (
                  <Text style={styles.movingIndicator}>• MOVING</Text>
                )}
              </View>
            </View>
          )}

          {/* Detection Stats */}
          {isActive && (
            <View style={styles.statsDisplay}>
              <Text style={styles.statsText}>
                Detected: {detectionStats.total} | Filtered: {detectionStats.filtered}
              </Text>
            </View>
          )}
        </CameraView>

        {/* Control Panel */}
        <View style={styles.controlPanel}>
          <TouchableOpacity
            style={[styles.mainButton, isActive && styles.mainButtonActive]}
            onPress={toggleCamera}
            accessibilityLabel={isActive ? 'Stop scanning' : 'Start scanning'}
          >
            {isActive ? (
              <Pause size={32} color="#FFFFFF" />
            ) : (
              <Play size={32} color="#FFFFFF" />
            )}
            <Text style={styles.mainButtonText}>
              {isActive ? 'STOP' : 'START'}
            </Text>
          </TouchableOpacity>

          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.controlButton, settings.audioEnabled && styles.controlButtonActive]}
              onPress={toggleAudio}
              accessibilityLabel={settings.audioEnabled ? 'Disable audio' : 'Enable audio'}
            >
              {settings.audioEnabled ? (
                <Volume2 size={24} color="#FFFFFF" />
              ) : (
                <VolumeX size={24} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, settings.hapticEnabled && styles.controlButtonActive]}
              onPress={toggleHaptic}
              accessibilityLabel={settings.hapticEnabled ? 'Disable haptic feedback' : 'Enable haptic feedback'}
            >
              {settings.hapticEnabled ? (
                <Zap size={24} color="#FFFFFF" />
              ) : (
                <ZapOff size={24} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={flipCamera}
              accessibilityLabel="Flip camera"
            >
              <RotateCcw size={24} color="#FFFFFF" />
            </TouchableOpacity>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stepInfo: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  focusIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -60 }],
    alignItems: 'center',
  },
  focusZone: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 60,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  focusText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  alertDisplay: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  alertBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  alertSteps: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertMessage: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertConfidence: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  movingIndicator: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsDisplay: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 8,
  },
  statsText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  controlPanel: {
    backgroundColor: '#1F2937',
    padding: 24,
    paddingBottom: 40,
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
  controlButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
});