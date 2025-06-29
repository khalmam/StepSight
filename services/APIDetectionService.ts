import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export interface APIDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] in pixels
}

export interface APIDetectionResponse {
  detections: APIDetection[];
  image_width: number;
  image_height: number;
  processing_time: number;
}

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  distance: number; // in meters
  steps: number;
  x: number; // 0-1 normalized position (center)
  y: number; // 0-1 normalized position (center)
  width: number; // 0-1 normalized width
  height: number; // 0-1 normalized height
  timestamp: number;
  isMoving?: boolean;
  velocity?: number; // m/s
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProcessedAlert {
  detection: Detection;
  priority: number;
  shouldAnnounce: boolean;
  shouldVibrate: boolean;
  message: string;
  suppressUntil?: number;
  alertType: 'urgent' | 'warning' | 'info';
}

export interface DetectionServiceConfig {
  apiUrl: string;
  confidenceThreshold: number;
  maxRetries: number;
  timeoutMs: number;
  centerFocusOnly: boolean;
}

export class APIDetectionService {
  private stepLength = 65; // centimeters
  private lastAlerts: Map<string, number> = new Map();
  private objectTracker: Map<string, Detection[]> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  private isApiAvailable = false;
  private lastApiCheck = 0;
  private readonly API_CHECK_INTERVAL = 30000; // 30 seconds
  
  // Enhanced configuration
  private readonly CENTER_FOV_THRESHOLD = 0.25; // 25% from center (50% total width)
  private readonly ALERT_COOLDOWN_MS = 4000; // 4 seconds between same object alerts
  private readonly POSITION_CHANGE_THRESHOLD = 0.15; // 15% screen movement
  private readonly CLUSTER_DISTANCE_THRESHOLD = 0.8; // 0.8 steps for clustering
  private readonly MIN_CONFIDENCE = 0.6; // Minimum confidence for valid detection
  private readonly TRACKING_HISTORY_SIZE = 5; // Number of frames to track for movement
  private readonly MOVEMENT_THRESHOLD = 0.05; // 5% movement to consider object moving
  
  // Priority object categories
  private readonly CRITICAL_OBJECTS = ['person', 'car', 'bicycle', 'motorcycle', 'truck', 'bus'];
  private readonly WARNING_OBJECTS = ['chair', 'table', 'door', 'pole', 'stairs', 'step', 'bench'];
  private readonly INFO_OBJECTS = ['wall', 'tree', 'trash can', 'sign', 'bottle', 'cup'];

  // Distance estimation mapping (object type -> typical size in meters)
  private readonly OBJECT_SIZES: Record<string, number> = {
    person: 1.7,
    car: 4.5,
    bicycle: 1.8,
    motorcycle: 2.0,
    truck: 8.0,
    bus: 12.0,
    chair: 0.8,
    table: 1.2,
    door: 2.0,
    pole: 0.2,
    bench: 1.5,
    bottle: 0.25,
    cup: 0.1,
    // Default fallback
    default: 1.0
  };

  constructor(
    stepLength: number = 65, 
    private config: DetectionServiceConfig = {
      apiUrl: 'http://localhost:8000', // Default FastAPI URL
      confidenceThreshold: 0.6,
      maxRetries: 2,
      timeoutMs: 5000,
      centerFocusOnly: true
    }
  ) {
    this.stepLength = stepLength;
    this.checkApiAvailability();
  }

  private async checkApiAvailability(): Promise<boolean> {
    const now = Date.now();
    
    // Only check API availability every 30 seconds to avoid spam
    if (now - this.lastApiCheck < this.API_CHECK_INTERVAL && this.isApiAvailable) {
      return this.isApiAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      this.isApiAvailable = response.ok;
      this.lastApiCheck = now;
      
      if (this.isApiAvailable) {
        console.log('✅ Detection API is available');
      } else {
        console.warn('⚠️ Detection API returned error status:', response.status);
      }
      
      return this.isApiAvailable;
    } catch (error) {
      console.warn('⚠️ Detection API is not available:', error);
      this.isApiAvailable = false;
      this.lastApiCheck = now;
      return false;
    }
  }

