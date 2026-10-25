import {
  FiCalendar,
  FiCreditCard,
  FiShoppingBag,
  FiTrendingDown,
} from 'react-icons/fi'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number(value) || 0)

const ExpenseKPICards = ({ stats }) => {
  const growth = Number(stats?.mom_growth) || 0
  const growthColor =
    growth > 0
      ? 'text-rose-400'
      : growth < 0
        ? 'text-emerald-400'
        : 'text-slate-400'

  const cards = [
    {
      title: 'Total Spent (YTD)',
      value: formatCurrency(stats?.total_expense),
      note: 'Total spending for the financial year.',
      icon: FiCreditCard,
      borderColor: 'border-l-rose-500',
      iconBackground: 'bg-rose-500/10',
      iconColor: 'text-rose-400',
    },
    {
      title: "This Month's Expenses",
      value: formatCurrency(stats?.month_total),
      note: 'Total debits this month.',
      icon: FiCalendar,
      borderColor: 'border-l-orange-500',
      iconBackground: 'bg-orange-500/10',
      iconColor: 'text-orange-400',
    },
    {
      title: 'MoM Spending Velocity',
      value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
      note: 'Compared with the previous month.',
      icon: FiTrendingDown,
      borderColor: 'border-l-purple-500',
      iconBackground: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      valueColor: growthColor,
    },
    {
      title: 'Largest Expense',
      value: formatCurrency(stats?.largest_expense),
      note: 'Largest debit logged this month.',
      icon: FiShoppingBag,
      borderColor: 'border-l-cyan-500',
      iconBackground: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
    },
  ]

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map(({
        title,
        value,
        note,
        icon: Icon,
        borderColor,
        iconBackground,
        iconColor,
        valueColor,
      }) => (
        <div
          key={title}
          className={`rounded-2xl border border-slate-800/80 border-l-4 ${borderColor} bg-slate-900/60 p-6 shadow-xl`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">{title}</p>
              <p className={`mt-2 text-2xl font-bold ${valueColor || 'text-white'}`}>
                {value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{note}</p>
            </div>
            <div className={`rounded-lg p-3 ${iconBackground}`}>
              <Icon className={`text-2xl ${iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ExpenseKPICards
