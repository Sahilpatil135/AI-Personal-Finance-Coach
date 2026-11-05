import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'

const categories = [
  'Education',
  'Gadgets',
  'Travel',
  'Emergency Fund',
  'Vehicle',
  'Personal Development',
  'Other',
]

const today = new Date().toISOString().slice(0, 10)
const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none'
const labelClass = 'block text-sm text-slate-300'

function initialForm(goal) {
  return goal
    ? {
        goal_name: goal.goal_name,
        category: goal.category,
        target_amount: String(goal.target_amount),
        current_saved: String(goal.cash_allocated),
        start_date: String(goal.start_date).slice(0, 10),
        deadline: String(goal.deadline).slice(0, 10),
        priority: goal.priority,
        description: goal.description || '',
      }
    : {
        goal_name: '',
        category: 'Education',
        target_amount: '',
        current_saved: '0',
        start_date: today,
        deadline: '',
        priority: 'MEDIUM',
        description: '',
      }
}

export default function GoalForm({ goal, onClose, onSubmit }) {
  const [form, setForm] = useState(() => initialForm(goal))
  const [saving, setSaving] = useState(false)

  const change = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (Number(form.target_amount) <= 0 || Number(form.current_saved) < 0) return
    if (form.deadline < form.start_date) return

    setSaving(true)
    try {
      await onSubmit({
        goal_name: form.goal_name.trim(),
        category: form.category,
        target_amount: Number(form.target_amount),
        current_saved: Number(form.current_saved),
        start_date: form.start_date,
        deadline: form.deadline,
        priority: form.priority,
        description: form.description.trim() || null,
      })
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : 'Failed to save goal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button aria-label="Close goal form" className="fixed inset-0 z-40 cursor-default bg-black/60" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{goal ? 'Edit goal' : 'Create goal'}</h2>
            <p className="mt-1 text-sm text-slate-400">Set a target and track goal-specific funds.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><FiX size={22} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className={labelClass}>Goal name *
            <input className={inputClass} name="goal_name" value={form.goal_name} onChange={change} maxLength="100" required />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>Category *
              <select className={inputClass} name="category" value={form.category} onChange={change} required>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className={labelClass}>Priority *
              <select className={inputClass} name="priority" value={form.priority} onChange={change} required>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>Target amount (₹) *
              <input className={inputClass} name="target_amount" type="number" min="0.01" step="0.01" value={form.target_amount} onChange={change} required />
            </label>
            <label className={labelClass}>Initial cash allocated (₹)
              <input className={inputClass} name="current_saved" type="number" min="0" step="0.01" value={form.current_saved} onChange={change} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>Start date *
              <input className={`${inputClass} scheme-dark`} name="start_date" type="date" value={form.start_date} onChange={change} max={form.deadline || undefined} required />
            </label>
            <label className={labelClass}>Target completion date *
              <input className={`${inputClass} scheme-dark`} name="deadline" type="date" value={form.deadline} onChange={change} min={form.start_date} required />
            </label>
          </div>
          <label className={labelClass}>Description
            <textarea className={inputClass} name="description" rows="3" value={form.description} onChange={change} />
          </label>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
            Cash allocated is a user-reported amount for this goal only. It is not automatically calculated from your account balance.
          </div>
          <button disabled={saving} className="w-full rounded-lg bg-amber-400 py-2.5 font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50">
            {saving ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
          </button>
        </form>
      </aside>
    </>
  )
}
