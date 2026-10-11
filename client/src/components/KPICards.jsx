import React from 'react';
import { FiTrendingUp, FiTarget, FiDollarSign } from 'react-icons/fi';

const KPICards = ({ stats }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const getMoMColor = (growth) => {
    if (growth > 0) return 'text-green-500';
    if (growth < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Income Card */}
      <div className="bg-slate-900/60 rounded-2xl shadow-xl p-6 border border-slate-800/80 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-semibold">Total Income</p>
            <p className="text-2xl font-bold text-white mt-2">
              {formatCurrency(stats?.total_income || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Year to date</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg">
            <FiDollarSign className="text-emerald-400 text-2xl" />
          </div>
        </div>
      </div>

      {/* Monthly Total Card */}
      <div className="bg-slate-900/60 rounded-2xl shadow-xl p-6 border border-slate-800/80 border-l-4 border-l-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-semibold">This Month</p>
            <p className="text-2xl font-bold text-white mt-2">
              {formatCurrency(stats?.month_total || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Current month total</p>
          </div>
          <div className="bg-teal-500/10 p-3 rounded-lg">
            <FiDollarSign className="text-teal-400 text-2xl" />
          </div>
        </div>
      </div>

      {/* MoM Growth Card */}
      <div className="bg-slate-900/60 rounded-2xl shadow-xl p-6 border border-slate-800/80 border-l-4 border-l-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-semibold">MoM Growth</p>
            <p className={`text-2xl font-bold mt-2 ${getMoMColor(stats?.mom_growth)}`}>
              {stats?.mom_growth >= 0 ? '+' : ''}{stats?.mom_growth?.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">vs previous month</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg">
            <FiTrendingUp className="text-emerald-400 text-2xl" />
          </div>
        </div>
      </div>

      {/* Primary Source Card */}
      <div className="bg-slate-900/60 rounded-2xl shadow-xl p-6 border border-slate-800/80 border-l-4 border-l-cyan-400">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-semibold">Primary Source</p>
            <p className="text-2xl font-bold text-white mt-2">
              {stats?.primary_source || 'N/A'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Top income source</p>
          </div>
          <div className="bg-cyan-500/10 p-3 rounded-lg">
            <FiTarget className="text-cyan-400 text-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPICards;
