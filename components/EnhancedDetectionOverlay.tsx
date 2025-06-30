import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Detection } from "@/services/AIDetectionService";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

interface EnhancedDetectionOverlayProps {
  detections: Detection[];
  alertType?: "urgent" | "warning" | "info";
}

interface AnimatedDetectionBoxProps {
  detection: Detection;
  alertType: "urgent" | "warning" | "info";
}

const { width, height } = Dimensions.get("window");

function AnimatedDetectionBox({
  detection,
  alertType,
}: AnimatedDetectionBoxProps) {
  const pulseAnimation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);

  React.useEffect(() => {
    const isUrgent = alertType === "urgent";

    if (isUrgent) {
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 500, easing: Easing.linear }), // <-- CHANGE THIS LINE
        -1,
        true
      );
    } else {
      pulseAnimation.value = withTiming(0, { duration: 300 });
    }

    glowAnimation.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }), // <-- CHANGE THIS LINE
      -1,
      true
    );
  }, [alertType]);

  const isUrgent = detection.steps <= 1;
  const isWarning = detection.steps <= 3 && detection.steps > 1;
  const isSafe = detection.steps > 3;

  let borderColor = "#10B981"; // Safe - green
  let backgroundColor = "rgba(16, 185, 129, 0.1)";

  if (isWarning) {
    borderColor = "#F59E0B"; // Warning - orange
    backgroundColor = "rgba(245, 158, 11, 0.1)";
  }
  if (isUrgent) {
    borderColor = "#EF4444"; // Urgent - red
    backgroundColor = "rgba(239, 68, 68, 0.15)";
  }

  const animatedStyle = useAnimatedStyle(() => {
    const pulse = interpolate(pulseAnimation.value, [0, 1], [1, 1.1]);
    const glow = interpolate(glowAnimation.value, [0, 1], [0.7, 1]);

    return {
      transform: [{ scale: isUrgent ? pulse : 1 }],
      opacity: glow,
    };
  });

  return (
    <Animated.View
      style={[
        styles.detectionBox,
        animatedStyle,
        {
          left: detection.x * width - (detection.width * width) / 2,
          top: detection.y * height - (detection.height * height) / 2,
          width: detection.width * width,
          height: detection.height * height,
          borderColor,
          backgroundColor,
          borderWidth: isUrgent ? 4 : isWarning ? 3 : 2,
          shadowColor: borderColor,
          shadowOpacity: isUrgent ? 0.8 : 0.4,
          shadowRadius: isUrgent ? 15 : 8,
          elevation: isUrgent ? 10 : 5,
        },
      ]}
    >
      {/* Enhanced Label Container */}
      <View style={[styles.labelContainer, { backgroundColor: borderColor }]}>
        <Text style={styles.labelText}>{detection.label.toUpperCase()}</Text>
        <View style={styles.stepContainer}>
          <Text style={styles.stepText}>
            {detection.steps} {detection.steps === 1 ? "STEP" : "STEPS"}
          </Text>
          {detection.isMoving && (
            <View style={styles.movingIndicator}>
              <Text style={styles.movingText}>●</Text>
            </View>
          )}
        </View>

        {/* Distance indicator */}
        <Text style={styles.distanceText}>
          {detection.distance.toFixed(1)}m
        </Text>
      </View>

      {/* Priority indicator with enhanced styling */}
      <View
        style={[
          styles.priorityIndicator,
          {
            backgroundColor: borderColor,
            shadowColor: borderColor,
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 3,
          },
        ]}
      >
        {isUrgent && <Text style={styles.priorityText}>!</Text>}
      </View>

      {/* Enhanced confidence bar */}
      <View style={styles.confidenceContainer}>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              {
                width: `${detection.confidence * 100}%`,
                backgroundColor: borderColor,
              },
            ]}
          />
        </View>
        <Text style={styles.confidenceText}>
          {Math.round(detection.confidence * 100)}%
        </Text>
      </View>

      {/* Movement indicator */}
      {detection.isMoving && (
        <View style={[styles.movementIndicator, { borderColor }]}>
          <Text style={[styles.movementText, { color: borderColor }]}>
            {detection.velocity
              ? `${detection.velocity.toFixed(1)} m/s`
              : "MOVING"}
          </Text>
        </View>
      )}

      {/* Center focus indicator */}
      {Math.abs(detection.x - 0.5) <= 0.15 && (
        <View style={styles.centerIndicator}>
          <Text style={styles.centerText}>CENTER</Text>
        </View>
      )}
    </Animated.View>
  );
}

export function EnhancedDetectionOverlay({
  detections,
  alertType = "info",
}: EnhancedDetectionOverlayProps) {
  const urgentOverlayPulse = useSharedValue(0);

  React.useEffect(() => {
    if (alertType === "urgent") {
      urgentOverlayPulse.value = withRepeat(
        withTiming(1, { duration: 500, easing: Easing.linear }), // <-- CHANGE THIS LINE
        -1,
        true
      );
    } else {
      urgentOverlayPulse.value = withTiming(0, { duration: 300 });
    }
  }, [alertType]);

  const urgentOverlayStyle = useAnimatedStyle(() => {
    const pulse = interpolate(urgentOverlayPulse.value, [0, 1], [1, 1.05]);
    return {
      transform: [{ scale: pulse }],
    };
  });

  if (detections.length === 0) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      {detections.map((detection) => (
        <AnimatedDetectionBox
          key={detection.id}
          detection={detection}
          alertType={alertType}
        />
      ))}

      {/* Global alert overlay for urgent situations */}
      {alertType === "urgent" && (
        <Animated.View style={[styles.urgentOverlay, urgentOverlayStyle]}>
          <Text style={styles.urgentText}>OBSTACLE DETECTED</Text>
          <Text style={styles.urgentSubtext}>STOP IMMEDIATELY</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  detectionBox: {
    position: "absolute",
    borderRadius: 12,
    borderStyle: "solid",
  },
  labelContainer: {
    position: "absolute",
    top: -70,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  stepText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  movingIndicator: {
    marginLeft: 6,
  },
  movingText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  distanceText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
    opacity: 0.9,
  },
  priorityIndicator: {
    position: "absolute",
    top: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  confidenceContainer: {
    position: "absolute",
    bottom: -25,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    marginRight: 8,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 2,
  },
  confidenceText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  movementIndicator: {
    position: "absolute",
    top: -8,
    left: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  movementText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  centerIndicator: {
    position: "absolute",
    bottom: -8,
    left: "50%",
    transform: [{ translateX: -20 }],
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  centerText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  urgentOverlay: {
    position: "absolute",
    top: "40%",
    left: 20,
    right: 20,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 15,
  },
  urgentText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
  },
  urgentSubtext: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.9,
  },
});
