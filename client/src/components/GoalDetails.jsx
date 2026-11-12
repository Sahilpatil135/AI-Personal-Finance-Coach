import { useState } from 'react'
import { FiLink, FiX } from 'react-icons/fi'
import GoalProgressBar from './GoalProgressBar'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Not recorded'
const isOutdated = (value) => !value
  || Date.now() - new Date(`${String(value).slice(0, 10)}T00:00:00Z`).getTime() > 30 * 24 * 60 * 60 * 1000

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-100">{children}</p>
    </div>
  )
}

export default function GoalDetails({ goal, availableInvestments, isLoadingInvestments, onClose, onLink, onUnlink, onLifecycleStatusChange }) {
  const [investmentId, setInvestmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const investments = goal.linked_investments || []
  const hasOutdatedValuation = investments.some(
    (investment) => investment.current_value != null && isOutdated(investment.valuation_date),
  )

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

        <section aria-labelledby="goal-overview-heading" className="mb-6">
          <h3 id="goal-overview-heading" className="mb-3 text-lg font-semibold">Goal overview</h3>
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-3">
            <Detail label="Category">{goal.category}</Detail>
            <Detail label="Target amount">{money(goal.target_amount)}</Detail>
            <Detail label="Start date">{date(goal.start_date)}</Detail>
            <Detail label="Deadline">{date(goal.deadline)}</Detail>
            <Detail label="Priority">{goal.priority}</Detail>
            <Detail label="Lifecycle status">{goal.lifecycle_status?.replace('_', ' ')}</Detail>
            <Detail label="Progress status">{goal.progress_status?.replace('_', ' ') || 'Not applicable'}</Detail>
            <div className="col-span-2 sm:col-span-3"><Detail label="Description">{goal.description || 'No description provided.'}</Detail></div>
          </div>
        </section>

        {goal.lifecycle_status === 'IN_PROGRESS' && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => onLifecycleStatusChange('COMPLETED')} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/20">
              Mark completed
            </button>
            <button type="button" onClick={() => onLifecycleStatusChange('CANCELLED')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600">
              Cancel goal
            </button>
          </div>
        )}

        <section aria-labelledby="financial-progress-heading" className="mb-6">
          <h3 id="financial-progress-heading" className="mb-3 text-lg font-semibold">Financial progress</h3>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>Completion</span>
              <strong>{goal.completion_percentage}%</strong>
            </div>
            <GoalProgressBar goal={goal} />
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Detail label="Cash allocated">{money(goal.cash_allocated)}</Detail>
              <Detail label="Linked investment value">{money(goal.linked_investment_value)}</Detail>
              <Detail label="Total goal funds">{money(goal.total_goal_funds)}</Detail>
              <Detail label="Remaining amount">{money(goal.remaining_amount)}</Detail>
              <Detail label="Completion">{goal.completion_percentage}%</Detail>
              <Detail label="Required monthly savings">
                {goal.required_monthly_savings == null ? 'Deadline passed' : money(goal.required_monthly_savings)}
              </Detail>
              <Detail label="Latest investment valuation">{date(goal.valuation_date)}</Detail>
            </div>
            <div className="mt-5 border-t border-slate-800 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-200">Goal feasibility estimate · this month to date</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Detail label="Monthly income">{money(goal.monthly_income)}</Detail>
                <Detail label="Monthly expenses">{money(goal.monthly_expenses)}</Detail>
                <Detail label="Completed contributions not in expenses">{money(goal.completed_monthly_contributions)}</Detail>
                <Detail label="Available monthly surplus">{money(goal.available_monthly_surplus)}</Detail>
                <Detail label="Goal requires / month">{goal.required_monthly_savings == null ? 'Deadline passed' : money(goal.required_monthly_savings)}</Detail>
                <Detail label="Monthly shortfall">{goal.monthly_shortfall == null ? 'Not available' : money(goal.monthly_shortfall)}</Detail>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Estimate based on recorded transactions for the current calendar month and completed contributions; scheduled payments are excluded. If a completed payment is already recorded as an expense, it is not deducted again. This is not a verified bank balance.
              </p>
            </div>
            {(hasOutdatedValuation || goal.valuation_date && isOutdated(goal.valuation_date)) && (
              <p role="status" className="mt-4 rounded-lg border border-amber-500/30 bg-amber-400/5 p-3 text-xs text-amber-200">
                One or more investment valuations are more than 30 days old or have no valuation date. Their displayed values may no longer be accurate.
              </p>
            )}
            <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-400">
              Cash allocation is user-reported. Investment values may be estimated or user-reported and are not guaranteed or necessarily immediately withdrawable. Investments without a current valuation are excluded from goal funds.
            </p>
          </div>
        </section>

        <section aria-labelledby="linked-investments-heading" className="mb-6">
          <h3 id="linked-investments-heading" className="mb-3 text-lg font-semibold">Linked investments</h3>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
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

          {investments.length ? (
            <div className="space-y-3">
              {investments.map((investment) => (
                <article key={investment.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{investment.title} <span className="ml-1 text-xs font-normal text-slate-400">{investment.type}</span></p>
                      <p className="mt-1 text-xs text-slate-400">
                        Current value: {investment.current_value == null ? 'Not recorded' : money(investment.current_value)}
                      </p>
                    </div>
                    <button type="button" onClick={() => onUnlink(investment.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Unlink</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Detail label="Initial amount">{money(investment.initial_amount)}</Detail>
                    <Detail label="Completed contributions">{money(investment.completed_contribution_total)}</Detail>
                    <Detail label="Valuation method">{investment.valuation_method || 'Not recorded'}</Detail>
                    <Detail label="Valuation date">{date(investment.valuation_date)}</Detail>
                    <Detail label="Maturity date">{date(investment.maturity_date)}</Detail>
                    <Detail label="Investment status">{investment.status || 'Not recorded'}</Detail>
                    <Detail label="Investment start date">{date(investment.start_date)}</Detail>
                    {investment.contribution_amount != null && (
                      <Detail label="Scheduled contribution">
                        {money(investment.contribution_amount)} {investment.contribution_frequency?.toLowerCase() || ''}
                      </Detail>
                    )}
                  </div>
                  {investment.current_value != null && isOutdated(investment.valuation_date) && (
                    <p className="mt-3 text-xs text-amber-300">Valuation may be outdated.</p>
                  )}
                </article>
              ))}
            </div>
          ) : <p className="rounded-xl border border-slate-800 p-5 text-center text-sm text-slate-500">No investments linked to this goal yet.</p>}

          <p className="mt-3 text-xs text-slate-500">
            Scheduled contributions are plans, not recorded transactions. Only payments marked completed appear in contribution history; investment valuations, not contribution totals, determine goal funding.
          </p>
          {goal.unvalued_investment_contributions > 0 && (
            <p className="mt-3 text-sm text-slate-400">
              Initial amounts without current valuations: <strong className="text-slate-200">{money(goal.unvalued_investment_contributions)}</strong>. These are reported separately and excluded from goal progress.
            </p>
          )}
        </section>

        <section aria-labelledby="goal-advice-heading" className="rounded-xl border border-violet-500/20 bg-violet-400/5 p-4">
          <h3 id="goal-advice-heading" className="font-semibold">AI goal advice</h3>
          <p className="mt-1 text-sm text-slate-400">Personalized advice for this goal will be available later.</p>
          <button type="button" disabled title="Coming soon" className="mt-3 rounded-lg bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-200 opacity-60">
            Generate personalized advice · Coming soon
          </button>
        </section>
      </section>
    </>
  )
}
