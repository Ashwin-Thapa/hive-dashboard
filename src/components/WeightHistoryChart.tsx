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
        <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading weight data...</p>
        </div>
    );
  }

  const weights = data.map(p => p.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);

  // Pad the data range by 5000 grams on both sides to ensure context
  // This padding still uses 5000g, which is a good round number for axis readability.
  const paddedMin = Math.max(0, minWeight - 5000);
  const paddedMax = maxWeight + 5000;

  // Calculate a sensible Y-axis domain, rounding to the nearest 5000 grams (for cleaner ticks)
  // The actual data points will still show full decimals.
  const yDomainMin = Math.floor(paddedMin / 5000) * 5000;
  const yDomainMax = Math.ceil(paddedMax / 5000) * 5000;

  // Generate ticks with 5000 grams increments for the Y-axis.
  const yTicks: number[] = [];
  for (let i = yDomainMin; i <= yDomainMax; i += 5000) {
      yTicks.push(i);
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
          domain={[yDomainMin, yDomainMax]}
          ticks={yTicks}
          tickFormatter={(value) => `${value} g`} // REMOVED toFixed() - shows raw value
          width={80}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
          labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
          formatter={(value: number) => [`${value} g`, 'Weight']} // REMOVED toFixed() - shows raw value
        />
        <Line type="monotone" name="Weight" dataKey="weight" stroke={COLORS.PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WeightHistoryChart;