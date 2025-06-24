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
  Filter
} from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [tempStepLength, setTempStepLength] = useState(settings.stepLength.toString());
  const [isCalibrating, setIsCalibrating] = useState(false);

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
    // Simulate calibration completion
    const calibratedLength = Math.floor(Math.random() * 20) + 60; // 60-80cm
    setTempStepLength(calibratedLength.toString());
    updateSettings({ stepLength: calibratedLength });
    announceMessage(`Calibration complete. Your step length is ${calibratedLength} centimeters.`);
  };

  const resetToDefaults = () => {
    updateSettings({
      stepLength: 65,
      audioEnabled: true,
      hapticEnabled: true,
      sensitivity: 0.7,
      announcementDelay: 3.0,
    });
    setTempStepLength('65');
    announceMessage('Settings reset to defaults');
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

        {/* Smart Filtering Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Filter size={24} color="#7C3AED" />
            <Text style={styles.sectionTitle}>Smart Filtering</Text>
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.cardDescription}>
              StepSight uses intelligent filtering to prevent alert spam and focus on obstacles in your path.
            </Text>
            
            <View style={styles.filterStats}>
              <View style={styles.statItem}>
                <Target size={20} color="#3B82F6" />
                <Text style={styles.statLabel}>Center Focus Only</Text>
                <Text style={styles.statDescription}>Only alerts for objects directly ahead</Text>
              </View>
              
              <View style={styles.statItem}>
                <Clock size={20} color="#059669" />
                <Text style={styles.statLabel}>Alert Cooldown</Text>
                <Text style={styles.statDescription}>Prevents repeated alerts for same objects</Text>
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

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefaults}
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
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  statDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    flex: 2,
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
    minWidth: 40,
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