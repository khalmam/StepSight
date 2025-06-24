export interface Detection {
  id: string;
  label: string;
  confidence: number;
  distance: number; // in meters
  steps: number;
  x: number; // 0-1 normalized position
  y: number; // 0-1 normalized position
  width: number;
  height: number;
  timestamp: number;
  isMoving?: boolean;
  velocity?: number; // m/s
}

export interface ProcessedAlert {
  detection: Detection;
  priority: number;
  shouldAnnounce: boolean;
  shouldVibrate: boolean;
  message: string;
  suppressUntil?: number;
}

export class DetectionService {
  private stepLength = 65; // centimeters
  private lastAlerts: Map<string, number> = new Map(); // object type -> last alert time
  private lastPositions: Map<string, { x: number; y: number; time: number }> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  
  // Configuration
  private readonly CENTER_FOV_THRESHOLD = 0.35; // 35% from center (70% total width)
  private readonly ALERT_COOLDOWN_MS = 3000; // 3 seconds between same object type alerts
  private readonly POSITION_CHANGE_THRESHOLD = 0.1; // 10% screen movement to trigger new alert
  private readonly CLUSTER_DISTANCE_THRESHOLD = 1; // 1 step difference for clustering
  
  // Mock objects for simulation
  private mockObjects = [
    'wall', 'person', 'chair', 'table', 'door', 'pole', 'car', 'tree', 'bench', 'trash can'
  ];

  constructor(stepLength: number = 65) {
    this.stepLength = stepLength;
  }

  updateStepLength(length: number) {
    this.stepLength = length;
  }

  // Main processing function with intelligent filtering
  processDetections(): ProcessedAlert[] {
    const rawDetections = this.simulateDetection();
    const centerDetections = this.filterCenterFOV(rawDetections);
    const clusteredDetections = this.clusterNearbyObjects(centerDetections);
    const prioritizedDetections = this.prioritizeDetections(clusteredDetections);
    const filteredAlerts = this.applyAlertFiltering(prioritizedDetections);
    
    return filteredAlerts;
  }

  // Filter to only include objects in center field of view
  private filterCenterFOV(detections: Detection[]): Detection[] {
    return detections.filter(detection => {
      const centerX = 0.5;
      const distanceFromCenter = Math.abs(detection.x - centerX);
      return distanceFromCenter <= this.CENTER_FOV_THRESHOLD;
    });
  }

