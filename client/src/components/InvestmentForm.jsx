import { useState } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'

const type = ['FD', 'RD', 'Mutual Fund']

const initialForm = {
  title: '',
  type: 'FD',
  initial_amount: '',
  maturity_value: '',
  start_date: new Date().toISOString().slice(0, 10),
  maturity_date: '',
  contribution_amount: '',
  contribution_frequency: '',
  contribution_day: '',
  contribution_month: '',
  term: '',
  goal_id: '',
  status: 'ACTIVE',
}

const numberOrNull = (value) => (value === '' ? null : Number(value))

function createForm(editingData) {
  if (!editingData) return { ...initialForm }
  return {
    ...initialForm,
    ...editingData,
    initial_amount: editingData.initial_amount ?? '',
    maturity_value: editingData.maturity_value ?? '',
    contribution_amount: editingData.contribution_amount ?? '',
    contribution_frequency: editingData.contribution_frequency ?? '',
    contribution_day: editingData.contribution_day ?? '',
    contribution_month: editingData.contribution_month ?? '',
    term: editingData.term ?? '',
    goal_id: editingData.goal_id ?? '',
    maturity_date: editingData.maturity_date ?? '',
  }
}

export default function InvestmentForm({ isOpen, onClose, onSubmit, editingData }) {
  const [form, setForm] = useState(() => createForm(editingData))
  const [saving, setSaving] = useState(false)

  const change = (event) => setForm((current) => ({
    ...current,
    [event.target.name]: event.target.value,
  }))

  const submit = async (event) => {
    event.preventDefault()
    const hasContribution = form.contribution_amount !== ''
    if (hasContribution && (!form.contribution_frequency || !form.contribution_day)) {
      toast.error('Contribution frequency and day are required for recurring contributions')
      return
    }
    if (hasContribution && form.contribution_frequency === 'YEARLY' && !form.contribution_month) {
      toast.error('Select a month for yearly contributions')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        type: form.type,
        initial_amount: numberOrNull(form.initial_amount),
        maturity_value: numberOrNull(form.maturity_value),
        start_date: form.start_date,
        maturity_date: form.maturity_date || null,
        contribution_amount: numberOrNull(form.contribution_amount),
        contribution_frequency: form.contribution_frequency || null,
        contribution_day: numberOrNull(form.contribution_day),
        contribution_month: form.contribution_frequency === 'YEARLY'
          ? numberOrNull(form.contribution_month)
          : null,
        term: numberOrNull(form.term),
        goal_id: numberOrNull(form.goal_id),
        status: form.status,
      })
      onClose()
    } catch {
      toast.error('Failed to save investment')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none'
  const labelClass = 'block text-sm text-slate-300'

  return (
    <>
      {isOpen && <button aria-label="Close investment form" className="fixed inset-0 z-40 cursor-default bg-black/60" onClick={onClose} />}
      <aside className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto bg-slate-900 p-6 text-slate-100 shadow-2xl transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{editingData ? 'Edit Investment' : 'Add Investment'}</h2>
            <p className="mt-1 text-sm text-slate-400">Keep your portfolio details up to date.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><FiX size={22} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className={labelClass}>Investment title *
            <input className={inputClass} name="title" value={form.title} onChange={change} required maxLength="255" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>Type *
              <input className={inputClass} name="type" value={form.type} onChange={change} required maxLength="50" />
            </label>
            <label className={labelClass}>Status
              <select className={inputClass} name="status" value={form.status} onChange={change}>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>Initial amount (₹)
              <input className={inputClass} name="initial_amount" type="number" min="0" step="0.01" value={form.initial_amount} onChange={change} />
            </label>
            <label className={labelClass}>Expected maturity (₹)
              <input className={inputClass} name="maturity_value" type="number" min="0" step="0.01" value={form.maturity_value} onChange={change} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>Start date *
              <input className={`${inputClass} scheme-dark`} name="start_date" type="date" value={form.start_date} onChange={change} required />
            </label>
            <label className={labelClass}>Maturity date
              <input className={`${inputClass} scheme-dark`} name="maturity_date" type="date" value={form.maturity_date} onChange={change} />
            </label>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <p className="mb-3 text-sm font-semibold text-amber-200">Recurring contribution <span className="font-normal text-slate-500">(optional)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <label className={labelClass}>Amount (₹)
                <input className={inputClass} name="contribution_amount" type="number" min="0" step="0.01" value={form.contribution_amount} onChange={change} />
              </label>
              <label className={labelClass}>Frequency
                <select className={inputClass} name="contribution_frequency" value={form.contribution_frequency} onChange={change}>
                  <option value="">Select frequency</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </label>
              <label className={labelClass}>Contribution day
                <input className={inputClass} name="contribution_day" type="number" min="1" max="31" value={form.contribution_day} onChange={change} />
              </label>
              {form.contribution_frequency === 'YEARLY' && (
                <label className={labelClass}>Contribution month
                  <select className={inputClass} name="contribution_month" value={form.contribution_month} onChange={change}>
                    <option value="">Select month</option>
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {new Date(2000, index).toLocaleString('en', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>Term <span className="text-slate-500">(months)</span>
              <input className={inputClass} name="term" type="number" min="1" value={form.term} onChange={change} />
            </label>
            <label className={labelClass}>Linked goal ID
              <input className={inputClass} name="goal_id" type="number" min="1" value={form.goal_id} onChange={change} />
            </label>
          </div>
          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50">
            <FiPlus />{saving ? 'Saving...' : editingData ? 'Update Investment' : 'Add Investment'}
          </button>
        </form>
      </aside>
    </>
  )
}
