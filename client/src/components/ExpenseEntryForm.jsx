import { useEffect, useState } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'

const modes = ['Cash', 'Debit Card', 'Online/UPI']
const categories = ['Food', 'Rent', 'Utilities', 'Subscriptions', 'Entertainment', 'Stationery', 'Tech', 'Other']

export default function ExpenseEntryForm({ isOpen, onClose, onSubmit, editingData }) {
  const [form, setForm] = useState({ amount: '', category: '', payment_mode: 'Online/UPI', date: new Date().toISOString().split('T')[0], description: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => setForm(editingData ? { ...editingData, amount: String(editingData.amount), description: editingData.description || '' } : { amount: '', category: '', payment_mode: 'Online/UPI', date: new Date().toISOString().split('T')[0], description: '' }), [editingData, isOpen])
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    if (!form.amount || !form.category) return toast.error('Amount and category are required')
    setSaving(true)
    try { await onSubmit({ ...form, amount: Number(form.amount) }); onClose() } catch { toast.error('Failed to save expense') } finally { setSaving(false) }
  }
  return <>{isOpen && <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />}
    <aside className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-slate-900 p-6 text-slate-100 shadow-2xl transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold">{editingData ? 'Edit Expense' : 'Add Expense'}</h2><button onClick={onClose} title="Close"><FiX size={24} /></button></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300">Amount *<input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={change} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2" /></label>
        <label className="block text-sm text-slate-300">Category *<select name="category" value={form.category} onChange={change} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"><option value="">Select category</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block text-sm text-slate-300">Payment mode<select name="payment_mode" value={form.payment_mode} onChange={change} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2">{modes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block text-sm text-slate-300">Date<input name="date" type="date" value={form.date} onChange={change} className="scheme-dark mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2" /></label>
        <label className="block text-sm text-slate-300">Description<textarea name="description" value={form.description} onChange={change} rows="3" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2" /></label>
        <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-2 font-semibold text-white hover:bg-rose-400 disabled:opacity-50"><FiPlus />{saving ? 'Saving...' : editingData ? 'Update Expense' : 'Add Expense'}</button>
      </form>
    </aside></>
}