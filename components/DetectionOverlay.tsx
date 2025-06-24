import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Detection } from '@/services/DetectionService';

interface DetectionOverlayProps {
  detections: Detection[];
}

const { width, height } = Dimensions.get('window');

export function DetectionOverlay({ detections }: DetectionOverlayProps) {
  if (detections.length === 0) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      {detections.map((detection) => {
        const isUrgent = detection.steps <= 2;
        const isWarning = detection.steps <= 4 && detection.steps > 2;
        const isSafe = detection.steps > 4;
        
        let borderColor = '#10B981'; // Safe - green
        if (isWarning) borderColor = '#F59E0B'; // Warning - orange
        if (isUrgent) borderColor = '#EF4444'; // Urgent - red

        return (
          <View
            key={detection.id}
            style={[
              styles.detectionBox,
              {
                left: detection.x * width - (detection.width * width) / 2,
                top: detection.y * height - (detection.height * height) / 2,
                width: detection.width * width,
                height: detection.height * height,
                borderColor,
                borderWidth: isUrgent ? 3 : 2,
              },
            ]}
          >
            <View style={[styles.labelContainer, { backgroundColor: borderColor }]}>
              <Text style={styles.labelText}>{detection.label}</Text>
              <Text style={styles.stepText}>
                {detection.steps} {detection.steps === 1 ? 'step' : 'steps'}
              </Text>
              {detection.isMoving && (
                <Text style={styles.movingText}>MOVING</Text>
              )}
            </View>
            
            {/* Priority indicator */}
            <View style={[styles.priorityIndicator, { backgroundColor: borderColor }]} />
            
            {/* Confidence indicator */}
            <View style={styles.confidenceBar}>
              <View 
                style={[
                  styles.confidenceFill, 
                  { 
                    width: `${detection.confidence * 100}%`,
                    backgroundColor: borderColor 
                  }
                ]} 
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  detectionBox: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  labelContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 90,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.9,
  },
  movingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  priorityIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  confidenceBar: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});