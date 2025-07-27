import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { COLORS } from '../constants';
import { AlertType } from '../types';

interface GaugeChartProps {
  value: number;
  title: string;
  unit: string;
  min: number;
  max: number;
  status: AlertType;
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value, title, unit, min, max, status }) => {
  const percentage = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  
  const data = [
    { name: title, value: percentage },
  ];

  return (
    <div className="relative w-full h-48 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="90%"
          data={data}
          startAngle={90}
          endAngle={-270}
          barSize={20}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: '#e5e7eb' }}
            dataKey="value"
            angleAxisId={0}
            cornerRadius={10}
            fill={COLORS[status]}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-center">
        <span className="text-base text-gray-700">{title}</span>
        <span className="text-3xl font-bold text-gray-900">{value.toFixed(2)}<span className="text-lg text-gray-500 ml-1">{unit}</span></span>
      </div>
    </div>
  );
};

export default GaugeChart;