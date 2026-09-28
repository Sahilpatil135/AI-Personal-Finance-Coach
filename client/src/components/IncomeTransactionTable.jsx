import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const IncomeTransactionTable = ({
  data,
  onEdit,
  onDelete,
  isLoading,
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filteredData, setFilteredData] = useState(data);
  const [uniqueSources, setUniqueSources] = useState([]);

  useEffect(() => {
    if (data) {
      // Extract unique sources
      const sources = [...new Set(data.map(item => item.source))];
      setUniqueSources(sources);

      // Filter data
      let filtered = data;

      if (searchTerm) {
        filtered = filtered.filter(item =>
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.source?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (sourceFilter) {
        filtered = filtered.filter(item => item.source === sourceFilter);
      }

      if (dateRange.start) {
        filtered = filtered.filter(item =>
          dayjs(item.date).isSameOrAfter(dayjs(dateRange.start))
        );
      }

      if (dateRange.end) {
        filtered = filtered.filter(item =>
          dayjs(item.date).isSameOrBefore(dayjs(dateRange.end))
        );
      }

      setFilteredData(filtered);
    }
  }, [data, searchTerm, sourceFilter, dateRange]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format('MMM DD, YYYY');
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Income History</h3>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by description or source..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-4 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <option value="">All Sources</option>
          {uniqueSources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>

        {/* Date Range - Start */}
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          className="px-4 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 scheme-dark"
          placeholder="Start date"
        />

        {/* Date Range - End */}
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          className="px-4 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 scheme-dark"
          placeholder="End date"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/60 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Source</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Description</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Amount</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : filteredData && filteredData.length > 0 ? (
              filteredData.map(item => (
                <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 text-sm text-slate-300">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    <span className="inline-block bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
                      {item.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{item.description || '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-400 text-right">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 hover:bg-teal-500/10 rounded-lg transition text-teal-400"
                        title="Edit"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg transition text-rose-400"
                        title="Delete"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                  No income records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {filteredData?.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 hover:bg-slate-800 disabled:bg-slate-900 disabled:text-slate-700 rounded-lg transition text-slate-300"
          >
            <FiChevronLeft />
          </button>
          <span className="text-sm font-semibold text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 hover:bg-slate-800 disabled:bg-slate-900 disabled:text-slate-700 rounded-lg transition text-slate-300"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomeTransactionTable;
