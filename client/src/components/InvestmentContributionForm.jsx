import { useState } from 'react'
import { FiX } from 'react-icons/fi'

const today = new Date()
const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none'

export default function InvestmentContributionForm({ contribution, onClose, onSubmit }) {
  const [amount, setAmount] = useState(String(contribution.contribution_amount))
  const [contributionDate, setContributionDate] = useState(todayString)
  const [alreadyRecordedAsExpense, setAlreadyRecordedAsExpense] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        amount: Number(amount),
        scheduled_date: contribution.next_contribution_date,
        contribution_date: contributionDate,
        already_recorded_as_expense: alreadyRecordedAsExpense,
        notes: notes.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button aria-label="Close contribution form" className="fixed inset-0 z-[60] bg-black/70" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="contribution-form-title" className="fixed inset-4 z-[70] m-auto h-fit max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="contribution-form-title" className="text-xl font-bold">Record contribution as paid</h2>
            <p className="mt-1 text-sm text-slate-400">{contribution.investment_title} · Scheduled {contribution.next_contribution_date}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><FiX size={21} /></button>
        </header>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm text-slate-300">Paid amount (₹)
            <input className={inputClass} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
          <label className="block text-sm text-slate-300">Payment date
            <input className={`${inputClass} scheme-dark`} type="date" max={todayString} value={contributionDate} onChange={(event) => setContributionDate(event.target.value)} required />
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
            <input className="mt-1" type="checkbox" checked={alreadyRecordedAsExpense} onChange={(event) => setAlreadyRecordedAsExpense(event.target.checked)} />
            <span>Already recorded this payment as an expense. Exclude it from the separate contribution deduction when estimating monthly surplus.</span>
          </label>
          <label className="block text-sm text-slate-300">Notes (optional)
            <textarea className={inputClass} rows="2" maxLength="500" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Mark as paid'}</button>
          </div>
        </form>
      </section>
    </>
  )
}
