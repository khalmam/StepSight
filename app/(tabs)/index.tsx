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
  Target,
  Activity
} from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';
import { AIDetectionService, ProcessedAlert } from '@/services/AIDetectionService';
import { EnhancedDetectionOverlay } from '@/components/EnhancedDetectionOverlay';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [currentAlert, setCurrentAlert] = useState<ProcessedAlert | null>(null);
  const [detectionStats, setDetectionStats] = useState({ 
    total: 0, 
    filtered: 0, 
    aiStatus: 'loading' as 'loading' | 'ready' | 'error'
  });
  const { settings, updateSettings } = useSettings();
  const detectionService = useRef(new AIDetectionService()).current;
  const detectionInterval = useRef<NodeJS.Timeout>();
  const cleanupInterval = useRef<NodeJS.Timeout>();
  const lastAnnouncementTime = useRef<number>(0);

  useEffect(() => {
    // Initialize AI detection service
    initializeDetectionService();
    
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    // Update detection service when step length changes
    detectionService.updateStepLength(settings.stepLength);
  }, [settings.stepLength]);

  useEffect(() => {
    if (isActive) {
      startDetection();
      announceMessage('StepSight AI activated. Scanning for obstacles in your path.');
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

  const initializeDetectionService = async () => {
    try {
      setDetectionStats(prev => ({ ...prev, aiStatus: 'loading' }));
      
      // Check AI model status
      const modelStatus = detectionService.getModelStatus();
      
      if (modelStatus.loaded) {
        setDetectionStats(prev => ({ ...prev, aiStatus: 'ready' }));
        announceMessage('AI detection system ready');
      } else {
        // Try to reinitialize
        const initialized = await detectionService.reinitializeModel();
        setDetectionStats(prev => ({ 
          ...prev, 
          aiStatus: initialized ? 'ready' : 'error' 
        }));
        
        if (initialized) {
          announceMessage('AI detection system initialized');
        } else {
          announceMessage('AI detection unavailable, using enhanced simulation');
        }
      }
    } catch (error) {
      console.error('Detection service initialization failed:', error);
      setDetectionStats(prev => ({ ...prev, aiStatus: 'error' }));
    }
  };

  const startDetection = () => {
    // Enhanced detection with AI processing
    const processDetections = async () => {
      try {
        // In a real implementation, you would pass camera frame data here
        const alerts = await detectionService.processDetections();
        
        setDetectionStats(prev => ({
          ...prev,
          total: alerts.length > 0 ? 1 : 0, // Simplified for demo
          filtered: alerts.length
        }));

        // Handle the top priority alert
        if (alerts.length > 0) {
          const topAlert = alerts[0];
          setCurrentAlert(topAlert);
          
          // Smart announcement logic
          const now = Date.now();
          const timeSinceLastAnnouncement = now - lastAnnouncementTime.current;
          const shouldAnnounce = topAlert.shouldAnnounce && 
            (timeSinceLastAnnouncement > settings.announcementDelay * 1000 || 
             topAlert.alertType === 'urgent');
          
          if (shouldAnnounce && settings.audioEnabled) {
            announceDetection(topAlert);
            lastAnnouncementTime.current = now;
          }
          
          if (topAlert.shouldVibrate && settings.hapticEnabled && Platform.OS !== 'web') {
            triggerHapticFeedback(topAlert);
          }
        } else {
          setCurrentAlert(null);
        }
      } catch (error) {
        console.error('Detection processing error:', error);
      }
    };

    // Run detection every 1.2 seconds for better performance
    detectionInterval.current = setInterval(processDetections, 1200);
    
    // Clean up old tracking data every 20 seconds
    cleanupInterval.current = setInterval(() => {
      detectionService.clearTrackingData();
    }, 20000);
  };

  const stopDetection = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }
    if (cleanupInterval.current) {
      clearInterval(cleanupInterval.current);
    }
    setCurrentAlert(null);
    setDetectionStats(prev => ({ ...prev, total: 0, filtered: 0 }));
  };

  const announceDetection = (alert: ProcessedAlert) => {
    if (!settings.audioEnabled) return;

    const speechOptions = {
      language: 'en',
      pitch: alert.alertType === 'urgent' ? 1.3 : alert.alertType === 'warning' ? 1.1 : 1.0,
      rate: alert.alertType === 'urgent' ? 0.95 : 0.85,
    };

    Speech.speak(alert.message, speechOptions);
  };

  const triggerHapticFeedback = (alert: ProcessedAlert) => {
    if (Platform.OS === 'web') return;

    // Enhanced haptic patterns based on alert type
    switch (alert.alertType) {
      case 'urgent':
        // Strong repeated vibration for urgent alerts
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
        break;
      case 'warning':
        // Medium double vibration for warnings
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 200);
        break;
      default:
        // Light single vibration for info
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
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

  const getStatusColor = () => {
    if (!isActive) return '#6B7280';
    switch (detectionStats.aiStatus) {
      case 'ready': return '#10B981';
      case 'loading': return '#F59E0B';
      case 'error': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = () => {
    if (!isActive) return 'INACTIVE';
    switch (detectionStats.aiStatus) {
      case 'ready': return 'AI READY';
      case 'loading': return 'LOADING';
      case 'error': return 'SIMULATION';
      default: return 'INACTIVE';
    }
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
          <EnhancedDetectionOverlay 
            detections={currentAlert ? [currentAlert.detection] : []} 
            alertType={currentAlert?.alertType}
          />
          
          {/* Enhanced Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.statusText}>{getStatusText()}</Text>
              {detectionStats.aiStatus === 'ready' && (
                <Brain size={16} color="#10B981" style={styles.aiIcon} />
              )}
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.stepInfo}>Step: {settings.stepLength}cm</Text>
              <Text style={styles.platformInfo}>
                {Platform.OS === 'web' ? 'Web' : 'Mobile'}
              </Text>
            </View>
          </View>

          {/* Enhanced Focus Indicator */}
          {isActive && (
            <View style={styles.focusIndicator}>
              <View style={[
                styles.focusZone,
                { borderColor: currentAlert?.alertType === 'urgent' ? '#EF4444' : '#3B82F6' }
              ]} />
              <Target size={16} color="#3B82F6" style={styles.focusIcon} />
              <Text style={styles.focusText}>Detection Zone</Text>
            </View>
          )}

          {/* Enhanced Alert Display */}
          {currentAlert && (
            <View style={[
              styles.alertDisplay,
              { 
                borderColor: currentAlert.alertType === 'urgent' ? '#EF4444' : 
                           currentAlert.alertType === 'warning' ? '#F59E0B' : '#10B981'
              }
            ]}>
              <View style={styles.alertHeader}>
                <View style={[
                  styles.alertBadge,
                  { 
                    backgroundColor: currentAlert.alertType === 'urgent' ? '#EF4444' : 
                                   currentAlert.alertType === 'warning' ? '#F59E0B' : '#10B981'
                  }
                ]}>
                  <Text style={styles.alertSteps}>
                    {currentAlert.detection.steps} {currentAlert.detection.steps === 1 ? 'STEP' : 'STEPS'}
                  </Text>
                </View>
                {currentAlert.alertType === 'urgent' && (
                  <View style={styles.urgentIndicator}>
                    <AlertTriangle size={20} color="#EF4444" />
                  </View>
                )}
              </View>
              
              <Text style={styles.alertMessage}>{currentAlert.message}</Text>
              
              <View style={styles.alertMeta}>
                <Text style={styles.alertConfidence}>
                  {Math.round(currentAlert.detection.confidence * 100)}% confident
                </Text>
                {currentAlert.detection.isMoving && (
                  <View style={styles.movingContainer}>
                    <Activity size={14} color="#F59E0B" />
                    <Text style={styles.movingIndicator}>MOVING</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Enhanced Detection Stats */}
          {isActive && (
            <View style={styles.statsDisplay}>
              <Text style={styles.statsText}>
                AI Status: {detectionStats.aiStatus.toUpperCase()} | 
                Alerts: {detectionStats.filtered} | 
                Platform: {Platform.OS}
              </Text>
            </View>
          )}
        </CameraView>

        {/* Enhanced Control Panel */}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  aiIcon: {
    marginLeft: 4,
  },
  statusInfo: {
    alignItems: 'flex-end',
  },
  stepInfo: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  platformInfo: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
  focusIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -70 }, { translateY: -70 }],
    alignItems: 'center',
  },
  focusZone: {
    width: 140,
    height: 140,
    borderWidth: 2,
    borderRadius: 70,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  focusIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  focusText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertDisplay: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  alertSteps: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  urgentIndicator: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  alertMessage: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertConfidence: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  movingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movingIndicator: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statsDisplay: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  statsText: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
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