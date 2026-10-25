import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const colors = ['#fbbf24', '#d6a84f', '#f59e0b', '#fde68a', '#b7791f', '#fcd34d', '#a16207', '#fef3c7']
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export default function InvestmentTypeChart({ data }) {
  const [measure, setMeasure] = useState('amount')
  const hasValues = data.some((item) => Number(item[measure]) > 0)
  const total = data.reduce((sum, item) => sum + Number(item[measure] || 0), 0)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Portfolio mix</h2>
          <p className="mt-1 text-xs text-slate-400">Breakdown by investment type</p>
        </div>
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1 text-xs">
          {['amount', 'count'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMeasure(option)}
              aria-pressed={measure === option}
              className={`rounded-md px-3 py-1.5 font-medium cursor-pointer capitalize transition ${measure === option ? 'bg-blue-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {hasValues ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey={measure} nameKey="type" innerRadius={68} outerRadius={98} paddingAngle={3} stroke="none">
                {data.map((item, index) => <Cell key={item.type} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f8fafc' }}
                formatter={(value) => measure === 'amount' ? money(value) : `${value} investments`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {measure === 'amount' ? 'Invested' : 'Holdings'}
            </span>
            <span className="mt-1 text-lg font-bold text-white">
              {measure === 'amount' ? money(total) : total}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 pb-1">
            {data.map((item, index) => (
              <span key={item.type} className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                {item.type}
                <span className="text-slate-500">
                  {measure === 'amount' ? money(item.amount) : item.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-[290px] items-center justify-center text-sm text-slate-500">No investment data yet</div>
      )}
    </section>
  )
}