  // Group nearby objects to prevent spam
  private clusterNearbyObjects(detections: Detection[]): Detection[] {
    if (detections.length <= 1) return detections;

    const clusters: Detection[][] = [];
    const processed = new Set<string>();

    for (const detection of detections) {
      if (processed.has(detection.id)) continue;

      const cluster = [detection];
      processed.add(detection.id);

      // Find nearby objects
      for (const other of detections) {
        if (processed.has(other.id)) continue;
        
        const stepDiff = Math.abs(detection.steps - other.steps);
        const positionDiff = Math.abs(detection.x - other.x);
        
        if (stepDiff <= this.CLUSTER_DISTANCE_THRESHOLD && positionDiff <= 0.2) {
          cluster.push(other);
          processed.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    // Convert clusters to single detections
    return clusters.map(cluster => {
      if (cluster.length === 1) {
        return cluster[0];
      }

      // Create clustered detection
      const closest = cluster.reduce((prev, curr) => 
        curr.steps < prev.steps ? curr : prev
      );

      return {
        ...closest,
        id: `cluster_${cluster.length}_${closest.steps}`,
        label: cluster.length > 2 ? 'multiple objects' : `${cluster[0].label} and ${cluster[1].label}`,
        confidence: Math.max(...cluster.map(d => d.confidence)),
      };
    });
  }

  // Prioritize detections based on distance, movement, and criticality
  private prioritizeDetections(detections: Detection[]): Detection[] {
    return detections
      .map(detection => ({
        ...detection,
        priority: this.calculatePriority(detection)
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  private calculatePriority(detection: Detection): number {
    let priority = 0;

    // Distance priority (closer = higher priority)
    priority += Math.max(0, 10 - detection.steps);

    // Center position bonus
    const centerDistance = Math.abs(detection.x - 0.5);
    priority += (1 - centerDistance) * 5;

    // Moving object bonus
    if (detection.isMoving) {
      priority += 8;
    }

    // Critical object types
    const criticalObjects = ['person', 'car', 'door'];
    if (criticalObjects.includes(detection.label)) {
      priority += 5;
    }

    // Confidence bonus
    priority += detection.confidence * 3;

    return priority;
  }

  // Apply intelligent alert filtering and cooldowns
  private applyAlertFiltering(detections: Detection[]): ProcessedAlert[] {
    const now = Date.now();
    const alerts: ProcessedAlert[] = [];

    // Only process the highest priority detection to avoid overlap
    const topDetection = detections[0];
    if (!topDetection) return alerts;

    const objectType = topDetection.label;
    const lastAlertTime = this.lastAlerts.get(objectType) || 0;
    const timeSinceLastAlert = now - lastAlertTime;

    // Check if we should suppress this alert
    const shouldSuppress = this.shouldSuppressAlert(topDetection, timeSinceLastAlert);

    if (!shouldSuppress) {
      const alert = this.createAlert(topDetection);
      alerts.push(alert);
      
      // Update tracking
      this.lastAlerts.set(objectType, now);
      this.lastPositions.set(topDetection.id, {
        x: topDetection.x,
        y: topDetection.y,
        time: now
      });
    }

    return alerts;
  }

  private shouldSuppressAlert(detection: Detection, timeSinceLastAlert: number): boolean {
    // Always alert for very close objects
    if (detection.steps <= 1) {
      return false;
    }

    // Check cooldown period
    if (timeSinceLastAlert < this.ALERT_COOLDOWN_MS) {
      return true;
    }

    // Check if object has moved significantly
    const lastPosition = this.lastPositions.get(detection.id);
    if (lastPosition) {
      const positionChange = Math.sqrt(
        Math.pow(detection.x - lastPosition.x, 2) + 
        Math.pow(detection.y - lastPosition.y, 2)
      );
      
      if (positionChange < this.POSITION_CHANGE_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  private createAlert(detection: Detection): ProcessedAlert {
    const shouldVibrate = detection.steps <= 2;
    const shouldAnnounce = detection.steps <= 6;

    let message = '';
    if (detection.label.includes('multiple')) {
      message = `${detection.label} ahead in ${detection.steps} ${detection.steps === 1 ? 'step' : 'steps'}`;
    } else {
      message = `${detection.label} ahead in ${detection.steps} ${detection.steps === 1 ? 'step' : 'steps'}`;
    }

    // Add urgency indicators for very close objects
    if (detection.steps === 1) {
      message = `Warning! ${message}`;
    }

    return {
      detection,
      priority: this.calculatePriority(detection),
      shouldAnnounce,
      shouldVibrate,
      message,
      suppressUntil: detection.steps > 2 ? Date.now() + this.ALERT_COOLDOWN_MS : undefined
    };
  }

  // Simulate real-time object detection with movement tracking
  simulateDetection(): Detection[] {
    const numObjects = Math.floor(Math.random() * 3) + 1; // 1-3 objects
    const detections: Detection[] = [];
    const now = Date.now();

    for (let i = 0; i < numObjects; i++) {
      const detection = this.generateRandomDetection(now);
      detections.push(detection);
    }

    return detections;
  }

  private generateRandomDetection(timestamp: number): Detection {
    const label = this.mockObjects[Math.floor(Math.random() * this.mockObjects.length)];
    const distance = Math.random() * 5 + 0.5; // 0.5 to 5.5 meters
    const steps = this.metersToSteps(distance);
    
    // Simulate movement for some objects
    const isMoving = Math.random() < 0.3; // 30% chance of movement
    const velocity = isMoving ? Math.random() * 2 : 0; // 0-2 m/s
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      label,
      confidence: 0.7 + Math.random() * 0.3, // 0.7 to 1.0
      distance,
      steps,
      x: Math.random() * 0.8 + 0.1, // 10% to 90% across screen
      y: Math.random() * 0.6 + 0.2, // 20% to 80% down screen
      width: Math.random() * 0.3 + 0.1, // 10% to 40% of screen width
      height: Math.random() * 0.4 + 0.2, // 20% to 60% of screen height
      timestamp,
      isMoving,
      velocity,
    };
  }

  private metersToSteps(meters: number): number {
    const stepLengthMeters = this.stepLength / 100; // convert cm to meters
    return Math.ceil(meters / stepLengthMeters);
  }

  // Clear old tracking data periodically
  clearOldTrackingData() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds

    for (const [key, time] of this.lastAlerts.entries()) {
      if (now - time > maxAge) {
        this.lastAlerts.delete(key);
      }
    }

    for (const [key, data] of this.lastPositions.entries()) {
      if (now - data.time > maxAge) {
        this.lastPositions.delete(key);
      }
    }
  }

  // Process real camera frame (would integrate with ML model)
  async processFrame(frameData: any): Promise<ProcessedAlert[]> {
    // In a real implementation, this would:
    // 1. Run object detection model (YOLOv8, MobileNet, etc.)
    // 2. Run depth estimation (MiDaS, ARKit, ARCore)
    // 3. Convert distances to steps
    // 4. Apply intelligent filtering
    
    // For now, return processed simulated data
    return this.processDetections();
  }
}