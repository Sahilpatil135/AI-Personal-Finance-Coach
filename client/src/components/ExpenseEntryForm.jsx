import { useEffect, useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import toast from "react-hot-toast";

const modes = ["Cash", "Debit Card", "Online/UPI"];
const categories = [
  "Food",
  "Rent",
  "Utilities",
  "Subscriptions",
  "Entertainment",
  "Stationery",
  "Tech",
  "Other",
];

export default function ExpenseEntryForm({
  isOpen,
  onClose,
  onSubmit,
  editingData,
}) {
  const [form, setForm] = useState({
    amount: "",
    category: "",
    payment_mode: "Online/UPI",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [saving, setSaving] = useState(false);
  useEffect(
    () =>
      setForm(
        editingData
          ? {
              ...editingData,
              amount: String(editingData.amount),
              description: editingData.description || "",
            }
          : {
              amount: "",
              category: "",
              payment_mode: "Online/UPI",
              date: new Date().toISOString().split("T")[0],
              description: "",
            },
      ),
    [editingData, isOpen],
  );
  
  const change = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  
  const submit = async (event) => {
    event.preventDefault();
    if (!form.amount || !form.category)
      return toast.error("Amount and category are required");
    setSaving(true);
    try {
      await onSubmit({ ...form, amount: Number(form.amount) });
      onClose();
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-slate-900 p-6 text-slate-100 shadow-2xl transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {editingData ? "Edit Expense" : "Add Expense"}
          </h2>
          <button onClick={onClose} title="Close">
            <FiX size={24} />
          </button>
        </div>
        
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Amount *
            </label>        
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">₹</span>
              <input
                name="amount"
                type="number"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={change}
                onWheel={(e) => e.target.blur()} // Prevent changing value on scroll
                required
                className="w-full pl-7 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Category *
            </label>        
            <select
              name="category"
              value={form.category}
              onChange={change}
              required
              className="w-full pl-7 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Payment mode
            </label>
            <select
              name="payment_mode"
              value={form.payment_mode}
              onChange={change}
              className="w-full pl-7 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {modes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Date
            </label>
            <input
              name="date"
              type="date"
              value={form.date}
              onChange={change}
              className="w-full pl-7 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={change}
              rows="3"
              className="w-full pl-7 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          
          
          <button
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-2 font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
          >
            <FiPlus />
            {saving
              ? "Saving..."
              : editingData
                ? "Update Expense"
                : "Add Expense"}
          </button>
        </form>
      </aside>
    </>
  );
}
