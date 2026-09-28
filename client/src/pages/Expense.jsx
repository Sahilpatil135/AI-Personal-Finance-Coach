import { useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiTrendingDown } from 'react-icons/fi';
import toast from 'react-hot-toast';

import { expenseService } from '../services/expenseService';
import ExpenseEntryForm from '../components/ExpenseEntryForm';
import ExpenseTrendChart from '../components/ExpenseTrendChart';
import ExpenseCategoryChart from '../components/ExpenseCategoryChart';

const money = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const chip = {
    Food: 'bg-amber-500/10 text-amber-300',
    Rent: 'bg-blue-500/10 text-blue-300',
    Utilities: 'bg-cyan-500/10 text-cyan-300',
    Tech: 'bg-violet-500/10 text-violet-300',
};

export default function Expense() {
    const [timeframe, setTimeframe] = useState('month');

    const [stats, setStats] = useState(null);
    const [budget, setBudget] = useState(0);
    const [trends, setTrends] = useState([]);
    const [categories, setCategories] = useState([]);
    const [records, setRecords] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [budgetOpen, setBudgetOpen] = useState(false);
    const [budgetValue, setBudgetValue] = useState('');
    const [editing, setEditing] = useState(null);

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [mode, setMode] = useState('');

    const load = async () => {
        try {
            const [
                nextStats,
                nextBudget,
                nextTrends,
                nextCategories,
                nextRecords,
            ] = await Promise.all([
                expenseService.getStats(),
                expenseService.getBudget(),
                expenseService.getTrends(timeframe),
                expenseService.getCategories(timeframe),
                expenseService.getPaginated(),
            ]);

            setStats(nextStats);
            setBudget(nextBudget.amount);
            setBudgetValue(String(nextBudget.amount || ''));
            setTrends(nextTrends);
            setCategories(nextCategories);
            setRecords(nextRecords.records || []);
        } catch {
            toast.error('Failed to fetch expense data');
        }
    };

    useEffect(() => {
        load();
    }, [timeframe]);

    const saveExpense = async (data) => {
        if (editing) {
            await expenseService.updateExpense(editing.id, data);
        } else {
            await expenseService.addExpense(data);
        }

        setEditing(null);
        await load();

        toast.success(editing ? 'Expense updated' : 'Expense added');
    };

    const saveBudget = async (event) => {
        event.preventDefault();

        if (!budgetValue || Number(budgetValue) < 0) {
            return;
        }

        const result = await expenseService.setBudget(Number(budgetValue));

        setBudget(result.amount);
        setBudgetOpen(false);

        toast.success('Budget saved');
    };

    const filtered = records.filter(
        (item) =>
            (!search ||
                `${item.category} ${item.description || ''}`
                    .toLowerCase()
                    .includes(search.toLowerCase())) &&
            (!category || item.category === category) &&
            (!mode || item.payment_mode === mode)
    );

    const pacing = budget
        ? Math.min(((stats?.month_total || 0) / budget) * 100, 100)
        : 0;

    const pacingColor =
        pacing > 90
            ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
            : pacing >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500';

    const categoriesInRows = [
        ...new Set(records.map((item) => item.category)),
    ];

    return (
        <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-100">
            <main className="mx-auto max-w-7xl">

                {/* Header */}
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-rose-500/10 p-3 text-rose-400">
                            <FiTrendingDown size={25} />
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold">
                                Expense Tracker
                            </h1>

                            <p className="mt-1 text-slate-400">
                                Manage your spending and stay within your limits
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400"
                    >
                        <FiPlus />
                        Add Expense
                    </button>
                </header>

                {/* Stats */}
                <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                        [
                            'Total Spent (YTD)',
                            stats?.total_expense,
                            'Cumulative spending for the financial year.',
                        ],
                        [
                            "This Month's Expenses",
                            stats?.month_total,
                            'Total debits logged since the 1st of the month.',
                        ],
                        [
                            'MoM Spending Velocity',
                            `${(stats?.mom_growth || 0).toFixed(1)}%`,
                            'Compared with the previous month.',
                        ],
                        [
                            'Largest Expense',
                            stats?.largest_expense,
                            'Largest debit logged this month.',
                        ],
                    ].map(([title, value, note], index) => (
                        <div
                            key={title}
                            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {title}
                            </p>

                            <p
                                className={`mt-3 text-2xl font-bold ${index === 1 || index === 2
                                        ? 'text-rose-400'
                                        : 'text-white'
                                    }`}
                            >
                                {index === 2 ? value : money(value)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                {note}
                            </p>
                        </div>
                    ))}
                </section>

                {/* Budget */}
                <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-300">
                            Monthly Budget:{' '}
                            <strong>{money(stats?.month_total)}</strong> spent
                            of <strong>{money(budget)}</strong>
                        </p>

                        <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
                            {budget
                                ? money(
                                    Math.max(
                                        budget -
                                        (stats?.month_total || 0),
                                        0
                                    )
                                ) + ' left'
                                : 'No budget set'}
                        </span>
                    </div>

                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                            className={`h-full ${pacingColor}`}
                            style={{ width: `${pacing}%` }}
                        />
                    </div>
                </section>

                {/* Controls */}
                <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
                    <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-1">
                        <button
                            onClick={() => setTimeframe('month')}
                            className={`rounded-lg px-4 py-2 text-sm ${timeframe === 'month'
                                    ? 'bg-rose-500 text-white'
                                    : 'text-slate-400'
                                }`}
                        >
                            This Month
                        </button>

                        <button
                            onClick={() => setTimeframe('year')}
                            className={`rounded-lg px-4 py-2 text-sm ${timeframe === 'year'
                                    ? 'bg-rose-500 text-white'
                                    : 'text-slate-400'
                                }`}
                        >
                            This Year
                        </button>
                    </div>

                    <button
                        onClick={() => setBudgetOpen(true)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
                    >
                        Set/Edit Budget
                    </button>
                </div>

                {/* Charts */}
                <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
                    <ExpenseTrendChart data={trends} />
                    <ExpenseCategoryChart data={categories} />
                </div>

                {/* Expense History */}
                <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h2 className="mb-4 text-lg font-bold">
                        Expense History
                    </h2>

                    {/* Filters */}
                    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search expenses..."
                            className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm"
                        />

                        <select
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value)
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm"
                        >
                            <option value="">All Categories</option>

                            {categoriesInRows.map((item) => (
                                <option key={item}>{item}</option>
                            ))}
                        </select>

                        <select
                            value={mode}
                            onChange={(event) => setMode(event.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm"
                        >
                            <option value="">All Payment Modes</option>

                            {['Cash', 'Debit Card', 'Online/UPI'].map(
                                (item) => (
                                    <option key={item}>{item}</option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-700 text-slate-400">
                                <tr>
                                    <th className="px-3 py-3">Date</th>
                                    <th className="px-3 py-3">Category</th>
                                    <th className="px-3 py-3">
                                        Payment Mode
                                    </th>
                                    <th className="px-3 py-3">
                                        Description
                                    </th>
                                    <th className="px-3 py-3 text-right">
                                        Amount
                                    </th>
                                    <th />
                                </tr>
                            </thead>

                            <tbody>
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-slate-800"
                                    >
                                        <td className="px-3 py-3 text-slate-300">
                                            {item.date}
                                        </td>

                                        <td className="px-3 py-3">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs ${chip[item.category] ||
                                                    'bg-slate-800 text-slate-300'
                                                    }`}
                                            >
                                                {item.category}
                                            </span>
                                        </td>

                                        <td className="px-3 py-3 text-slate-400">
                                            {item.payment_mode}
                                        </td>

                                        <td className="px-3 py-3 text-slate-400">
                                            {item.description || '-'}
                                        </td>

                                        <td className="px-3 py-3 text-right font-semibold text-rose-400">
                                            -{money(item.amount)}
                                        </td>

                                        <td className="px-3 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    title="Edit"
                                                    onClick={() => {
                                                        setEditing(item);
                                                        setFormOpen(true);
                                                    }}
                                                    className="text-slate-400 hover:text-cyan-400"
                                                >
                                                    <FiEdit2 />
                                                </button>

                                                <button
                                                    title="Delete"
                                                    onClick={async () => {
                                                        if (
                                                            window.confirm(
                                                                'Delete this expense?'
                                                            )
                                                        ) {
                                                            await expenseService.deleteExpense(
                                                                item.id
                                                            );
                                                            load();
                                                        }
                                                    }}
                                                    className="text-slate-400 hover:text-rose-400"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {!filtered.length && (
                            <p className="py-8 text-center text-slate-500">
                                No expense records found
                            </p>
                        )}
                    </div>
                </section>

                {/* Expense Form */}
                <ExpenseEntryForm
                    isOpen={formOpen}
                    onClose={() => {
                        setFormOpen(false);
                        setEditing(null);
                    }}
                    onSubmit={saveExpense}
                    editingData={editing}
                />

                {/* Budget Modal */}
                {budgetOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <form
                            onSubmit={saveBudget}
                            className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6"
                        >
                            <h2 className="mb-4 text-xl font-bold">
                                Monthly Budget
                            </h2>

                            <input
                                autoFocus
                                type="number"
                                min="0"
                                step="0.01"
                                value={budgetValue}
                                onChange={(event) =>
                                    setBudgetValue(event.target.value)
                                }
                                className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setBudgetOpen(false)}
                                    className="px-3 py-2 text-sm text-slate-400"
                                >
                                    Cancel
                                </button>

                                <button className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold">
                                    Save Budget
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}