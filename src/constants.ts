import { AlertType } from './types';

// Alert Thresholds
export const TEMPERATURE_IDEAL_MIN = 33;
export const TEMPERATURE_IDEAL_MAX = 36.5;
export const TEMPERATURE_WARNING_LOW = 30;
export const TEMPERATURE_WARNING_HIGH = 37;

export const HUMIDITY_IDEAL_MIN = 50;
export const HUMIDITY_IDEAL_MAX = 65;
export const HUMIDITY_WARNING_LOW = 45;
export const HUMIDITY_WARNING_HIGH = 70;

export const SOUND_IDEAL_MIN = 45;
export const SOUND_IDEAL_MAX = 55;
export const SOUND_WARNING_LOW = 35;
export const SOUND_WARNING_HIGH = 70;
export const SOUND_CRITICAL_HIGH = 80;

// Colors
export const COLORS = {
  [AlertType.CRITICAL]: '#e74c3c', // Red
  [AlertType.WARNING]: '#f39c12', // Orange
  [AlertType.OK]: '#2ecc71', // Green
  PRIMARY: '#FDB813' // Bwise Yellow
};
