import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyTrendChart = ({ data }) => {
  const formatCurrency = (value) => {
    return `₹${(value / 1000).toFixed(1)}k`;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Monthly Income Trend</h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} axisLine={{ stroke: '#475569' }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: '#475569' }} />
            <Tooltip
              formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Bar dataKey="amount" fill="#34d399" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-slate-500">
          No data available
        </div>
      )}
    </div>
  );
};

export default MonthlyTrendChart;
