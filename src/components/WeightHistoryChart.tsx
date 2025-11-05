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

  const dataRange = maxWeight - minWeight;

  const fixedBuffer = 50;
  const relativeBuffer = dataRange * 0.15;
  const buffer = Math.max(fixedBuffer, relativeBuffer);

  const yAxisMinRaw = minWeight - buffer;
  const yAxisMaxRaw = maxWeight + buffer;

  const roundingFactor = 100;
  let yDomainMin = Math.floor(yAxisMinRaw / roundingFactor) * roundingFactor;
  let yDomainMax = Math.ceil(yAxisMaxRaw / roundingFactor) * roundingFactor;

  const tickStep = 100;
  let yTicks: number[] = [];
  for (let i = yDomainMin; i <= yDomainMax; i += tickStep) {
    yTicks.push(i);
  }

  if (dataRange < 50) {
    const center = (minWeight + maxWeight) / 2;
    yDomainMin = Math.floor((center - 100) / roundingFactor) * roundingFactor;
    yDomainMax = Math.ceil((center + 100) / roundingFactor) * roundingFactor;
    yTicks = [];
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
          domain={[yDomainMin, yDomainMax]}
          ticks={yTicks}
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