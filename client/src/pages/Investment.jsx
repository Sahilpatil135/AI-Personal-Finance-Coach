import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiPlus,
  FiTarget,
  FiTrendingUp,
  FiDollarSign,
} from "react-icons/fi";
import toast from "react-hot-toast";
import InvestmentForm from "../components/InvestmentForm";
import InvestmentTable from "../components/InvestmentTable";
import InvestmentTypeChart from "../components/InvestmentTypeChart";
import { investmentService } from "../services/investmentService";

const PAGE_SIZE = 10;
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const date = (value) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

function upcomingDaysInMonth() {
  const today = new Date();
  const daysLeft =
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() -
    today.getDate();
  return Math.max(1, daysLeft);
}

export default function Investment() {
  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [maturities, setMaturities] = useState([]);
  const [records, setRecords] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const daysThisMonth = upcomingDaysInMonth();

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      try {
        const [
          nextSummary,
          nextDistribution,
          nextContributions,
          nextMaturities,
          nextPage,
        ] = await Promise.all([
          investmentService.getSummary(),
          investmentService.getTypeDistribution(),
          investmentService.getUpcomingContributions(daysThisMonth),
          investmentService.getUpcomingMaturities(30),
          investmentService.getPaginated(
            (currentPage - 1) * PAGE_SIZE,
            PAGE_SIZE,
          ),
        ]);
        if (!isCurrent) return;
        setSummary(nextSummary);
        setDistribution(nextDistribution);
        setContributions(nextContributions);
        setMaturities(nextMaturities);
        setRecords(nextPage.records);
        setTotalItems(nextPage.total);
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching investment data:", error);
          toast.error("Failed to fetch investment data");
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    load();
    return () => {
      isCurrent = false;
    };
  }, [currentPage, daysThisMonth, refreshVersion]);

  const saveInvestment = async (data) => {
    if (editing) {
      await investmentService.updateInvestment(editing.id, data);
      toast.success("Investment updated");
    } else {
      await investmentService.addInvestment(data);
      toast.success("Investment added");
    }
    setEditing(null);
    setCurrentPage(1);
    setIsLoading(true);
    setRefreshVersion((version) => version + 1);
  };

  const deleteInvestment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this investment?"))
      return;
    try {
      await investmentService.deleteInvestment(id);
      toast.success("Investment deleted");
      if (records.length === 1 && currentPage > 1)
        setCurrentPage((page) => page - 1);
      else {
        setIsLoading(true);
        setRefreshVersion((version) => version + 1);
      }
    } catch (error) {
      console.error("Error deleting investment:", error);
      toast.error("Failed to delete investment");
    }
  };

  const statCards = [
    {
      title: "Total initial amount",
      value: money(summary?.total_initial_amount),
      note: `${summary?.active_investments || 0} active investments`,
      icon: FiDollarSign,
      borderColor: "border-l-blue-500",
      iconBackground: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      title: "Total current value",
      value: money(summary?.total_current_value),
      note: "Sum of latest recorded valuations",
      icon: FiDollarSign,
      borderColor: "border-l-emerald-500",
      iconBackground: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      title: "Expected maturity value",
      value: money(summary?.total_expected_maturity_value),
      note: "Across your full portfolio",
      icon: FiTrendingUp,
      borderColor: "border-l-orange-500",
      iconBackground: "bg-orange-500/10",
      iconColor: "text-orange-400",
    },
    {
      title: "Investments linked to goals",
      value: summary?.goal_linked_investments ?? 0,
      note: "Linked with a savings goal",
      icon: FiTarget,
      borderColor: "border-l-purple-500",
      iconBackground: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
    {
      title: "Upcoming maturity",
      value: maturities.length,
      note: "Within the next 30 days",
      icon: FiClock,
      borderColor: "border-l-cyan-500",
      iconBackground: "bg-cyan-500/10",
      iconColor: "text-cyan-400",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans text-slate-100 sm:p-6">
      <main className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-400/10 p-3 text-blue-500">
              <FiTrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400/80">
                Build your future
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Investment Tracker
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                A clearer view of your portfolio and what’s coming next.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-400"
          >
            <FiPlus size={18} /> Add investment
          </button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map(
            (
              {
                title,
                value,
                note,
                icon: Icon,
                borderColor,
                iconBackground,
                iconColor,
              },
              index,
            ) => (
              <div
                key={title}
                className={`rounded-2xl border border-slate-800/80 border-l-4 ${borderColor} bg-slate-900/60 p-6 shadow-xl`}
              >                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400">
                      {title}
                    </p>
                    <p
                      className={`mt-2 text-2xl font-bold ${index === 1 ? "text-blue-300" : "text-white"}`}
                    >
                      {isLoading ? "—" : value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{note}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${iconBackground}`}>
                    <Icon className={`text-2xl ${iconColor}`} />
                  </div>
                </div>
              </div>
            ),
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Upcoming contributions
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Scheduled for the rest of this month
                </p>
              </div>
              <span className="rounded-full bg-blue-300/10 px-3 py-1 text-xs font-medium text-blue-200">
                {contributions.length} scheduled
              </span>
            </div>
            <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[510px]">
                <thead className="sticky top-0 bg-slate-800/90 backdrop-blur">
                  <tr>
                    {["Investment", "Type", "Amount", "Date"].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
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
                        colSpan="4"
                        className="px-3 py-8 text-center text-sm text-slate-500"
                      >
                        Loading contributions…
                      </td>
                    </tr>
                  ) : contributions.length ? (
                    contributions.map((item) => (
                      <tr
                        key={`${item.investment_id}-${item.next_contribution_date}`}
                        className="border-t border-slate-800/80 hover:bg-slate-800/30"
                      >
                        <td className="px-3 py-3 text-sm font-medium text-slate-200">
                          {item.investment_title}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-blue-400/10 px-2 py-1 text-xs text-blue-200">
                            {item.investment_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-blue-300">
                          {money(item.contribution_amount)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-400">
                          {date(item.next_contribution_date)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-3 py-10 text-center">
                        <FiClock
                          className="mx-auto mb-2 text-slate-600"
                          size={20}
                        />
                        <span className="text-sm text-slate-500">
                          No contributions scheduled for the rest of this month
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
          <InvestmentTypeChart data={distribution} />
        </section>

        <InvestmentTable
          data={records}
          isLoading={isLoading}
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={(page) => {
            setIsLoading(true);
            setCurrentPage(page);
          }}
          onEdit={(item) => {
            setEditing(item);
            setFormOpen(true);
          }}
          onDelete={deleteInvestment}
        />
      </main>

      {formOpen && (
        <InvestmentForm
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveInvestment}
          editingData={editing}
        />
      )}
    </div>
  );
}
