import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { expenseService } from "../services/expenseService";
import { goalService } from "../services/goalService";
import { incomeService } from "../services/incomeService";
import { investmentService } from "../services/investmentService";
import {
  calculateAccountBalance,
  calculateCurrentMonthTotal,
} from "../utils/financeCalculations";

const money = (value) => `₹${Number(value).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const Dashboard = () => {
  const { user } = useAuth();
  const [accountBalance, setAccountBalance] = useState(null);
  const [goalFunds, setGoalFunds] = useState(null);
  const [monthIncome, setMonthIncome] = useState(null);
  const [monthExpenses, setMonthExpenses] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    const loadDashboard = async () => {
      try {
        const [incomes, expenses, investments, goalSummary] = await Promise.all([
          incomeService.getAllIncome(),
          expenseService.getAllExpenses(),
          investmentService.getAll(),
          goalService.getSummary(),
        ]);
        if (!isCurrent) return;

        const totalCashGoalFunds = Number(goalSummary.total_cash_allocated);
        if (!Number.isFinite(totalCashGoalFunds)) {
          throw new Error("Goal summary contains an invalid cash total");
        }
        setAccountBalance(calculateAccountBalance(incomes, expenses, investments));
        setGoalFunds(totalCashGoalFunds);
        setMonthIncome(calculateCurrentMonthTotal(incomes));
        setMonthExpenses(calculateCurrentMonthTotal(expenses));
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching dashboard data:", error);
          toast.error("Failed to fetch dashboard data");
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isCurrent = false;
    };
  }, []);

  const hasGoalFundingRisk = accountBalance !== null
    && goalFunds !== null
    && accountBalance < goalFunds;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100">
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 p-8 shadow-xl backdrop-blur-xl">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-12 -translate-y-12 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 space-y-2">
            <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Student Finance Hub
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Hello, {user?.name || "Student"} 👋
            </h1>
            <p className="max-w-2xl text-sm text-slate-400 sm:text-base">
              Your AI Personal Finance Coach is active. Manage your budgets, track expenses, set savings goals, and get smart AI advice tailored for university students.
            </p>
          </div>
        </div>

        <section aria-label="Account and goal balances" className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-800/80 border-l-4 border-l-emerald-500 bg-slate-900/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account Balance</h2>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {isLoading || accountBalance === null ? "—" : money(accountBalance)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Recorded total income minus expenses and invested contributions: FD principal, RD initial amount plus completed installments, paid Mutual Fund SIPs, and Mutual Fund lumpsum amounts. Contributions already included in expenses are not deducted twice. This is an estimate, not a verified bank balance.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-200">
              Account balance should not be less than goal funds accumulated, as it will risk goal completion.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800/80 border-l-4 border-l-cyan-400 bg-slate-900/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Goal Funds (Cash)</h2>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {isLoading || goalFunds === null ? "—" : money(goalFunds)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Cash allocated across all your goals. Linked investment values are excluded from this cash balance.
            </p>
          </article>
        </section>

        <section aria-label="This month's income and expenses" className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link to="/income" className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 transition hover:border-slate-700/80">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">This Month&apos;s Income</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {isLoading || monthIncome === null ? "—" : money(monthIncome)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Recorded income this calendar month</p>
          </Link>

          <Link to="/expense" className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 transition hover:border-slate-700/80">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">This Month&apos;s Expenses</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {isLoading || monthExpenses === null ? "—" : money(monthExpenses)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Recorded expenses this calendar month</p>
          </Link>
        </section>

        {hasGoalFundingRisk && (
          <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-400/5 p-4 text-sm text-amber-200">
            Your recorded account balance is below the cash allocated to your goals. This may put goal completion at risk.
          </p>
        )}

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 transition-all hover:border-slate-700/80">
          <Link to="/investment" className="block">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Investments</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">Track portfolio</p>
            <p className="mt-1 text-xs text-slate-500">View investment performance and upcoming contributions</p>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 md:flex-row">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Ask your AI Finance Coach</h3>
            <p className="text-sm text-slate-400">Get personalized budgeting advice, student discount recommendations, and financial planning tips.</p>
          </div>
          <button className="whitespace-nowrap rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400">
            Open AI Chatbot
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
