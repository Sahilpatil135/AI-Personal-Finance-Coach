import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateAccountBalance } from './financeCalculations.js'

const income = [{ amount: 10000 }]
const expenses = []
const originalInvestment = {
  type: 'FD',
  initial_amount: 1000,
  withdrawals: [{
    actual_received_amount: 1200,
    allocation_type: 'ACCOUNT_BALANCE',
  }],
}

test('only account-balance allocated proceeds increase the available balance', () => {
  assert.equal(calculateAccountBalance(income, expenses, [originalInvestment]), 10200)
  assert.equal(calculateAccountBalance(income, expenses, [{
    ...originalInvestment,
    withdrawals: [{ ...originalInvestment.withdrawals[0], allocation_type: 'GOAL' }],
  }]), 9000)
  assert.equal(calculateAccountBalance(income, expenses, [{
    ...originalInvestment,
    withdrawals: [{ ...originalInvestment.withdrawals[0], allocation_type: null }],
  }]), 9000)
})

test('reinvested proceeds are not counted as both cash and investment', () => {
  const newInvestment = { type: 'FD', initial_amount: 1200 }
  assert.equal(calculateAccountBalance(income, expenses, [
    originalInvestment,
    newInvestment,
  ]), 9000)
})
