import type { Chat } from '@google/genai';

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

// types.ts
// types.ts
export interface Hive {
  id: string;
  name: string;
  sensorData: SensorData;
  fullHistory: HistoryEntry[];
  weightHistory: { timestamp: number; weight: number }[];
  chat?: any;
  chatHistory: ChatMessage[];
  // NEW (all optional to avoid breaking other code)
  simEnabled?: boolean;
  simClock?: number; // virtual clock in ms
  simConfig?: {
    baseTemp: number;
    baseHum: number;
    baseSound: number;
    baseWeight: number;
    // how “wobbly” each parameter is per tick
    stepTemp: number;
    stepHum: number;
    stepSound: number;
    stepWeight: number;
  };
}


