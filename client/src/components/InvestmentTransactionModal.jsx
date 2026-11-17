import { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { goalService } from '../services/goalService'
import { investmentService } from '../services/investmentService'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`
const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none'
const labelClass = 'block text-sm text-slate-300'

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const message = detail.map((issue) => issue.message || issue.msg).filter(Boolean).join('; ')
    if (message) return message
  }
  return fallback
}

function availableValue(investment) {
  if (investment.current_value != null) return Number(investment.current_value)
  return Number(investment.initial_amount || 0) + Number(investment.completed_contribution_total || 0)
}

export default function InvestmentTransactionModal({
  investment,
  mode,
  transaction = null,
  onClose,
  onRecorded,
  onComplete,
}) {
  const currentValue = availableValue(investment)
  const [step, setStep] = useState(transaction ? 'allocation' : 'record')
  const [savedTransaction, setSavedTransaction] = useState(transaction)
  const [withdrawalType, setWithdrawalType] = useState('PARTIAL')
  const [amount, setAmount] = useState(String(currentValue))
  const [actualReceived, setActualReceived] = useState(String(
    mode === 'MATURITY' ? investment.maturity_value ?? currentValue : currentValue,
  ))
  const [transactionDate, setTransactionDate] = useState(today())
  const [reason, setReason] = useState('')
  const [allocationType, setAllocationType] = useState('ACCOUNT_BALANCE')
  const [goalId, setGoalId] = useState('')
  const [goals, setGoals] = useState([])
  const [investmentType, setInvestmentType] = useState('FD')
  const [investmentTitle, setInvestmentTitle] = useState('')
  const [newInvestmentGoalId, setNewInvestmentGoalId] = useState('')
  const [newMaturityDate, setNewMaturityDate] = useState('')
  const [newMaturityValue, setNewMaturityValue] = useState('')
  const [saving, setSaving] = useState(false)
  const isMaturity = mode === 'MATURITY'
  const isPendingAllocation = Boolean(transaction)

  useEffect(() => {
    if (step !== 'allocation') return undefined
    let active = true
    goalService.getAll()
      .then((result) => {
        if (active) setGoals(result.filter((goal) => goal.status !== 'CANCELLED'))
      })
      .catch((error) => {
        console.error('Error fetching goals for proceeds allocation:', error)
        if (active) toast.error('Failed to load financial goals')
      })
    return () => {
      active = false
    }
  }, [step])

  const recordTransaction = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const data = isMaturity
        ? await investmentService.recordMaturity(investment.id, {
          withdrawal_date: transactionDate,
          actual_received_amount: Number(actualReceived),
          reason: reason.trim() || null,
        })
        : await investmentService.createWithdrawal(investment.id, {
          withdrawal_date: transactionDate,
          withdrawal_type: withdrawalType,
          withdrawal_amount: withdrawalType === 'FULL' ? currentValue : Number(amount),
          actual_received_amount: Number(actualReceived),
          reason: reason.trim() || null,
        })
      setSavedTransaction(data)
      setStep('allocation')
      onRecorded()
    } catch (error) {
      console.error('Error recording investment transaction:', error)
      toast.error(errorMessage(error, 'Failed to record investment transaction'))
    } finally {
      setSaving(false)
    }
  }

  const allocateProceeds = async (event) => {
    event.preventDefault()
    setSaving(true)
    const data = { allocation_type: allocationType }
    if (allocationType === 'GOAL') {
      data.goal_id = Number(goalId)
    }
    if (allocationType === 'NEW_INVESTMENT') {
      data.new_investment = {
        type: investmentType,
        title: investmentTitle.trim(),
        goal_id: newInvestmentGoalId ? Number(newInvestmentGoalId) : null,
        maturity_date: newMaturityDate || null,
        maturity_value: newMaturityValue ? Number(newMaturityValue) : null,
      }
    }
    try {
      await investmentService.allocateProceeds(
        investment.id,
        savedTransaction.id,
        data,
      )
      toast.success('Investment proceeds allocated')
      onComplete()
    } catch (error) {
      console.error('Error allocating investment proceeds:', error)
      toast.error(errorMessage(error, 'Failed to allocate proceeds'))
    } finally {
      setSaving(false)
    }
  }

  const allocationAmount = Number(savedTransaction?.actual_received_amount || 0)
  const dateMinimum = isMaturity
    ? String(investment.maturity_date || investment.start_date).slice(0, 10)
    : String(investment.start_date).slice(0, 10)

  return (
    <>
      <button
        type="button"
        aria-label="Close investment transaction"
        className="fixed inset-0 z-40 cursor-default bg-black/70"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {step === 'allocation'
                ? 'Allocate proceeds'
                : isMaturity ? 'Confirm investment maturity' : 'Withdraw investment'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {investment.title} · current value {money(currentValue)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <FiX size={22} />
          </button>
        </div>

        {step === 'record' ? (
          <form onSubmit={recordTransaction} className="space-y-4">
            {isMaturity ? (
              <>
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm">
                  <p className="text-slate-400">Expected maturity amount</p>
                  <p className="mt-1 text-xl font-semibold text-amber-200">
                    {money(investment.maturity_value ?? currentValue)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Confirm the actual amount received. The investment closes only when this confirmation is recorded.
                  </p>
                </div>
                <label className={labelClass}>Actual amount received (₹)
                  <input
                    className={inputClass}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={actualReceived}
                    onChange={(event) => setActualReceived(event.target.value)}
                    required
                  />
                </label>
              </>
            ) : (
              <>
                {['FD', 'RD'].includes(String(investment.type).toUpperCase()) && (
                  <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">
                    Partial withdrawal availability and premature-closure penalties depend on your provider. Record the actual proceeds received after any penalty.
                  </p>
                )}
                <label className={labelClass}>Withdrawal type
                  <select
                    className={inputClass}
                    value={withdrawalType}
                    onChange={(event) => setWithdrawalType(event.target.value)}
                  >
                    <option value="PARTIAL">Partial withdrawal</option>
                    <option value="FULL">Full withdrawal</option>
                  </select>
                </label>
                <label className={labelClass}>Amount removed from investment (₹)
                  <input
                    className={inputClass}
                    type="number"
                    min="0.01"
                    max={currentValue}
                    step="0.01"
                    value={withdrawalType === 'FULL' ? currentValue : amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={withdrawalType === 'FULL'}
                    required
                  />
                </label>
                <label className={labelClass}>Actual proceeds received (₹)
                  <input
                    className={inputClass}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={actualReceived}
                    onChange={(event) => setActualReceived(event.target.value)}
                    required
                  />
                </label>
              </>
            )}
            <label className={labelClass}>{isMaturity ? 'Amount received on' : 'Withdrawal date'}
              <input
                className={`${inputClass} scheme-dark`}
                type="date"
                min={dateMinimum}
                max={today()}
                value={transactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
                required
              />
            </label>
            <label className={labelClass}>Reason <span className="text-slate-500">(optional)</span>
              <textarea
                className={inputClass}
                rows="3"
                maxLength="500"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={saving || currentValue <= 0}
              className="w-full rounded-lg bg-blue-500 py-2.5 font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
            >
              {saving ? 'Recording…' : isMaturity ? 'Confirm maturity received' : 'Record withdrawal'}
            </button>
          </form>
        ) : (
          <form onSubmit={allocateProceeds} className="space-y-4">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-sm text-slate-400">Actual proceeds to allocate</p>
              <p className="mt-1 text-2xl font-bold text-emerald-200">{money(allocationAmount)}</p>
              <p className="mt-2 text-xs text-slate-400">
                {isPendingAllocation
                  ? 'This transaction is recorded and awaiting its one-time proceeds allocation.'
                  : 'Choose where the proceeds should go. They are not recorded as income.'}
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-slate-300">Proceeds destination</legend>
              {[
                ['ACCOUNT_BALANCE', 'Available Account Balance'],
                ['GOAL', 'Existing Financial Goal'],
                ['NEW_INVESTMENT', 'New Investment'],
              ].map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 p-3 text-sm hover:border-slate-500">
                  <input
                    type="radio"
                    name="allocation"
                    value={value}
                    checked={allocationType === value}
                    onChange={() => setAllocationType(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {allocationType === 'GOAL' && (
              <label className={labelClass}>Financial goal
                <select
                  className={inputClass}
                  value={goalId}
                  onChange={(event) => setGoalId(event.target.value)}
                  required
                >
                  <option value="">Select a goal</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>{goal.goal_name}</option>
                  ))}
                </select>
              </label>
            )}
            {allocationType === 'NEW_INVESTMENT' && (
              <div className="space-y-4 rounded-xl border border-slate-700 p-4">
                <label className={labelClass}>Investment title
                  <input
                    className={inputClass}
                    value={investmentTitle}
                    onChange={(event) => setInvestmentTitle(event.target.value)}
                    maxLength="255"
                    required
                  />
                </label>
                <label className={labelClass}>Investment type
                  <select className={inputClass} value={investmentType} onChange={(event) => setInvestmentType(event.target.value)}>
                    <option value="FD">Fixed Deposit (FD)</option>
                    <option value="RD">Recurring Deposit (RD)</option>
                    <option value="MUTUAL FUND">Mutual Fund</option>
                  </select>
                </label>
                <label className={labelClass}>Link to a goal <span className="text-slate-500">(optional)</span>
                  <select className={inputClass} value={newInvestmentGoalId} onChange={(event) => setNewInvestmentGoalId(event.target.value)}>
                    <option value="">No linked goal</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>{goal.goal_name}</option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>Maturity date <span className="text-slate-500">(optional)</span>
                  <input
                    className={`${inputClass} scheme-dark`}
                    type="date"
                    min={today()}
                    value={newMaturityDate}
                    onChange={(event) => setNewMaturityDate(event.target.value)}
                  />
                </label>
                <label className={labelClass}>Expected maturity amount (₹) <span className="text-slate-500">(optional)</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newMaturityValue}
                    onChange={(event) => setNewMaturityValue(event.target.value)}
                  />
                </label>
              </div>
            )}
            <button
              type="submit"
              disabled={saving
                || (allocationType === 'GOAL' && !goalId)
                || (allocationType === 'NEW_INVESTMENT' && !investmentTitle.trim())}
              className="w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? 'Allocating…' : 'Allocate proceeds'}
            </button>
          </form>
        )}
      </aside>
    </>
  )
}
