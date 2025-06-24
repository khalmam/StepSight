import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { BookOpen, Play, Camera, Volume2, Zap, Settings, CircleCheck as CheckCircle, ArrowRight, ArrowLeft, Chrome as Home } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const tutorialSteps = [
  {
    id: 1,
    title: 'Welcome to StepSight',
    icon: BookOpen,
    description: 'StepSight helps visually impaired users navigate by detecting obstacles and announcing their distance in walking steps.',
    details: [
      'Point your phone camera forward while walking',
      'Listen for audio announcements about obstacles',
      'Feel vibrations when objects are very close',
      'Customize settings for your personal needs'
    ]
  },
  {
    id: 2,
    title: 'Camera Navigation',
    icon: Camera,
    description: 'The main screen uses your camera to scan for obstacles in real-time.',
    details: [
      'Tap START to begin obstacle detection',
      'Hold your phone at chest level, pointing forward',
      'The camera will automatically scan your path',
      'Green indicators show detected obstacles',
      'Distance is announced in walking steps'
    ]
  },
  {
    id: 3,
    title: 'Audio Announcements',
    icon: Volume2,
    description: 'StepSight speaks obstacle information to help you navigate safely.',
    details: [
      'Obstacles are announced as "Object ahead in X steps"',
      'Closer objects are announced more frequently',
      'You can disable audio in settings if needed',
      'Use headphones or external speakers for better audio'
    ]
  },
  {
    id: 4,
    title: 'Haptic Feedback',
    icon: Zap,
    description: 'Your phone vibrates when obstacles are dangerously close.',
    details: [
      'Vibration occurs when objects are 1-2 steps away',
      'Different patterns indicate obstacle proximity',
      'Can be disabled in settings if not needed',
      'Works alongside audio announcements'
    ]
  },
  {
    id: 5,
    title: 'Settings & Calibration',
    icon: Settings,
    description: 'Customize StepSight for your walking style and preferences.',
    details: [
      'Calibrate your step length for accurate distance',
      'Walk 10 normal steps during calibration',
      'Adjust audio and haptic feedback settings',
      'Fine-tune detection sensitivity if needed'
    ]
  }
];

export default function TutorialScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const speakText = (text: string) => {
    if (audioEnabled) {
      Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.8,
      });
    }
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      speakText(`Step ${newStep + 1}: ${tutorialSteps[newStep].title}`);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      speakText(`Step ${newStep + 1}: ${tutorialSteps[newStep].title}`);
    }
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    speakText(!audioEnabled ? 'Tutorial audio enabled' : 'Tutorial audio disabled');
  };

  const speakCurrentStep = () => {
    const step = tutorialSteps[currentStep];
    const fullText = `${step.title}. ${step.description}. ${step.details.join('. ')}`;
    speakText(fullText);
  };

  const current = tutorialSteps[currentStep];
  const IconComponent = current.icon;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <BookOpen size={32} color="#3B82F6" />
          <Text style={styles.title}>StepSight Tutorial</Text>
          <Text style={styles.subtitle}>Learn how to use StepSight effectively</Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {tutorialSteps.length}
          </Text>
        </View>

        {/* Tutorial Step */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.iconContainer}>
              <IconComponent size={48} color="#3B82F6" />
            </View>
            <Text style={styles.stepTitle}>{current.title}</Text>
          </View>

          <Text style={styles.stepDescription}>{current.description}</Text>

          <View style={styles.detailsList}>
            {current.details.map((detail, index) => (
              <View key={index} style={styles.detailItem}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.detailText}>{detail}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Audio Control */}
        <TouchableOpacity
          style={styles.audioButton}
          onPress={speakCurrentStep}
          accessibilityLabel="Read current step aloud"
        >
          <Play size={20} color="#FFFFFF" />
          <Text style={styles.audioButtonText}>Read This Step Aloud</Text>
        </TouchableOpacity>

        {/* Navigation Controls */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
            onPress={prevStep}
            disabled={currentStep === 0}
            accessibilityLabel="Previous step"
          >
            <ArrowLeft size={20} color={currentStep === 0 ? '#6B7280' : '#FFFFFF'} />
            <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.audioToggle}
            onPress={toggleAudio}
            accessibilityLabel={audioEnabled ? 'Disable tutorial audio' : 'Enable tutorial audio'}
          >
            <Volume2 
              size={20} 
              color={audioEnabled ? '#FFFFFF' : '#6B7280'} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentStep === tutorialSteps.length - 1 && styles.navButtonComplete]}
            onPress={nextStep}
            disabled={currentStep === tutorialSteps.length - 1}
            accessibilityLabel={currentStep === tutorialSteps.length - 1 ? 'Tutorial complete' : 'Next step'}
          >
            <Text style={styles.navButtonText}>
              {currentStep === tutorialSteps.length - 1 ? 'Complete' : 'Next'}
            </Text>
            {currentStep === tutorialSteps.length - 1 ? (
              <Home size={20} color="#FFFFFF" />
            ) : (
              <ArrowRight size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Quick Tips</Text>
          <Text style={styles.tipText}>• Use headphones for better audio clarity</Text>
          <Text style={styles.tipText}>• Keep your phone steady while scanning</Text>
          <Text style={styles.tipText}>• Calibrate step length for best results</Text>
          <Text style={styles.tipText}>• Practice in familiar spaces first</Text>
        </View>
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
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepContainer: {
    backgroundColor: '#1F2937',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#374151',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  detailsList: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 22,
    marginLeft: 12,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  audioButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#374151',
  },
  navButtonComplete: {
    backgroundColor: '#10B981',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  navButtonTextDisabled: {
    color: '#6B7280',
  },
  audioToggle: {
    backgroundColor: '#374151',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsContainer: {
    backgroundColor: '#1F2937',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 8,
  },
});