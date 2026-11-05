import { useState } from 'react'
import { FiLink, FiX } from 'react-icons/fi'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Not recorded'

export default function GoalDetails({ goal, availableInvestments, isLoadingInvestments, onClose, onLink, onUnlink }) {
  const [investmentId, setInvestmentId] = useState('')
  const [saving, setSaving] = useState(false)

  const linkInvestment = async () => {
    if (!investmentId) return
    setSaving(true)
    try {
      await onLink(Number(investmentId))
      setInvestmentId('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button aria-label="Close goal details" className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="goal-details-title" className="fixed inset-4 z-50 m-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:inset-8 sm:p-7">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">{goal.category}</p>
            <h2 id="goal-details-title" className="mt-1 text-2xl font-bold">{goal.goal_name}</h2>
            <p className="mt-1 text-sm text-slate-400">{goal.description || 'No description provided.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><FiX size={22} /></button>
        </header>

        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Goal progress</span>
            <strong>{goal.completion_percentage}%</strong>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${goal.completion_percentage}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-slate-500">Target</p><p className="mt-1 font-semibold">{money(goal.target_amount)}</p></div>
            <div><p className="text-xs text-slate-500">Cash allocated (user-reported)</p><p className="mt-1 font-semibold">{money(goal.cash_allocated)}</p></div>
            <div><p className="text-xs text-slate-500">Linked valued investments</p><p className="mt-1 font-semibold">{money(goal.linked_investment_value)}</p></div>
            <div><p className="text-xs text-slate-500">Total goal funds</p><p className="mt-1 font-semibold text-emerald-300">{money(goal.total_goal_funds)}</p></div>
            <div><p className="text-xs text-slate-500">Remaining</p><p className="mt-1 font-semibold">{money(goal.remaining_amount)}</p></div>
            <div><p className="text-xs text-slate-500">Deadline</p><p className="mt-1 font-semibold">{date(goal.deadline)}</p></div>
            <div><p className="text-xs text-slate-500">Days remaining</p><p className="mt-1 font-semibold">{goal.days_remaining < 0 ? `${Math.abs(goal.days_remaining)} overdue` : goal.days_remaining}</p></div>
            <div><p className="text-xs text-slate-500">Latest valuation date</p><p className="mt-1 font-semibold">{date(goal.valuation_date)}</p></div>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-400/5 p-3 text-xs text-amber-100/80">
          Cash allocation is user-reported. Investment values are reported or estimated according to each investment’s valuation method; no valuation is treated as verified. Unvalued initial amounts below are not counted toward goal funds or progress.
        </div>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <select className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={investmentId} onChange={(event) => setInvestmentId(event.target.value)} disabled={isLoadingInvestments || !availableInvestments.length}>
            <option value="">{isLoadingInvestments ? 'Loading investments…' : 'Select an unlinked investment'}</option>
            {availableInvestments.map((investment) => (
              <option key={investment.id} value={investment.id}>{investment.title} · {investment.type}</option>
            ))}
          </select>
          <button type="button" onClick={linkInvestment} disabled={!investmentId || saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
            <FiLink />{saving ? 'Linking…' : 'Link investment'}
          </button>
        </div>

        <h3 className="mb-3 text-lg font-semibold">Linked investments</h3>
        {goal.linked_investments.length ? (
          <div className="space-y-3">
            {goal.linked_investments.map((investment) => (
              <article key={investment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div>
                  <p className="font-semibold">{investment.title} <span className="ml-1 text-xs font-normal text-slate-400">{investment.type}</span></p>
                  {investment.current_value == null ? (
                    <p className="mt-1 text-xs text-slate-400">
                      No current valuation. Recorded initial contribution: {money(investment.initial_amount)} (not counted as current value).
                      {investment.contribution_amount != null && ` Scheduled contribution: ${money(investment.contribution_amount)} ${investment.contribution_frequency?.toLowerCase() || ''}.`}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">
                      Current value: {money(investment.current_value)} · {investment.valuation_source === 'ESTIMATED' ? 'Estimated' : 'User-reported'} · {investment.valuation_method} · valued {date(investment.valuation_date)}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => onUnlink(investment.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Unlink</button>
              </article>
            ))}
          </div>
        ) : <p className="rounded-xl border border-slate-800 p-5 text-center text-sm text-slate-500">No investments linked to this goal yet.</p>}

        {goal.unvalued_investment_contributions > 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Recorded initial contributions without current valuations: <strong className="text-slate-200">{money(goal.unvalued_investment_contributions)}</strong>. This is reported separately and excluded from goal progress.
          </p>
        )}
      </section>
    </>
  )
}
