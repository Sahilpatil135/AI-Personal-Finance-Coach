import { useEffect, useState } from 'react'
import { FiCheckCircle, FiClock, FiDollarSign, FiEdit2, FiPlus, FiTarget, FiTrash2, FiTrendingUp } from 'react-icons/fi'
import toast from 'react-hot-toast'
import GoalDetails from '../components/GoalDetails'
import GoalForm from '../components/GoalForm'
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
    { title: 'Total goals', value: summary?.total_goals ?? 0, icon: FiTarget, color: 'text-blue-300', border: 'border-l-blue-400' },
    { title: 'Active goals', value: summary?.active_goals ?? 0, icon: FiClock, color: 'text-amber-200', border: 'border-l-amber-400' },
    { title: 'Completed goals', value: summary?.completed_goals ?? 0, icon: FiCheckCircle, color: 'text-emerald-300', border: 'border-l-emerald-400' },
    { title: 'Total target amount', value: money(summary?.total_target_amount), icon: FiTarget, color: 'text-blue-300', border: 'border-l-blue-400' },
    { title: 'Total cash allocated', value: money(summary?.total_cash_allocated), icon: FiDollarSign, color: 'text-amber-200', border: 'border-l-amber-400' },
    { title: 'Linked investment value', value: money(summary?.total_linked_investment_value), icon: FiTrendingUp, color: 'text-emerald-300', border: 'border-l-emerald-400' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 p-4 font-sans text-slate-100 sm:p-6">
      <main className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Plan with purpose</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Financial Goals</h1>
            <p className="mt-1 text-sm text-slate-400">Keep cash allocations distinct from investment valuations.</p>
          </div>
          <button type="button" onClick={() => { setFormGoal(null); setCreating(true) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-300">
            <FiPlus /> Create goal
          </button>
        </header>

        <section aria-label="Goal summary" className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ title, value, icon: Icon, color, border }) => (
            <article key={title} className={`rounded-xl border border-slate-800 border-l-4 ${border} bg-slate-900/70 p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{title}</p>
                  <p className={`mt-2 text-xl font-bold ${color}`}>{loading ? '—' : value}</p>
                </div>
                <Icon className={`${color} text-xl`} />
              </div>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Your goals</h2>
            {!loading && <span className="text-sm text-slate-500">{goals.length} total</span>}
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
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${goal.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-300' : goal.status === 'CANCELLED' ? 'bg-slate-700 text-slate-300' : 'bg-blue-400/10 text-blue-200'}`}>{goal.status?.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Progress</span>
                    <strong>{goal.completion_percentage}%</strong>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${goal.completion_percentage}%` }} />
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
                    <p className={`text-xs font-medium ${goal.on_track ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {goal.status === 'COMPLETED' ? 'Goal reached' : goal.status === 'CANCELLED' ? 'Cancelled' : goal.on_track ? 'On track' : 'Needs attention'}
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
        />
      )}
    </div>
  )
}
