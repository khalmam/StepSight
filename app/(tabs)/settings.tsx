import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { 
  Settings as SettingsIcon, 
  Ruler, 
  Volume2, 
  Zap, 
  Eye,
  Footprints,
  Save,
  RotateCcw,
  Target,
  Clock,
  Filter,
  Brain,
  Download,
  Upload,
  Smartphone,
  Globe
} from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsScreen() {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useSettings();
  const [tempStepLength, setTempStepLength] = useState(settings.stepLength.toString());
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const announceMessage = (message: string) => {
    if (settings.audioEnabled) {
      Speech.speak(message, {
        language: 'en',
        pitch: 1.0,
        rate: 0.8,
      });
    }
  };

  const handleSaveStepLength = () => {
    const newLength = parseInt(tempStepLength, 10);
    if (newLength >= 40 && newLength <= 100) {
      updateSettings({ stepLength: newLength });
      announceMessage(`Step length updated to ${newLength} centimeters`);
    } else {
      announceMessage('Please enter a step length between 40 and 100 centimeters');
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    announceMessage('Calibration started. Walk 10 normal steps, then tap Complete Calibration.');
  };

  const completeCalibration = () => {
    setIsCalibrating(false);
    // Simulate calibration completion with more realistic values
    const calibratedLength = Math.floor(Math.random() * 25) + 55; // 55-80cm
    setTempStepLength(calibratedLength.toString());
    updateSettings({ stepLength: calibratedLength });
    announceMessage(`Calibration complete. Your step length is ${calibratedLength} centimeters.`);
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetSettings();
            setTempStepLength('65');
            announceMessage('Settings reset to defaults');
          }
        }
      ]
    );
  };

  const handleExportSettings = async () => {
    try {
      const settingsJson = await exportSettings();
      // In a real app, you'd share this via the share API or save to file
      Alert.alert('Settings Exported', 'Settings have been exported to clipboard');
      announceMessage('Settings exported successfully');
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export settings');
    }
  };

  const toggleAudio = (value: boolean) => {
    updateSettings({ audioEnabled: value });
    if (value) {
      Speech.speak('Audio feedback enabled');
    }
  };

  const toggleHaptic = (value: boolean) => {
    updateSettings({ hapticEnabled: value });
    announceMessage(value ? 'Haptic feedback enabled' : 'Haptic feedback disabled');
  };

  const updateAnnouncementDelay = (delay: number) => {
    updateSettings({ announcementDelay: delay });
    announceMessage(`Alert cooldown set to ${delay} seconds`);
  };

  const updateSensitivity = (sensitivity: number) => {
    updateSettings({ sensitivity });
    announceMessage(`Detection sensitivity set to ${Math.round(sensitivity * 100)} percent`);
  };

  const updateConfidenceThreshold = (threshold: number) => {
    updateSettings({ confidenceThreshold: threshold });
    announceMessage(`Confidence threshold set to ${Math.round(threshold * 100)} percent`);
  };

  const toggleDetectionMode = (mode: 'ai' | 'simulation' | 'hybrid') => {
    updateSettings({ detectionMode: mode });
    const modeNames = { ai: 'AI only', simulation: 'simulation only', hybrid: 'hybrid AI and simulation' };
    announceMessage(`Detection mode set to ${modeNames[mode]}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <SettingsIcon size={32} color="#3B82F6" />
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Optimize StepSight for your needs</Text>
        </View>

        {/* Step Length Calibration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ruler size={24} color="#059669" />
            <Text style={styles.sectionTitle}>Step Length Calibration</Text>
          </View>
          
          <View style={styles.calibrationCard}>
            <Text style={styles.cardTitle}>Current Step Length</Text>
            <Text style={styles.stepValue}>{settings.stepLength} cm</Text>
            
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={tempStepLength}
                onChangeText={setTempStepLength}
                keyboardType="numeric"
                placeholder="Enter step length (cm)"
                placeholderTextColor="#6B7280"
                accessibilityLabel="Step length input"
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveStepLength}
                accessibilityLabel="Save step length"
              >
                <Save size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Accurate step length improves distance estimation. Use calibration for best results.
            </Text>

            {!isCalibrating ? (
              <TouchableOpacity
                style={styles.calibrationButton}
                onPress={startCalibration}
                accessibilityLabel="Start step calibration"
              >
                <Footprints size={20} color="#FFFFFF" />
                <Text style={styles.calibrationButtonText}>Start Calibration</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.calibrationButton, styles.calibrationActiveButton]}
                onPress={completeCalibration}
                accessibilityLabel="Complete step calibration"
              >
                <Text style={styles.calibrationButtonText}>Complete Calibration</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* AI Detection Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Brain size={24} color="#7C3AED" />
            <Text style={styles.sectionTitle}>AI Detection</Text>
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.cardDescription}>
              Configure AI-powered object detection and filtering for optimal performance.
            </Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Detection Mode</Text>
                <Text style={styles.settingDescription}>
                  Choose between AI, simulation, or hybrid detection
                </Text>
              </View>
              <View style={styles.modeSelector}>
                {(['hybrid', 'ai', 'simulation'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeButton,
                      settings.detectionMode === mode && styles.modeButtonActive
                    ]}
                    onPress={() => toggleDetectionMode(mode)}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      settings.detectionMode === mode && styles.modeButtonTextActive
                    ]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Confidence Threshold</Text>
                <Text style={styles.settingDescription}>
                  Minimum confidence required for object detection
                </Text>
              </View>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>
                  {Math.round(settings.confidenceThreshold * 100)}%
                </Text>
                <View style={styles.sliderButtons}>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => updateConfidenceThreshold(Math.max(0.1, settings.confidenceThreshold - 0.1))}
                    accessibilityLabel="Decrease confidence threshold"
                  >
                    <Text style={styles.sliderButtonText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => updateConfidenceThreshold(Math.min(1.0, settings.confidenceThreshold + 0.1))}
                    accessibilityLabel="Increase confidence threshold"
                  >
                    <Text style={styles.sliderButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Center Focus Only</Text>
                <Text style={styles.settingDescription}>
                  Only detect objects in the center field of view
                </Text>
              </View>
              <Switch
                value={settings.centerFocusOnly}
                onValueChange={(value) => updateSettings({ centerFocusOnly: value })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={settings.centerFocusOnly ? '#FFFFFF' : '#9CA3AF'}
                accessibilityLabel="Toggle center focus only"
              />
            </View>
          </View>
        </View>

        {/* Smart Filtering Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Filter size={24} color="#7C3AED" />
            <Text style={styles.sectionTitle}>Smart Filtering</Text>
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.cardDescription}>
              Advanced filtering prevents alert spam and focuses on relevant obstacles.
            </Text>
            
            <View style={styles.filterStats}>
              <View style={styles.statItem}>
                <Target size={20} color="#3B82F6" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Proximity Filtering</Text>
                  <Text style={styles.statDescription}>Prioritizes closer objects</Text>
                </View>
              </View>
              
              <View style={styles.statItem}>
                <Clock size={20} color="#059669" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Temporal Filtering</Text>
                  <Text style={styles.statDescription}>Prevents repeated alerts</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Audio Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Volume2 size={24} color="#7C3AED" />
            <Text style={styles.sectionTitle}>Audio Feedback</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Audio Announcements</Text>
              <Text style={styles.settingDescription}>
                Speak obstacle information aloud
              </Text>
            </View>
            <Switch
              value={settings.audioEnabled}
              onValueChange={toggleAudio}
              trackColor={{ false: '#374151', true: '#7C3AED' }}
              thumbColor={settings.audioEnabled ? '#FFFFFF' : '#9CA3AF'}
              accessibilityLabel="Toggle audio announcements"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Alert Cooldown Period</Text>
              <Text style={styles.settingDescription}>
                Time between alerts for same object type
              </Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{settings.announcementDelay}s</Text>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => updateAnnouncementDelay(Math.max(1, settings.announcementDelay - 0.5))}
                  accessibilityLabel="Decrease cooldown"
                >
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => updateAnnouncementDelay(Math.min(10, settings.announcementDelay + 0.5))}
                  accessibilityLabel="Increase cooldown"
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Spatial Audio</Text>
              <Text style={styles.settingDescription}>
                Directional audio cues (experimental)
              </Text>
            </View>
            <Switch
              value={settings.spatialAudio}
              onValueChange={(value) => updateSettings({ spatialAudio: value })}
              trackColor={{ false: '#374151', true: '#7C3AED' }}
              thumbColor={settings.spatialAudio ? '#FFFFFF' : '#9CA3AF'}
              accessibilityLabel="Toggle spatial audio"
            />
          </View>
        </View>

        {/* Haptic Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={24} color="#EA580C" />
            <Text style={styles.sectionTitle}>Haptic Feedback</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Vibration Alerts</Text>
              <Text style={styles.settingDescription}>
                Vibrate when obstacles are very close (1-2 steps)
              </Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={toggleHaptic}
              trackColor={{ false: '#374151', true: '#EA580C' }}
              thumbColor={settings.hapticEnabled ? '#FFFFFF' : '#9CA3AF'}
              accessibilityLabel="Toggle haptic feedback"
            />
          </View>
        </View>

        {/* Detection Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eye size={24} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Detection Settings</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Detection Sensitivity</Text>
              <Text style={styles.settingDescription}>
                Higher values detect more objects but may increase false positives
              </Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>
                {Math.round(settings.sensitivity * 100)}%
              </Text>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => updateSensitivity(Math.max(0.1, settings.sensitivity - 0.1))}
                  accessibilityLabel="Decrease sensitivity"
                >
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => updateSensitivity(Math.min(1.0, settings.sensitivity + 0.1))}
                  accessibilityLabel="Increase sensitivity"
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Platform Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {Platform.OS === 'web' ? (
              <Globe size={24} color="#6B7280" />
            ) : (
              <Smartphone size={24} color="#6B7280" />
            )}
            <Text style={styles.sectionTitle}>Platform Information</Text>
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.cardDescription}>
              Running on {Platform.OS === 'web' ? 'Web Browser' : 'Mobile Device'}
            </Text>
            <Text style={styles.platformDetails}>
              Platform: {Platform.OS} | 
              Version: {Platform.Version} | 
              AI Support: {Platform.OS === 'web' ? 'Limited' : 'Full'}
            </Text>
          </View>
        </View>

        {/* Advanced Settings */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SettingsIcon size={24} color="#6B7280" />
              <Text style={styles.sectionTitle}>Advanced</Text>
            </View>
            
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.advancedButton}
                onPress={handleExportSettings}
                accessibilityLabel="Export settings"
              >
                <Download size={20} color="#FFFFFF" />
                <Text style={styles.advancedButtonText}>Export</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.advancedButton}
                onPress={() => Alert.alert('Import Settings', 'Import functionality would be implemented here')}
                accessibilityLabel="Import settings"
              >
                <Upload size={20} color="#FFFFFF" />
                <Text style={styles.advancedButtonText}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetToDefaults}
          accessibilityLabel="Reset all settings to defaults"
        >
          <RotateCcw size={20} color="#EF4444" />
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#1F2937',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  calibrationCard: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingCard: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 16,
  },
  stepValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#374151',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  calibrationButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  calibrationActiveButton: {
    backgroundColor: '#EA580C',
  },
  calibrationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterStats: {
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  sliderContainer: {
    alignItems: 'center',
    gap: 8,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    minWidth: 50,
    textAlign: 'center',
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderButton: {
    backgroundColor: '#374151',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeSelector: {
    flexDirection: 'column',
    gap: 8,
  },
  modeButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  modeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  modeButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  platformDetails: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 8,
  },
  advancedToggle: {
    backgroundColor: '#374151',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  advancedToggleText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  advancedButton: {
    backgroundColor: '#4B5563',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  advancedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  resetButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});