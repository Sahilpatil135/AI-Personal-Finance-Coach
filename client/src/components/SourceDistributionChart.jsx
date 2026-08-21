import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const SourceDistributionChart = ({ data }) => {
  const COLORS = ['#34d399', '#2dd4bf', '#22d3ee', '#fbbf24', '#fb7185', '#a3e635', '#f97316', '#60a5fa'];

  const renderLabel = (entry) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Income by Source</h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              fill="#34d399"
              dataKey="amount"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-slate-500">
          No data available
        </div>
      )}
    </div>
  );
};

export default SourceDistributionChart;
