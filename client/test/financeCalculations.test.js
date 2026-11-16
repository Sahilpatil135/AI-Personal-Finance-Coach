import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAccountBalance,
  getInvestmentContributionAmount,
} from "../src/utils/financeCalculations.js";

test("RD balance deduction includes the initial amount and paid installments", () => {
  assert.equal(getInvestmentContributionAmount({
    type: "RD",
    initial_amount: "5000.00",
    account_balance_contribution_total: "2000.00",
  }), 7000);
});

test("investment balance deductions follow each investment's recorded details", () => {
  assert.equal(getInvestmentContributionAmount({
    type: "FD",
    initial_amount: "10000.00",
  }), 10000);
  assert.equal(getInvestmentContributionAmount({
    type: "Mutual Fund",
    contribution_frequency: "MONTHLY",
    account_balance_contribution_total: "1500.00",
  }), 1500);
  assert.equal(getInvestmentContributionAmount({
    type: "Mutual Funds (Lumpsum)",
    initial_amount: "4500.00",
  }), 4500);
});

test("account balance subtracts expenses and investment contributions", () => {
  assert.equal(calculateAccountBalance(
    [{ amount: "20000.00" }],
    [{ amount: "3000.00" }],
    [{
      type: "RD",
      initial_amount: "5000.00",
      account_balance_contribution_total: "2000.00",
    }],
  ), 10000);
});
