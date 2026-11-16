import { useEffect, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiClock,
  FiDollarSign,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTarget,
  FiTrash2,
  FiTrendingUp,
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi";
import toast from "react-hot-toast";
import GoalDetails from "../components/GoalDetails";
import GoalForm from "../components/GoalForm";
import GoalProgressBar from "../components/GoalProgressBar";
import { goalService } from "../services/goalService";
import { investmentService } from "../services/investmentService";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
        "en-IN",
        { day: "2-digit", month: "short", year: "numeric" },
      )
    : "—";
const categoryOptions = [
  "Education",
  "Travel",
  "Gadgets",
  "Emergency Fund",
  "Vehicle",
  "Other",
];
const sortOptions = [
  { value: "created_at", label: "Recently Created" },
  { value: "target_amount", label: "Target Amount" },
  { value: "progress", label: "Progress" },
  { value: "deadline", label: "Deadline" },
  { value: "priority", label: "Priority" },
  { value: "goal_name", label: "Goal Name" },
];
const defaultSortOrders = {
  created_at: "desc",
  target_amount: "desc",
  progress: "desc",
  deadline: "asc",
  priority: "desc",
  goal_name: "asc",
};
const priorityRank = { LOW: 1, MEDIUM: 2, HIGH: 3 };

function dateKey(value) {
  const dateValue = value instanceof Date ? value : new Date(value);
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(dateValue, months) {
  const targetMonth = new Date(
    dateValue.getFullYear(),
    dateValue.getMonth() + months,
    1,
  );
  const lastDay = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate();
  targetMonth.setDate(Math.min(dateValue.getDate(), lastDay));
  return targetMonth;
}

function sortOrderLabel(sortBy, order) {
  const isAscending = order === "asc";
  if (sortBy === "created_at")
    return isAscending ? "Oldest to newest" : "Newest to oldest";
  if (sortBy === "deadline")
    return isAscending ? "Earliest to latest" : "Latest to earliest";
  if (sortBy === "goal_name") return isAscending ? "A to Z" : "Z to A";
  return isAscending ? "Low to high" : "High to low";
}

function priorityStyle(priority) {
  if (priority === "HIGH") return "bg-rose-500/10 text-rose-300";
  if (priority === "LOW") return "bg-slate-700 text-slate-300";
  return "bg-amber-400/10 text-amber-200";
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formGoal, setFormGoal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [availableInvestments, setAvailableInvestments] = useState([]);
  const [loadingInvestments, setLoadingInvestments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState(defaultSortOrders.created_at);

  const today = new Date();
  const todayKey = dateKey(today);
  const endOfMonthKey = dateKey(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );
  const threeMonthsFromNowKey = dateKey(addMonths(today, 3));
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const visibleGoals = goals
    .filter((goal) => {
      const matchesSearch =
        !normalizedSearch ||
        `${goal.goal_name || ""} ${goal.description || ""}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      const matchesCategory =
        !categoryFilter || goal.category === categoryFilter;
      const goalStatus = goal.lifecycle_status || goal.status;
      const matchesStatus = !statusFilter || goalStatus === statusFilter;
      const matchesPriority =
        !priorityFilter || goal.priority === priorityFilter;
      const deadline = String(goal.deadline || "").slice(0, 10);
      const isOverdue =
        goalStatus === "IN_PROGRESS" &&
        (goal.days_remaining < 0 || deadline < todayKey);
      const matchesDeadline =
        !deadlineFilter ||
        (deadlineFilter === "overdue" && isOverdue) ||
        (deadlineFilter === "this_month" &&
          deadline >= todayKey &&
          deadline <= endOfMonthKey) ||
        (deadlineFilter === "three_months" &&
          deadline > endOfMonthKey &&
          deadline <= threeMonthsFromNowKey) ||
        (deadlineFilter === "upcoming" && deadline > threeMonthsFromNowKey);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority &&
        matchesDeadline
      );
    })
    .sort((left, right) => {
      let comparison = 0;
      if (sortBy === "created_at") {
        comparison =
          new Date(left.created_at || 0).getTime() -
          new Date(right.created_at || 0).getTime();
      } else if (sortBy === "target_amount") {
        comparison =
          Number(left.target_amount || 0) - Number(right.target_amount || 0);
      } else if (sortBy === "progress") {
        comparison =
          Number(left.completion_percentage || 0) -
          Number(right.completion_percentage || 0);
      } else if (sortBy === "deadline") {
        comparison = String(left.deadline || "").localeCompare(
          String(right.deadline || ""),
        );
      } else if (sortBy === "priority") {
        comparison =
          (priorityRank[left.priority] || 0) -
          (priorityRank[right.priority] || 0);
      } else if (sortBy === "goal_name") {
        comparison = String(left.goal_name || "").localeCompare(
          String(right.goal_name || ""),
          undefined,
          { sensitivity: "base" },
        );
      }
      return (
        (sortOrder === "asc" ? comparison : -comparison) ||
        Number(left.id) - Number(right.id)
      );
    });

  const hasActiveFilters =
    searchQuery ||
    categoryFilter ||
    statusFilter ||
    deadlineFilter ||
    priorityFilter;
  const resetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setStatusFilter("");
    setDeadlineFilter("");
    setPriorityFilter("");
  };

  const load = async () => {
    const [nextGoals, nextSummary] = await Promise.all([
      goalService.getAll(),
      goalService.getSummary(),
    ]);
    setGoals(nextGoals);
    setSummary(nextSummary);
    return nextGoals;
  };

  useEffect(() => {
    let active = true;
    const fetchGoals = async () => {
      try {
        const [nextGoals, nextSummary] = await Promise.all([
          goalService.getAll(),
          goalService.getSummary(),
        ]);
        if (!active) return;
        setGoals(nextGoals);
        setSummary(nextSummary);
      } catch (error) {
        if (active) {
          console.error("Error fetching goals:", error);
          toast.error("Failed to fetch goals");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchGoals();
    return () => {
      active = false;
    };
  }, []);

  const saveGoal = async (data) => {
    try {
      if (formGoal) {
        await goalService.updateGoal(formGoal.id, data);
        toast.success("Goal updated");
      } else {
        await goalService.addGoal(data);
        toast.success("Goal created");
      }
      setFormGoal(null);
      setCreating(false);
      await load();
    } catch (error) {
      console.error("Error saving goal:", error);
      throw error;
    }
  };

  const deleteGoal = async (goal) => {
    if (
      !window.confirm(
        `Delete the goal "${goal.goal_name}"? Linked investments will remain in your portfolio but be unlinked.`,
      )
    )
      return;
    try {
      await goalService.deleteGoal(goal.id);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
      const [nextGoals, nextSummary] = await Promise.all([
        goalService.getAll(),
        goalService.getSummary(),
      ]);
      setGoals(nextGoals);
      setSummary(nextSummary);
      toast.success("Goal deleted");
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  const openDetails = async (goal) => {
    setSelectedGoal(goal);
    setLoadingInvestments(true);
    try {
      const [detail, investments] = await Promise.all([
        goalService.getById(goal.id),
        investmentService.getAll(),
      ]);
      setSelectedGoal(detail);
      setAvailableInvestments(
        investments.filter((item) => item.goal_id == null),
      );
    } catch (error) {
      console.error("Error fetching goal details:", error);
      toast.error("Failed to load goal details");
      setSelectedGoal(null);
    } finally {
      setLoadingInvestments(false);
    }
  };

  const refreshSelectedGoal = async () => {
    const [nextGoals, nextSummary] = await Promise.all([
      goalService.getAll(),
      goalService.getSummary(),
    ]);
    setGoals(nextGoals);
    setSummary(nextSummary);
    if (selectedGoal) {
      setSelectedGoal(
        nextGoals.find((goal) => goal.id === selectedGoal.id) || null,
      );
    }
  };

  const changeLifecycleStatus = async (goal, status) => {
    try {
      await goalService.updateGoal(goal.id, { status });
      const [nextGoals, nextSummary, detail] = await Promise.all([
        goalService.getAll(),
        goalService.getSummary(),
        goalService.getById(goal.id),
      ]);
      setGoals(nextGoals);
      setSummary(nextSummary);
      setSelectedGoal(detail);
      toast.success(
        status === "COMPLETED" ? "Goal marked completed" : "Goal cancelled",
      );
    } catch (error) {
      console.error("Error updating goal status:", error);
      toast.error("Failed to update goal status");
    }
  };

  const linkInvestment = async (investmentId) => {
    try {
      await investmentService.updateInvestment(investmentId, {
        goal_id: selectedGoal.id,
      });
      await refreshSelectedGoal();
      setAvailableInvestments((items) =>
        items.filter((item) => item.id !== investmentId),
      );
      toast.success("Investment linked to goal");
    } catch (error) {
      console.error("Error linking investment:", error);
      toast.error("Failed to link investment");
    }
  };

  const unlinkInvestment = async (investmentId) => {
    try {
      await investmentService.updateInvestment(investmentId, { goal_id: null });
      await refreshSelectedGoal();
      const investments = await investmentService.getAll();
      setAvailableInvestments(
        investments.filter((item) => item.goal_id == null),
      );
      toast.success("Investment unlinked from goal");
    } catch (error) {
      console.error("Error unlinking investment:", error);
      toast.error("Failed to unlink investment");
    }
  };

  const cards = [    
    {
      title: "Active goals",
      value: summary?.active_goals ?? 0,
      note: "Goals currently in progress",
      icon: FiClock,
      color: "text-purple-400",
      background: "bg-purple-500/10",
      border: "border-l-purple-500",
    },
    {
      title: "Overall goal progress",
      value: `${summary?.overall_goal_progress ?? 0}%`,
      note: "Progress across all goals",
      icon: FiTrendingUp,
      color: "text-emerald-400",
      background: "bg-emerald-500/10",
      border: "border-l-emerald-500",
    },
    {
      title: "Goals at risk",
      // value: goals.filter((goal) => goal.progress_status === "AT_RISK").length,
      value: summary?.risky_goals ?? 0,
      note: "Goals with a monthly savings shortfall",
      icon: FiTarget,
      color: "text-orange-400",
      background: "bg-orange-500/10",
      border: "border-l-orange-500",
    },
    {
      title: "Remaining amount",
      value: money(summary?.remaining_amount),
      note: "Amount needed to reach all goals",
      icon: FiDollarSign,
      color: "text-cyan-400",
      background: "bg-cyan-500/10",
      border: "border-l-cyan-400",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans text-slate-100 sm:p-6">
      <main className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-purple-500/20 p-3 text-purple-500">
              <FiTarget size={24} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
                Plan with purpose
              </p>
              <h1 className="mt-1 text-3xl font-bold text-white">
                Financial Goals
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Track progress towards every target.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormGoal(null);
              setCreating(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 font-semibold text-white hover:bg-purple-400"
          >
            <FiPlus size={18} /> Create goal
          </button>
        </header>

        <section
          aria-label="Goal summary"
          className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {cards.map(
            ({ title, value, note, icon: Icon, color, background, border }) => (
              <article
                key={title}
                className={`rounded-2xl border border-slate-800/80 border-l-4 ${border} bg-slate-900/60 p-6 shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400">
                      {title}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {loading ? "—" : value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{note}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${background}`}>
                    <Icon className={`${color} text-2xl`} />
                  </div>
                </div>
              </article>
            ),
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Goals</h2>
            {!loading && (
              <span className="text-sm text-slate-400">
                Showing {visibleGoals.length} of {goals.length} goals
              </span>
            )}
          </div>
          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
              Loading goals…
            </div>
          ) : goals.length ? (
            <>
              <div className="mb-5 flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
                {/* LEFT SECTION - SEARCH & FILTERS */}
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 lg:max-w-3xl lg:grid-cols-4 lg:gap-x-5">
                  {/* Search */}
                  <label className="col-span-2 block min-w-0 text-xs font-medium text-slate-400 lg:col-span-4">
                    Search goals
                    <span className="relative mt-1.5 block">
                      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Name or description"
                        aria-label="Search goals by name or description"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                      />
                    </span>
                  </label>

                  {/* Category */}
                  <label className="block min-w-0 text-xs font-medium text-slate-400 lg:col-span-1">
                    Category
                    <select
                      value={categoryFilter}
                      onChange={(event) =>
                        setCategoryFilter(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg cursor-pointer border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="">All categories</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Status */}
                  <label className="block min-w-0 text-xs font-medium text-slate-400 lg:col-span-1">
                    Status
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="mt-1.5 w-full rounded-lg cursor-pointer border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="">All statuses</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </label>

                  {/* Deadline */}
                  <label className="block min-w-0 text-xs font-medium text-slate-400 lg:col-span-1">
                    Deadline
                    <select
                      value={deadlineFilter}
                      onChange={(event) =>
                        setDeadlineFilter(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg cursor-pointer border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="">Any deadline</option>
                      <option value="overdue">Overdue</option>
                      <option value="this_month">Due this month</option>
                      <option value="three_months">Due in 3 months</option>
                      <option value="upcoming">Upcoming</option>
                    </select>
                  </label>

                  {/* Priority */}
                  <label className="block min-w-0 text-xs font-medium text-slate-400 lg:col-span-1">
                    Priority
                    <select
                      value={priorityFilter}
                      onChange={(event) =>
                        setPriorityFilter(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg cursor-pointer border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="">All priorities</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </label>
                </div>

                {/* RIGHT SECTION - SORTING */}
                <div className="flex shrink-0 items-end gap-3 lg:gap-5 lg:ml-auto justify-end">
                  <label className="block min-w-0 w-64 text-xs font-medium text-slate-400 sm:w-48">
                    Sort By
                    <select
                      value={sortBy}
                      onChange={(event) => {
                        setSortBy(event.target.value);
                        setSortOrder(defaultSortOrders[event.target.value]);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 cursor-pointer focus:border-purple-400 focus:outline-none"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0 w-auto text-xs font-medium text-slate-400 sm:w-10">Order
                    <button
                      type="button"
                      onClick={() =>
                        setSortOrder((current) =>
                          current === "asc" ? "desc" : "asc",
                        )
                      }
                      aria-label={`Sort order: ${sortOrderLabel(sortBy, sortOrder)}. Click to reverse.`}
                      title={sortOrderLabel(sortBy, sortOrder)}
                      className="group relative mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-200 cursor-pointer hover:border-purple-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
                    >
                      {sortOrder === "asc" ? (
                        <FiArrowUp aria-hidden="true" />
                      ) : (
                        <FiArrowDown aria-hidden="true" />
                      )}
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      >
                        {sortOrderLabel(sortBy, sortOrder)}
                      </span>
                    </button>
                  </label>
                </div>
              </div>

              {visibleGoals.length ? (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {visibleGoals.map((goal) => (
                    <article
                      key={goal.id}
                      onClick={(event) => {
                        if (
                          event.target.closest(
                            "button, a, input, select, textarea",
                          )
                        ) {
                          return;
                        }
                        openDetails(goal);
                      }}
                      className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg transition hover:border-blue-400/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {goal.category}
                          </p>
                          <h3 className="mt-1 truncate text-lg font-bold text-white">
                            {goal.goal_name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyle(goal.priority)}`}
                          >
                            {goal.priority?.toUpperCase()} Priority
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${goal.lifecycle_status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-300" : goal.lifecycle_status === "CANCELLED" ? "bg-slate-700 text-slate-300" : "bg-blue-400/10 text-blue-200"}`}
                          >                            
                            {goal.lifecycle_status
                              ?.replace("_", " ")
                              .toUpperCase()}
                          </span>
                          {goal.progress_status && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${goal.progress_status === "ON_TRACK" ? "bg-emerald-500/10 text-emerald-300" : goal.progress_status === "NEEDS_ATTENTION" ? "bg-amber-400/10 text-amber-200" : "bg-rose-500/10 text-rose-300"}`}
                            >
                              {goal.progress_status
                                .replace("_", " ")
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-slate-400">Progress</span>
                        <strong>{goal.completion_percentage}%</strong>
                      </div>
                      <div className="mt-2">
                        <GoalProgressBar goal={goal} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400">
                          Latest investment valuation:{" "}
                          {date(goal.valuation_date)}
                        </span>
                        {(goal.linked_investments || []).some((investment) => {
                          if (investment.current_value == null) return false;
                          if (!investment.valuation_date) return true;
                          const age =
                            Date.now() -
                            new Date(
                              `${investment.valuation_date}T00:00:00Z`,
                            ).getTime();
                          return age > 30 * 24 * 60 * 60 * 1000;
                        }) && (
                          <span className="text-amber-300">
                            Valuation may be outdated
                          </span>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-slate-500">Target</p>
                          <p className="mt-1 font-medium">
                            {money(goal.target_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">
                            Cash allocated
                          </p>
                          <p className="mt-1 font-medium">
                            {money(goal.cash_allocated)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">
                            Linked investment value
                          </p>
                          <p className="mt-1 font-medium">
                            {money(goal.linked_investment_value)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">
                            Total goal funds
                          </p>
                          <p className="mt-1 font-semibold text-emerald-300">
                            {money(goal.total_goal_funds)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Remaining</p>
                          <p className="mt-1 font-medium">
                            {money(goal.remaining_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Deadline</p>
                          <p className="mt-1 font-medium">
                            {date(goal.deadline)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                        <p
                          className={`text-xs font-medium ${goal.lifecycle_status === "COMPLETED" || goal.progress_status === "ON_TRACK" ? "text-emerald-300" : goal.progress_status === "OVERDUE" || goal.progress_status === "AT_RISK" ? "text-rose-300" : "text-amber-300"}`}
                        >
                          {goal.lifecycle_status === "COMPLETED"
                            ? "Goal reached"
                            : goal.lifecycle_status === "CANCELLED"
                              ? "Cancelled"
                              : goal.progress_status
                                  ?.replace("_", " ")
                                  .toUpperCase()}
                          {" · "}
                          {goal.days_remaining < 0
                            ? `${Math.abs(goal.days_remaining)} Days overdue`
                            : `${goal.days_remaining} Days left`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(goal)}
                            className="rounded-lg bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-400/20"
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormGoal(goal);
                              setCreating(true);
                            }}
                            aria-label={`Edit ${goal.goal_name}`}
                            className="rounded-lg p-2 text-amber-200 hover:bg-amber-400/10"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGoal(goal)}
                            aria-label={`Delete ${goal.goal_name}`}
                            className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"
                          >
                            <FiTrash2 />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toast("AI goal advice is coming soon.")
                            }
                            className="rounded-lg bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-400/20"
                          > 
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-300">                           
                              Generate AI advice                               
                              <HiOutlineSparkles className="h-3.5 w-3.5 text-violet-300" />
                            </span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-10 text-center">
                  <h3 className="font-semibold text-slate-200">
                    No matching goals
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or filters.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-400"
                    >
                      Clear search and filters
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
              <FiTarget className="mx-auto text-3xl text-slate-600" />
              <h3 className="mt-3 font-semibold text-slate-200">
                No goals yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Create a goal to start tracking its cash and investment funds.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFormGoal(null);
                  setCreating(true);
                }}
                className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Create your first goal
              </button>
            </div>
          )}
        </section>
      </main>

      {creating && (
        <GoalForm
          goal={formGoal}
          onClose={() => {
            setCreating(false);
            setFormGoal(null);
          }}
          onSubmit={saveGoal}
        />
      )}
      {selectedGoal && (
        <GoalDetails
          goal={selectedGoal}
          availableInvestments={availableInvestments}
          isLoadingInvestments={loadingInvestments}
          onClose={() => setSelectedGoal(null)}
          onLink={linkInvestment}
          onUnlink={unlinkInvestment}
          onLifecycleStatusChange={(status) =>
            changeLifecycleStatus(selectedGoal, status)
          }
        />
      )}
    </div>
  );
}