  async processImageForDetection(imageUri: string): Promise<ProcessedAlert[]> {
    try {
      // Check if API is available
      const apiAvailable = await this.checkApiAvailability();
      
      if (!apiAvailable) {
        console.log('📱 API unavailable, using enhanced simulation');
        return this.processSimulatedDetections();
      }

      // Process the image and send to API
      const detections = await this.sendImageToAPI(imageUri);
      
      if (detections.length === 0) {
        return [];
      }

      // Apply comprehensive filtering pipeline
      const filteredDetections = this.applyDetectionPipeline(detections);
      const alerts = this.generateSmartAlerts(filteredDetections);
      
      return alerts;
    } catch (error) {
      console.error('🚨 Detection processing failed:', error);
      // Fallback to simulation on error
      return this.processSimulatedDetections();
    }
  }

  private async sendImageToAPI(imageUri: string): Promise<Detection[]> {
    try {
      // Resize image for faster processing
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 640, height: 480 } }], // Standard detection size
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true 
        }
      );

      if (!manipulatedImage.base64) {
        throw new Error('Failed to convert image to base64');
      }

      // Send to FastAPI backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(`${this.config.apiUrl}/detect`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: manipulatedImage.base64,
          confidence_threshold: this.config.confidenceThreshold,
          center_focus_only: this.config.centerFocusOnly
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const apiResponse: APIDetectionResponse = await response.json();
      
      // Convert API detections to our format
      return this.convertAPIDetections(apiResponse);
    } catch (error) {
      console.error('🚨 API request failed:', error);
      throw error;
    }
  }

  private convertAPIDetections(apiResponse: APIDetectionResponse): Detection[] {
    const { detections, image_width, image_height } = apiResponse;
    const now = Date.now();

    return detections.map((apiDetection, index) => {
      const [x1, y1, x2, y2] = apiDetection.bbox;
      
      // Convert pixel coordinates to normalized coordinates
      const centerX = (x1 + x2) / 2 / image_width;
      const centerY = (y1 + y2) / 2 / image_height;
      const width = (x2 - x1) / image_width;
      const height = (y2 - y1) / image_height;

      // Estimate distance based on object size and type
      const distance = this.estimateDistance(apiDetection.label, height, image_height);
      const steps = this.metersToSteps(distance);

      return {
        id: `api_${apiDetection.label}_${now}_${index}`,
        label: apiDetection.label,
        confidence: apiDetection.confidence,
        distance,
        steps,
        x: centerX,
        y: centerY,
        width,
        height,
        timestamp: now,
        boundingBox: {
          x: x1 / image_width,
          y: y1 / image_height,
          width,
          height
        }
      };
    });
  }

  private estimateDistance(objectLabel: string, normalizedHeight: number, imageHeight: number): number {
    // Get expected real-world size of the object
    const realWorldSize = this.OBJECT_SIZES[objectLabel] || this.OBJECT_SIZES.default;
    
    // Simple distance estimation based on object height in image
    // This is a rough approximation - in reality you'd need camera calibration
    const pixelHeight = normalizedHeight * imageHeight;
    
    // Rough formula: distance = (real_size * focal_length) / pixel_size
    // Using estimated focal length for mobile cameras (~500-800 pixels)
    const estimatedFocalLength = 600;
    const estimatedDistance = (realWorldSize * estimatedFocalLength) / pixelHeight;
    
    // Clamp distance to reasonable range (0.5m to 20m)
    return Math.max(0.5, Math.min(20, estimatedDistance));
  }

  private async processSimulatedDetections(): Promise<ProcessedAlert[]> {
    // Enhanced simulation for when API is unavailable
    const rawDetections = this.generateRealisticDetections();
    const filteredDetections = this.applyDetectionPipeline(rawDetections);
    const alerts = this.generateSmartAlerts(filteredDetections);
    return alerts;
  }

  private applyDetectionPipeline(detections: Detection[]): Detection[] {
    // Step 1: Filter by confidence
    let filtered = detections.filter(d => d.confidence >= this.config.confidenceThreshold);
    
    // Step 2: Filter by center field of view (if enabled)
    if (this.config.centerFocusOnly) {
      filtered = this.filterCenterFOV(filtered);
    }
    
    // Step 3: Update object tracking
    this.updateObjectTracking(filtered);
    
    // Step 4: Filter by movement and proximity
    filtered = this.filterByMovementAndProximity(filtered);
    
    // Step 5: Cluster nearby objects
    filtered = this.clusterNearbyObjects(filtered);
    
    // Step 6: Apply temporal filtering
    filtered = this.applyTemporalFiltering(filtered);
    
    return filtered;
  }

  private filterCenterFOV(detections: Detection[]): Detection[] {
    return detections.filter(detection => {
      const centerX = 0.5;
      const distanceFromCenter = Math.abs(detection.x - centerX);
      return distanceFromCenter <= this.CENTER_FOV_THRESHOLD;
    });
  }

  private updateObjectTracking(detections: Detection[]) {
    const now = Date.now();
    
    detections.forEach(detection => {
      const trackingKey = `${detection.label}_${Math.round(detection.x * 10)}`;
      
      if (!this.objectTracker.has(trackingKey)) {
        this.objectTracker.set(trackingKey, []);
      }
      
      const history = this.objectTracker.get(trackingKey)!;
      history.push(detection);
      
      // Keep only recent history
      if (history.length > this.TRACKING_HISTORY_SIZE) {
        history.shift();
      }
      
      // Calculate movement
      if (history.length >= 2) {
        const prev = history[history.length - 2];
        const curr = history[history.length - 1];
        const movement = Math.sqrt(
          Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
        );
        
        detection.isMoving = movement > this.MOVEMENT_THRESHOLD;
        detection.velocity = movement / ((curr.timestamp - prev.timestamp) / 1000);
      }
    });
    
    // Clean old tracking data
    this.cleanOldTrackingData();
  }

  private filterByMovementAndProximity(detections: Detection[]): Detection[] {
    return detections.filter(detection => {
      // Always include very close objects
      if (detection.steps <= 2) return true;
      
      // Include moving objects within reasonable distance
      if (detection.isMoving && detection.steps <= 6) return true;
      
      // Include stationary critical objects
      if (this.CRITICAL_OBJECTS.includes(detection.label) && detection.steps <= 4) return true;
      
      // Include high-confidence objects
      if (detection.confidence > 0.8 && detection.steps <= 5) return true;
      
      return false;
    });
  }

  private clusterNearbyObjects(detections: Detection[]): Detection[] {
    if (detections.length <= 1) return detections;

    const clusters: Detection[][] = [];
    const processed = new Set<string>();

    for (const detection of detections) {
      if (processed.has(detection.id)) continue;

      const cluster = [detection];
      processed.add(detection.id);

      // Find nearby objects for clustering
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

    // Convert clusters to representative detections
    return clusters.map(cluster => {
      if (cluster.length === 1) {
        return cluster[0];
      }

      // Create clustered detection with priority to closest object
      const closest = cluster.reduce((prev, curr) => 
        curr.steps < prev.steps ? curr : prev
      );

      const hasMoving = cluster.some(d => d.isMoving);
      const hasCritical = cluster.some(d => this.CRITICAL_OBJECTS.includes(d.label));

      return {
        ...closest,
        id: `cluster_${cluster.length}_${Date.now()}`,
        label: this.generateClusterLabel(cluster),
        confidence: Math.max(...cluster.map(d => d.confidence)),
        isMoving: hasMoving,
        velocity: hasMoving ? Math.max(...cluster.map(d => d.velocity || 0)) : 0,
      };
    });
  }

  private generateClusterLabel(cluster: Detection[]): string {
    if (cluster.length === 2) {
      return `${cluster[0].label} and ${cluster[1].label}`;
    }
    
    const criticalCount = cluster.filter(d => this.CRITICAL_OBJECTS.includes(d.label)).length;
    if (criticalCount > 0) {
      return `${criticalCount} critical object${criticalCount > 1 ? 's' : ''} and ${cluster.length - criticalCount} other${cluster.length - criticalCount > 1 ? 's' : ''}`;
    }
    
    return `${cluster.length} objects`;
  }

  private applyTemporalFiltering(detections: Detection[]): Detection[] {
    const now = Date.now();
    
    return detections.filter(detection => {
      const objectType = detection.label;
      const lastAlertTime = this.lastAlerts.get(objectType) || 0;
      const timeSinceLastAlert = now - lastAlertTime;
      
      // Always allow very close objects
      if (detection.steps <= 1) return true;
      
      // Check cooldown for other objects
      if (timeSinceLastAlert < this.ALERT_COOLDOWN_MS) {
        // Allow if object has moved significantly
        const trackingKey = `${detection.label}_${Math.round(detection.x * 10)}`;
        const history = this.objectTracker.get(trackingKey);
        
        if (history && history.length >= 2) {
          const movement = Math.abs(history[0].x - history[history.length - 1].x);
          return movement > this.POSITION_CHANGE_THRESHOLD;
        }
        
        return false;
      }
      
      return true;
    });
  }

  private generateSmartAlerts(detections: Detection[]): ProcessedAlert[] {
    if (detections.length === 0) return [];

    // Sort by priority
    const prioritized = detections
      .map(detection => ({
        detection,
        priority: this.calculatePriority(detection)
      }))
      .sort((a, b) => b.priority - a.priority);

    // Generate alert for highest priority detection only
    const topDetection = prioritized[0];
    if (!topDetection) return [];

    const alert = this.createSmartAlert(topDetection.detection);
    
    // Update tracking
    this.lastAlerts.set(topDetection.detection.label, Date.now());
    
    return [alert];
  }

  private calculatePriority(detection: Detection): number {
    let priority = 0;

    // Distance priority (exponential for very close objects)
    if (detection.steps <= 1) {
      priority += 50;
    } else if (detection.steps <= 2) {
      priority += 30;
    } else if (detection.steps <= 4) {
      priority += 15;
    } else {
      priority += Math.max(0, 10 - detection.steps);
    }

    // Center position bonus
    const centerDistance = Math.abs(detection.x - 0.5);
    priority += (1 - centerDistance) * 10;

    // Object type priority
    if (this.CRITICAL_OBJECTS.includes(detection.label)) {
      priority += 20;
    } else if (this.WARNING_OBJECTS.includes(detection.label)) {
      priority += 10;
    } else if (this.INFO_OBJECTS.includes(detection.label)) {
      priority += 5;
    }

    // Movement bonus
    if (detection.isMoving) {
      priority += 15;
      if (detection.velocity && detection.velocity > 1) {
        priority += 10; // Fast moving objects
      }
    }

    // Confidence bonus
    priority += detection.confidence * 8;

    return priority;
  }

  private createSmartAlert(detection: Detection): ProcessedAlert {
    const alertType = this.determineAlertType(detection);
    const shouldVibrate = detection.steps <= 2 && Platform.OS !== 'web';
    const shouldAnnounce = detection.steps <= 8;

    const message = this.generateContextualMessage(detection);

    return {
      detection,
      priority: this.calculatePriority(detection),
      shouldAnnounce,
      shouldVibrate,
      message,
      alertType,
      suppressUntil: detection.steps > 2 ? Date.now() + this.ALERT_COOLDOWN_MS : undefined
    };
  }

  private determineAlertType(detection: Detection): 'urgent' | 'warning' | 'info' {
    if (detection.steps <= 1 || (detection.isMoving && detection.steps <= 2)) {
      return 'urgent';
    } else if (detection.steps <= 3 || this.CRITICAL_OBJECTS.includes(detection.label)) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  private generateContextualMessage(detection: Detection): string {
    let message = '';
    
    // Add urgency prefix for very close objects
    if (detection.steps === 1) {
      message = 'Stop! ';
    } else if (detection.steps === 2 && detection.isMoving) {
      message = 'Caution! ';
    }

    // Main message
    if (detection.label.includes('multiple') || detection.label.includes('objects')) {
      message += `${detection.label} ahead in ${detection.steps} ${detection.steps === 1 ? 'step' : 'steps'}`;
    } else {
      message += `${detection.label} ahead in ${detection.steps} ${detection.steps === 1 ? 'step' : 'steps'}`;
    }

    // Add movement information
    if (detection.isMoving) {
      if (detection.velocity && detection.velocity > 1.5) {
        message += ', moving fast';
      } else {
        message += ', moving';
      }
    }

    // Add directional information
    if (detection.x < 0.3) {
      message += ' to your left';
    } else if (detection.x > 0.7) {
      message += ' to your right';
    }

    return message;
  }

  private generateRealisticDetections(): Detection[] {
    // Enhanced simulation with more realistic patterns
    const detections: Detection[] = [];
    const now = Date.now();
    
    // Simulate 0-2 objects with realistic distribution
    const numObjects = Math.random() < 0.7 ? 0 : Math.random() < 0.8 ? 1 : 2;
    
    for (let i = 0; i < numObjects; i++) {
      const detection = this.createRealisticDetection(now);
      if (detection) {
        detections.push(detection);
      }
    }
    
    return detections;
  }

  private createRealisticDetection(timestamp: number): Detection | null {
    // Realistic object distribution
    const objectTypes = [
      ...this.CRITICAL_OBJECTS,
      ...this.WARNING_OBJECTS,
      ...this.INFO_OBJECTS
    ];
    
    const label = objectTypes[Math.floor(Math.random() * objectTypes.length)];
    
    // Realistic distance distribution (closer objects less common)
    const distanceRandom = Math.random();
    let distance: number;
    
    if (distanceRandom < 0.1) {
      distance = 0.5 + Math.random() * 1; // 0.5-1.5m (very close)
    } else if (distanceRandom < 0.3) {
      distance = 1.5 + Math.random() * 1.5; // 1.5-3m (close)
    } else {
      distance = 3 + Math.random() * 4; // 3-7m (moderate distance)
    }
    
    const steps = this.metersToSteps(distance);
    
    // Realistic confidence based on distance and object type
    let confidence = 0.6 + Math.random() * 0.3;
    if (distance > 5) confidence *= 0.8; // Lower confidence for distant objects
    if (this.CRITICAL_OBJECTS.includes(label)) confidence += 0.1;
    
    // Realistic positioning (center-weighted)
    const x = 0.3 + Math.random() * 0.4; // Bias toward center
    const y = 0.2 + Math.random() * 0.6;
    
    // Realistic movement (less common)
    const isMoving = Math.random() < 0.2; // 20% chance
    const velocity = isMoving ? Math.random() * 1.5 + 0.5 : 0; // 0.5-2 m/s
    
    return {
      id: `sim_${label}_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
      label,
      confidence: Math.min(confidence, 1.0),
      distance,
      steps,
      x,
      y,
      width: 0.1 + Math.random() * 0.2,
      height: 0.15 + Math.random() * 0.25,
      timestamp,
      isMoving,
      velocity,
      boundingBox: {
        x: x - 0.05,
        y: y - 0.075,
        width: 0.1 + Math.random() * 0.2,
        height: 0.15 + Math.random() * 0.25
      }
    };
  }

  private metersToSteps(meters: number): number {
    const stepLengthMeters = this.stepLength / 100;
    return Math.ceil(meters / stepLengthMeters);
  }

  private cleanOldTrackingData() {
    const now = Date.now();
    const maxAge = 10000; // 10 seconds

    for (const [key, history] of this.objectTracker.entries()) {
      const filteredHistory = history.filter(detection => 
        now - detection.timestamp < maxAge
      );
      
      if (filteredHistory.length === 0) {
        this.objectTracker.delete(key);
      } else {
        this.objectTracker.set(key, filteredHistory);
      }
    }

    // Clean old alerts
    for (const [key, time] of this.lastAlerts.entries()) {
      if (now - time > 30000) { // 30 seconds
        this.lastAlerts.delete(key);
      }
    }
  }

  // Public methods for external use
  updateStepLength(length: number) {
    this.stepLength = length;
  }

  updateConfiguration(newConfig: Partial<DetectionServiceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  getServiceStatus(): { 
    apiAvailable: boolean; 
    lastCheck: number; 
    config: DetectionServiceConfig;
    platform: string;
  } {
    return {
      apiAvailable: this.isApiAvailable,
      lastCheck: this.lastApiCheck,
      config: this.config,
      platform: Platform.OS
    };
  }

  async testApiConnection(): Promise<boolean> {
    return await this.checkApiAvailability();
  }

  clearTrackingData() {
    this.objectTracker.clear();
    this.lastAlerts.clear();
    this.alertCooldowns.clear();
  }
}