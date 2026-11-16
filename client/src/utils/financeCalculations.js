function amount(value) {
  if (value == null) return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error('Financial records must contain valid amounts')
  }
  return parsed
}

export function getInvestmentContributionAmount(investment) {
  const type = String(investment.type || '').trim().toUpperCase()
  const normalizedType = type.replace(/[^A-Z0-9]/g, '')
  const initialAmount = amount(investment.initial_amount)
  const accountBalanceContributions = amount(investment.account_balance_contribution_total)

  if (normalizedType === 'FD') return initialAmount
  if (normalizedType === 'RD') return initialAmount + accountBalanceContributions

  const isMutualFund = normalizedType.includes('MUTUALFUND')
    || normalizedType.startsWith('MF')
  if (isMutualFund) {
    const isLumpsum = normalizedType.includes('LUMPSUM')
    const isSip = normalizedType.includes('SIP')
      || Boolean(investment.contribution_frequency)
      || accountBalanceContributions > 0
    return isSip && !isLumpsum ? accountBalanceContributions : initialAmount
  }

  return initialAmount
}

export function calculateAccountBalance(incomes, expenses, investments) {
  const totalIncome = incomes.reduce((total, income) => total + amount(income.amount), 0)
  const totalExpenses = expenses.reduce((total, expense) => total + amount(expense.amount), 0)
  const totalInvested = investments.reduce(
    (total, investment) => total + getInvestmentContributionAmount(investment),
    0,
  )

  return Number((totalIncome - totalExpenses - totalInvested).toFixed(2))
}

export function calculateCurrentMonthTotal(records, currentDate = new Date()) {
  const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  return Number(records.reduce((total, record) => (
    String(record.date).slice(0, 7) === monthPrefix
      ? total + amount(record.amount)
      : total
  ), 0).toFixed(2))
}
