// src/types.ts
import type { Chat } from '@google/genai';

export enum AlertType {
  OK = 'ok',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export type SensorData = {
  temperature: number;
  humidity: number;
  weight: number;
  sound: number; // in dB
  timestamp: number; // Unix timestamp in milliseconds
};

export type Alert = {
  type: AlertType;
  message: string;
};

export type HistoryEntry = SensorData; // History entry is just sensor data with a timestamp

export type WeightHistoryPoint = {
  timestamp: number;
  weight: number;
};

// Update this type to allow content to be undefined
export type ChatMessage = {
  role: 'user' | 'model';
  content: string | undefined; // Changed from string to string | undefined
};

export type Hive = {
  id: string;
  name: string;
  sensorData: SensorData;
  fullHistory: HistoryEntry[];
  weightHistory: WeightHistoryPoint[];
  chat: Chat | null; // Gemini ChatSession instance
  chatHistory: ChatMessage[];
};