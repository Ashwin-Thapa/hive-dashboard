
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

export interface Hive {
    id: string;
    name: string;
    sensorData: SensorData;
    weightHistory: WeightHistoryPoint[];
    fullHistory: HistoryEntry[];
    chat?: Chat;
    chatHistory: ChatMessage[];
    lastUpdatedTimestamp?: number;
}
