const investmentColors = {
  FD: ['#bfdbfe', '#2563eb'],
  RD: ['#ddd6fe', '#7c3aed'],
  MF: ['#99f6e4', '#0f766e'],
  STOCKS: ['#fed7aa', '#c2410c'],
  GOLD: ['#fde68a', '#b45309'],
}

const fallbackColors = ['#fecdd3', '#be123c']
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function colorFor(type) {
  return investmentColors[String(type).toUpperCase()] || fallbackColors
}

export default function GoalProgressBar({ goal }) {
  const target = Number(goal.target_amount) || 0
  const scale = target > 0 ? 100 / target : 0
  let remainingWidth = 100
  const segments = []

  const addSegment = (key, label, amount, colors) => {
    const width = Math.min(Math.max(amount, 0) * scale, remainingWidth)
    if (width <= 0) return
    segments.push({ key, label, amount, width, colors })
    remainingWidth -= width
  }

  addSegment('cash', 'Cash allocated', Number(goal.cash_allocated) || 0, ['#86efac', '#16a34a'])
  for (const investment of goal.linked_investments || []) {
    if (investment.current_value == null) continue
    addSegment(
      `investment-${investment.id}`,
      `${investment.type} — ${investment.title}: ${money(investment.current_value)}`,
      Number(investment.current_value),
      colorFor(investment.type),
    )
  }
  if (remainingWidth > 0) {
    segments.push({ key: 'remaining', label: `Remaining: ${money(goal.remaining_amount)}`, amount: goal.remaining_amount, width: remainingWidth, colors: ['#475569', '#334155'] })
  }

  const legend = [
    { key: 'cash', label: 'Cash allocated', colors: ['#86efac', '#16a34a'] },
    ...[...new Set((goal.linked_investments || [])
      .filter((investment) => investment.current_value != null)
      .map((investment) => investment.type))]
      .map((type) => ({ key: `type-${type}`, label: type, colors: colorFor(type) })),
    { key: 'remaining', label: 'Remaining', colors: ['#475569', '#334155'] },
  ]

  return (
    <div>
      <div
        role="img"
        aria-label={`Goal funding: ${goal.completion_percentage}% complete`}
        className="flex h-3 overflow-hidden rounded-full bg-slate-800"
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={segment.label}
            aria-label={segment.label}
            className="h-full transition-[width]"
            style={{
              width: `${segment.width}%`,
              background: `linear-gradient(to right, ${segment.colors[0]}, ${segment.colors[1]})`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {legend.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: `linear-gradient(to right, ${item.colors[0]}, ${item.colors[1]})` }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
