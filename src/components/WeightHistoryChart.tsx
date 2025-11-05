import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeightHistoryPoint } from '../types';
import { COLORS } from '../constants';

interface WeightHistoryChartProps {
  data: WeightHistoryPoint[];
}

const WeightHistoryChart: React.FC<WeightHistoryChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
        <div className="flex items-center justify-center h-full h-full min-h-[300px]">
            <p className="text-gray-500">Loading weight data...</p>
        </div>
    );
  }

  const weights = data.map(p => p.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);

  // --- 1. Calculate the Y-Axis Buffer based on the data's range ---
  const dataRange = maxWeight - minWeight;
  
  // Set a buffer (padding) for the top and bottom of the visible range.
  // Use a small fixed amount (e.g., 50g) OR a percentage of the data range (e.g., 20%), 
  // whichever is larger, to ensure a visible line and not crop the max/min points.
  const fixedBuffer = 50;
  const relativeBuffer = dataRange * 0.15; // 15% of the total range (7.5% on each side)
  const buffer = Math.max(fixedBuffer, relativeBuffer);

  // --- 2. Define the new Y-axis domain (Min/Max) ---
  const yAxisMinRaw = minWeight - buffer;
  const yAxisMaxRaw = maxWeight + buffer;

  // To ensure cleaner, rounded ticks, we can round the domain to a sensible number (e.g., nearest 100 grams)
  // You can adjust the rounding factor (e.g., 100, 50, or 1000) based on how much the weight changes.
  const roundingFactor = 100; // Round the min/max to the nearest 100 grams
  let yDomainMin = Math.floor(yAxisMinRaw / roundingFactor) * roundingFactor;
  let yDomainMax = Math.ceil(yAxisMaxRaw / roundingFactor) * roundingFactor;

  // --- 3. Generate sensible ticks for the new domain (optional, but good for readability) ---
  // Use a smaller step (e.g., 100g or 50g) for the ticks since the range is small.
  const tickStep = 100; 
  const yTicks: number[] = [];
  for (let i = yDomainMin; i <= yDomainMax; i += tickStep) {
      yTicks.push(i);
  }

  // Fallback for very flat data (optional, but prevents excessive zooming)
  if (dataRange < 50) {
    // If data is virtually flat, ensure the axis still spans at least 200g
    const center = (minWeight + maxWeight) / 2;
    yDomainMin = Math.floor((center - 100) / roundingFactor) * roundingFactor;
    yDomainMax = Math.ceil((center + 100) / roundingFactor) * roundingFactor;
    yTicks.length = 0;
    for (let i = yDomainMin; i <= yDomainMax; i += tickStep) {
      yTicks.push(i);
    }
  }


  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          stroke="#6b7280"
          dy={10}
        />
        <YAxis
          stroke="#6b7280"
          // KEY FIX: Using the tightly calculated domain
          domain={[yDomainMin, yDomainMax]} 
          ticks={yTicks} // Using the tightly calculated ticks
          tickFormatter={(value) => `${value} g`}
          width={80}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
          labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
          formatter={(value: number) => [`${value} g`, 'Weight']}
        />
        <Line type="monotone" name="Weight" dataKey="weight" stroke={COLORS.PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WeightHistoryChart;