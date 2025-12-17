// src/types.ts

export enum AlertType {
  CRITICAL = 'critical',
  WARNING = 'warning',
  OK = 'ok',
}

export interface Alert {
  type: AlertType;
  message: string;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  weight: number;
  sound: number;
  timestamp: number;
}

export interface HistoryEntry extends SensorData {}

export interface WeightHistoryPoint {
  timestamp: number;
  weight: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Hive {
  id: string;
  name: string;
  sensorData: SensorData;
  fullHistory: HistoryEntry[];
  weightHistory: WeightHistoryPoint[];
  // chat property is removed because sessions are handled on the server
  chatHistory: ChatMessage[];
  lastUpdatedTimestamp?: number;
  
  // Simulation fields (moved from your root types)
  simEnabled?: boolean;
  simClock?: number; 
  simConfig?: {
    baseTemp: number;
    baseHum: number;
    baseSound: number;
    baseWeight: number;
    stepTemp: number;
    stepHum: number;
    stepSound: number;
    stepWeight: number;
  };
}