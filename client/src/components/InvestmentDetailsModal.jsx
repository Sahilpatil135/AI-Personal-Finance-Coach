import { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { goalService } from '../services/goalService'

const money = (value) => value == null
  ? 'Not recorded'
  : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  : 'Not recorded'
const labelize = (value) => value
  ? String(value).toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not recorded'

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-100">{children}</dd>
    </div>
  )
}

function DetailSection({ title, children }) {
  return (
    <section className="mb-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-3">
        {children}
      </dl>
    </section>
  )
}

export default function InvestmentDetailsModal({ investment, onClose }) {
  const [goalState, setGoalState] = useState({
    goal: null,
    loading: Boolean(investment.goal_id),
    error: false,
  })
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!investment.goal_id) return undefined

    let active = true
    goalService.getById(investment.goal_id)
      .then((result) => {
        if (active) setGoalState({ goal: result, loading: false, error: false })
      })
      .catch((error) => {
        console.error('Error fetching linked investment goal:', error)
        if (active) setGoalState({ goal: null, loading: false, error: true })
      })

    return () => {
      active = false
    }
  }, [investment.goal_id, retry])

  const goalProgress = goalState.goal?.completion_percentage == null
    ? null
    : Math.min(Math.max(Number(goalState.goal.completion_percentage), 0), 100)

  return (
    <>
      <button type="button" aria-label="Close investment details" className="fixed inset-0 z-40 cursor-default bg-black/70" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="investment-details-title"
        className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-7"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">{labelize(investment.type)}</p>
            <h2 id="investment-details-title" className="mt-1 text-2xl font-bold">{investment.title}</h2>
            <p className="mt-1 text-sm text-slate-400">Investment details</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800">
            <FiX size={22} />
          </button>
        </header>

        <DetailSection title="Investment overview">
          <Detail label="Type">{labelize(investment.type)}</Detail>
          <Detail label="Status">{labelize(investment.status)}</Detail>
          <Detail label="Initial amount">{money(investment.initial_amount)}</Detail>
          <Detail label="Start date">{date(investment.start_date)}</Detail>
          <Detail label="Term">{investment.term == null ? 'Not recorded' : `${investment.term} months`}</Detail>
          <Detail label="Completed contributions">{money(investment.completed_contribution_total)}</Detail>
        </DetailSection>

        <DetailSection title="Value and maturity">
          <Detail label="Current value">{money(investment.current_value)}</Detail>
          <Detail label="Valuation method">{labelize(investment.valuation_method)}</Detail>
          <Detail label="Valuation date">{date(investment.valuation_date)}</Detail>
          <Detail label="Expected maturity value">{money(investment.maturity_value)}</Detail>
          <Detail label="Maturity date">{date(investment.maturity_date)}</Detail>
        </DetailSection>

        {(investment.contribution_amount != null || investment.contribution_frequency) && (
          <DetailSection title="Recurring contribution">
            <Detail label="Amount">{money(investment.contribution_amount)}</Detail>
            <Detail label="Frequency">{labelize(investment.contribution_frequency)}</Detail>
            <Detail label="Contribution day">{investment.contribution_day ?? 'Not recorded'}</Detail>
            {investment.contribution_month != null && (
              <Detail label="Contribution month">
                {new Date(2000, Number(investment.contribution_month) - 1).toLocaleString('en', { month: 'long' })}
              </Detail>
            )}
          </DetailSection>
        )}

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Linked goal</h3>
          {!investment.goal_id ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              This investment is not linked to a goal.
            </p>
          ) : goalState.loading ? (
            <p role="status" className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              Loading linked goal…
            </p>
          ) : goalState.error ? (
            <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-400/5 p-4">
              <p className="text-sm text-rose-200">Could not load the linked goal details.</p>
              <button
                type="button"
                onClick={() => {
                  setGoalState({ goal: null, loading: true, error: false })
                  setRetry((current) => current + 1)
                }}
                className="mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Retry
              </button>
            </div>
          ) : goalState.goal ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-4">
                <p className="text-lg font-semibold text-white">{goalState.goal.goal_name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {[goalState.goal.category, labelize(goalState.goal.status)].filter(Boolean).join(' · ')}
                </p>
              </div>
              {goalProgress != null && (
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-slate-400">Goal progress</span>
                    <span className="font-semibold text-blue-200">{goalProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${goalProgress}%` }} />
                  </div>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Detail label="Target amount">{money(goalState.goal.target_amount)}</Detail>
                <Detail label="Remaining amount">{money(goalState.goal.remaining_amount)}</Detail>
                <Detail label="Deadline">{date(goalState.goal.deadline)}</Detail>
              </dl>
            </div>
          ) : (
            <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              Goal details are unavailable.
            </p>
          )}
        </section>
      </section>
    </>
  )
}
