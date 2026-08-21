import React, { useState, useEffect } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const IncomeEntryForm = ({ onSubmit, isOpen, onClose, editingData = null }) => {
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const incomeCategories = [
    'Salary',
    'Freelance',
    'Investment',
    'Dividends',
    'Rental',
    'Bonus',
    'Gift',
    'Other'
  ];

  // Populate form when editing
  useEffect(() => {
    if (editingData) {
      setFormData({
        amount: editingData.amount.toString(),
        source: editingData.source,
        date: editingData.date,
        description: editingData.description || '',
      });
    } else {
      setFormData({
        amount: '',
        source: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    }
  }, [editingData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.source) {
      toast.error('Amount and Source are required');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        amount: '',
        source: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      toast.success(editingData ? 'Income updated successfully!' : 'Income added successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save income');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-96 bg-slate-900 border-l border-slate-800 text-slate-100 shadow-xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {editingData ? 'Edit Income' : 'Add Income'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500">₹</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full pl-7 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Source / Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Source / Category *
              </label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select a source</option>
                {incomeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 scheme-dark"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Description / Notes (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add any additional details..."
                rows="3"
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2 mt-6"
            >
              <FiPlus size={20} />
              {isLoading ? 'Saving...' : editingData ? 'Update Income' : 'Add Income'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default IncomeEntryForm;
