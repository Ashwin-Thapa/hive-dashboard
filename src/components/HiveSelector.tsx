import React from 'react';
import type { Hive } from '../types';

interface HiveSelectorProps {
  hives: Hive[];
  selectedHiveId: string;
  onSelectHive: (id: string) => void;
}

const HiveSelector: React.FC<HiveSelectorProps> = ({ hives, selectedHiveId, onSelectHive }) => {
  return (
    <div className="w-full mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-3 px-1">Your Hives</h2>
      <div className="flex space-x-4 pb-3 overflow-x-auto">
        {hives.map((hive) => (
          <button
            key={hive.id}
            onClick={() => onSelectHive(hive.id)}
            className={`flex-shrink-0 w-48 p-3 rounded-lg text-left transition-all duration-200 shadow-md ${
              selectedHiveId === hive.id
                ? 'bg-white ring-2 ring-bwise-yellow'
                : 'bg-white hover:bg-gray-50 hover:scale-105'
            }`}
          >
            <p className="font-bold text-gray-900 truncate">{hive.name}</p>
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <p>Temp: <span className="font-medium text-gray-800">{hive.sensorData.temperature.toFixed(1)}°C</span></p>
              <p>Hum: <span className="font-medium text-gray-800">{hive.sensorData.humidity.toFixed(1)}%</span></p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HiveSelector;
