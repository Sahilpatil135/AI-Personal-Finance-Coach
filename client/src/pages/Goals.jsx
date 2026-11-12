import { useEffect, useState } from 'react'
import { FiClock, FiDollarSign, FiEdit2, FiPlus, FiTarget, FiTrash2, FiTrendingUp } from 'react-icons/fi'
import toast from 'react-hot-toast'
import GoalDetails from '../components/GoalDetails'
import GoalForm from '../components/GoalForm'
import GoalProgressBar from '../components/GoalProgressBar'
import { goalService } from '../services/goalService'
import { investmentService } from '../services/investmentService'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

function priorityStyle(priority) {
  if (priority === 'HIGH') return 'bg-rose-500/10 text-rose-300'
  if (priority === 'LOW') return 'bg-slate-700 text-slate-300'
  return 'bg-amber-400/10 text-amber-200'
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formGoal, setFormGoal] = useState(null)
  const [creating, setCreating] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [availableInvestments, setAvailableInvestments] = useState([])
  const [loadingInvestments, setLoadingInvestments] = useState(false)

  const load = async () => {
    const [nextGoals, nextSummary] = await Promise.all([
      goalService.getAll(),
      goalService.getSummary(),
    ])
    setGoals(nextGoals)
    setSummary(nextSummary)
    return nextGoals
  }

  useEffect(() => {
    let active = true
    const fetchGoals = async () => {
      try {
        const [nextGoals, nextSummary] = await Promise.all([
          goalService.getAll(),
          goalService.getSummary(),
        ])
        if (!active) return
        setGoals(nextGoals)
        setSummary(nextSummary)
      } catch (error) {
        if (active) {
          console.error('Error fetching goals:', error)
          toast.error('Failed to fetch goals')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchGoals()
    return () => { active = false }
  }, [])

  const saveGoal = async (data) => {
    try {
      if (formGoal) {
        await goalService.updateGoal(formGoal.id, data)
        toast.success('Goal updated')
      } else {
        await goalService.addGoal(data)
        toast.success('Goal created')
      }
      setFormGoal(null)
      setCreating(false)
      await load()
    } catch (error) {
      console.error('Error saving goal:', error)
      throw error
    }
  }

  const deleteGoal = async (goal) => {
    if (!window.confirm(`Delete the goal "${goal.goal_name}"? Linked investments will remain in your portfolio but be unlinked.`)) return
    try {
      await goalService.deleteGoal(goal.id)
      setGoals((current) => current.filter((item) => item.id !== goal.id))
      const [nextGoals, nextSummary] = await Promise.all([goalService.getAll(), goalService.getSummary()])
      setGoals(nextGoals)
      setSummary(nextSummary)
      toast.success('Goal deleted')
    } catch (error) {
      console.error('Error deleting goal:', error)
      toast.error('Failed to delete goal')
    }
  }

  const openDetails = async (goal) => {
    setSelectedGoal(goal)
    setLoadingInvestments(true)
    try {
      const [detail, investments] = await Promise.all([
        goalService.getById(goal.id),
        investmentService.getAll(),
      ])
      setSelectedGoal(detail)
      setAvailableInvestments(investments.filter((item) => item.goal_id == null))
    } catch (error) {
      console.error('Error fetching goal details:', error)
      toast.error('Failed to load goal details')
      setSelectedGoal(null)
    } finally {
      setLoadingInvestments(false)
    }
  }

  const refreshSelectedGoal = async () => {
    const [nextGoals, nextSummary] = await Promise.all([goalService.getAll(), goalService.getSummary()])
    setGoals(nextGoals)
    setSummary(nextSummary)
    if (selectedGoal) {
      setSelectedGoal(nextGoals.find((goal) => goal.id === selectedGoal.id) || null)
    }
  }

  const changeLifecycleStatus = async (goal, status) => {
    try {
      await goalService.updateGoal(goal.id, { status })
      const [nextGoals, nextSummary, detail] = await Promise.all([
        goalService.getAll(),
        goalService.getSummary(),
        goalService.getById(goal.id),
      ])
      setGoals(nextGoals)
      setSummary(nextSummary)
      setSelectedGoal(detail)
      toast.success(status === 'COMPLETED' ? 'Goal marked completed' : 'Goal cancelled')
    } catch (error) {
      console.error('Error updating goal status:', error)
      toast.error('Failed to update goal status')
    }
  }

  const linkInvestment = async (investmentId) => {
    try {
      await investmentService.updateInvestment(investmentId, { goal_id: selectedGoal.id })
      await refreshSelectedGoal()
      setAvailableInvestments((items) => items.filter((item) => item.id !== investmentId))
      toast.success('Investment linked to goal')
    } catch (error) {
      console.error('Error linking investment:', error)
      toast.error('Failed to link investment')
    }
  }

  const unlinkInvestment = async (investmentId) => {
    try {
      await investmentService.updateInvestment(investmentId, { goal_id: null })
      await refreshSelectedGoal()
      const investments = await investmentService.getAll()
      setAvailableInvestments(investments.filter((item) => item.goal_id == null))
      toast.success('Investment unlinked from goal')
    } catch (error) {
      console.error('Error unlinking investment:', error)
      toast.error('Failed to unlink investment')
    }
  }

  const cards = [
    { title: 'Goals at risk', value: summary?.total_goals ?? 0, note: 'Total number of goals created', icon: FiTarget, color: 'text-purple-400', background: 'bg-purple-500/10', border: 'border-l-purple-500' },
    { title: 'Active goals', value: summary?.active_goals ?? 0, note: 'Goals currently in progress', icon: FiClock, color: 'text-teal-400', background: 'bg-teal-500/10', border: 'border-l-orange-500' },
    { title: 'Overall goal progress', value: `${summary?.overall_goal_progress ?? 0}%`, note: 'Progress across all goals', icon: FiTrendingUp, color: 'text-emerald-400', background: 'bg-emerald-500/10', border: 'border-l-emerald-500' },
    { title: 'Remaining amount', value: money(summary?.remaining_amount), note: 'Amount needed to reach all goals', icon: FiDollarSign, color: 'text-cyan-400', background: 'bg-cyan-500/10', border: 'border-l-cyan-400' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans text-slate-100 sm:p-6">
      <main className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-purple-500/20 p-3 text-purple-500">
              <FiTarget size={24} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">Plan with purpose</p>
              <h1 className="mt-1 text-3xl font-bold text-white">Financial Goals</h1>
              <p className="mt-1 text-sm text-slate-400">Track progress towards every target.</p>
            </div>
          </div>

          <button type="button" onClick={() => { setFormGoal(null); setCreating(true) }} className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 font-semibold text-white hover:bg-purple-400">
            <FiPlus size={18} /> Create goal
          </button>
        </header>

        <section aria-label="Goal summary" className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ title, value, note, icon: Icon, color, background, border }) => (
            <article key={title} className={`rounded-2xl border border-slate-800/80 border-l-4 ${border} bg-slate-900/60 p-6 shadow-xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-400">{title}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{loading ? '—' : value}</p>
                  <p className="mt-1 text-xs text-slate-500">{note}</p>
                </div>
                <div className={`rounded-lg p-3 ${background}`}>
                  <Icon className={`${color} text-2xl`} />
                </div>
              </div>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Your goals</h2>
            {!loading && <span className="text-sm text-slate-500">Total: {goals.length} goals</span>}
          </div>
          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">Loading goals…</div>
          ) : goals.length ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {goals.map((goal) => (
                <article key={goal.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{goal.category}</p>
                      <h3 className="mt-1 truncate text-lg font-bold text-white">{goal.goal_name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyle(goal.priority)}`}>{goal.priority?.toLowerCase()} priority</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${goal.lifecycle_status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-300' : goal.lifecycle_status === 'CANCELLED' ? 'bg-slate-700 text-slate-300' : 'bg-blue-400/10 text-blue-200'}`}>Lifecycle: {goal.lifecycle_status?.replace('_', ' ').toLowerCase()}</span>
                      {goal.progress_status && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${goal.progress_status === 'ON_TRACK' ? 'bg-emerald-500/10 text-emerald-300' : goal.progress_status === 'NEEDS_ATTENTION' ? 'bg-amber-400/10 text-amber-200' : 'bg-rose-500/10 text-rose-300'}`}>{goal.progress_status.replace('_', ' ').toLowerCase()}</span>}
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
                    <span className="text-slate-400">Latest investment valuation: {date(goal.valuation_date)}</span>
                    {(goal.linked_investments || []).some((investment) => {
                      if (investment.current_value == null) return false
                      if (!investment.valuation_date) return true
                      const age = Date.now() - new Date(`${investment.valuation_date}T00:00:00Z`).getTime()
                      return age > 30 * 24 * 60 * 60 * 1000
                    }) && <span className="text-amber-300">Valuation may be outdated</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                    <div><p className="text-xs text-slate-500">Target</p><p className="mt-1 font-medium">{money(goal.target_amount)}</p></div>
                    <div><p className="text-xs text-slate-500">Cash allocated</p><p className="mt-1 font-medium">{money(goal.cash_allocated)}</p></div>
                    <div><p className="text-xs text-slate-500">Linked investment value</p><p className="mt-1 font-medium">{money(goal.linked_investment_value)}</p></div>
                    <div><p className="text-xs text-slate-500">Total goal funds</p><p className="mt-1 font-semibold text-emerald-300">{money(goal.total_goal_funds)}</p></div>
                    <div><p className="text-xs text-slate-500">Remaining</p><p className="mt-1 font-medium">{money(goal.remaining_amount)}</p></div>
                    <div><p className="text-xs text-slate-500">Deadline</p><p className="mt-1 font-medium">{date(goal.deadline)}</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                    <p className={`text-xs font-medium ${goal.lifecycle_status === 'COMPLETED' || goal.progress_status === 'ON_TRACK' ? 'text-emerald-300' : goal.progress_status === 'OVERDUE' || goal.progress_status === 'AT_RISK' ? 'text-rose-300' : 'text-amber-300'}`}>
                      {goal.lifecycle_status === 'COMPLETED' ? 'Goal reached' : goal.lifecycle_status === 'CANCELLED' ? 'Cancelled' : goal.progress_status?.replace('_', ' ').toLowerCase()}
                      {' · '}
                      {goal.days_remaining < 0 ? `${Math.abs(goal.days_remaining)} days overdue` : `${goal.days_remaining} days left`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openDetails(goal)} className="rounded-lg bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-400/20">View details</button>
                      <button type="button" onClick={() => { setFormGoal(goal); setCreating(true) }} aria-label={`Edit ${goal.goal_name}`} className="rounded-lg p-2 text-amber-200 hover:bg-amber-400/10"><FiEdit2 /></button>
                      <button type="button" onClick={() => deleteGoal(goal)} aria-label={`Delete ${goal.goal_name}`} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><FiTrash2 /></button>
                      <button type="button" onClick={() => toast('AI goal advice is coming soon.')} className="rounded-lg bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-400/20">Generate AI advice</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
              <FiTarget className="mx-auto text-3xl text-slate-600" />
              <h3 className="mt-3 font-semibold text-slate-200">No goals yet</h3>
              <p className="mt-1 text-sm text-slate-500">Create a goal to start tracking its cash and investment funds.</p>
              <button type="button" onClick={() => { setFormGoal(null); setCreating(true) }} className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">Create your first goal</button>
            </div>
          )}
        </section>
      </main>

      {creating && (
        <GoalForm
          goal={formGoal}
          onClose={() => { setCreating(false); setFormGoal(null) }}
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
          onLifecycleStatusChange={(status) => changeLifecycleStatus(selectedGoal, status)}
        />
      )}
    </div>
  )
}
