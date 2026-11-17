import { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) =>
  value
    ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const supportsWithdrawals = (investment) => {
  const type = String(investment.type || "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
  return (
    type === "FD" ||
    type === "RD" ||
    type.includes("MUTUALFUND") ||
    type.startsWith("MF")
  );
};

export default function InvestmentTable({
  data,
  isLoading,
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  onWithdraw,
  onHistory,
  onView,
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filtered = useMemo(
    () =>
      data.filter(
        (item) =>
          (!search ||
            `${item.title} ${item.type}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!status || item.status === status),
      ),
    [data, search, status],
  );
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const cell = "px-4 py-3.5 text-sm";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Investment portfolio</h2>
          <p className="mt-1 text-sm text-slate-400">
            Review and manage your investments
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search investments"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-slate-200 focus:outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-400 sm:w-52"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              {[
                "Investment",
                "Type",
                "Initial amount",
                "Current value",
                "Valuation",
                "Maturity value",
                "Maturity date",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className={`${cell} ${heading === "Actions" ? "text-center" : "text-left"} text-xs font-semibold uppercase tracking-wide text-slate-400`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Loading investments…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800/80 transition hover:bg-slate-800/30"
                >
                  <td className={`${cell} font-medium text-slate-100`}>
                    {item.title}
                    {item.goal_id && (
                      <span className="ml-2 rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] text-blue-200">
                        Goal linked
                      </span>
                    )}
                    <div className="mt-1 text-xs text-slate-500">
                      Started {date(item.start_date)}
                    </div>
                  </td>
                  <td className={cell}>
                    <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-xs font-semibold text-blue-200">
                      {item.type}
                    </span>
                  </td>
                  <td className={`${cell} font-medium text-slate-200`}>
                    {money(item.initial_amount)}
                  </td>
                  <td className={`${cell} font-semibold text-emerald-300`}>
                    {item.current_value == null
                      ? "—"
                      : money(item.current_value)}
                  </td>
                  <td className={`${cell} text-slate-300`}>
                    <span className="text-xs">
                      {item.valuation_method || "—"}
                    </span>
                    <div className="mt-1 text-xs text-slate-500">
                      {date(item.valuation_date)}
                    </div>
                  </td>
                  <td className={`${cell} font-semibold text-blue-300`}>
                    {money(item.maturity_value)}
                  </td>
                  <td className={`${cell} text-slate-300`}>
                    {date(item.maturity_date)}
                  </td>
                  <td className={cell}>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-300" : item.status === "COMPLETED" ? "bg-sky-500/10 text-sky-300" : "bg-slate-700 text-slate-300"}`}
                    >
                      {item.status?.toLowerCase()}
                    </span>
                  </td>
                  <td className={cell}>
                    <div className="flex justify-end gap-1">
                      {item.status === "ACTIVE" &&
                        supportsWithdrawals(item) && (
                          <button
                            type="button"
                            onClick={() => onWithdraw(item)}
                            aria-label={`Withdraw from ${item.title}`}
                            title="Withdraw"
                            className="rounded-lg px-2 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
                          >
                            Withdraw
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => onHistory(item)}
                        aria-label={`View transaction history for ${item.title}`}
                        title="History"
                        className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-700/50"
                      >
                        <FiClock size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onView(item)}
                        aria-label={`View details for ${item.title}`}
                        title="View details"
                        className="rounded-lg p-2 text-violet-300 transition hover:bg-violet-400/10"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        aria-label={`Edit ${item.title}`}
                        title="Edit"
                        className="rounded-lg p-2 text-blue-300 transition hover:bg-blue-400/10"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        aria-label={`Delete ${item.title}`}
                        title="Delete"
                        className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/10"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {search || status
                    ? "No investments match your filters"
                    : "No investments yet. Add one to start tracking your portfolio."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <p className="text-xs text-slate-500">
          Showing {totalItems ? (currentPage - 1) * pageSize + 1 : 0}–
          {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 disabled:text-slate-700"
          >
            <FiChevronLeft />
          </button>
          <span className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 disabled:text-slate-700"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
