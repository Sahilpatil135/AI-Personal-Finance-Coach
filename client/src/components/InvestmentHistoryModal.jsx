import { FiX } from 'react-icons/fi'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`
const date = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  : '—'

export default function InvestmentHistoryModal({ investment, onClose, onAllocate }) {
  return (
    <>
      <button type="button" aria-label="Close transaction history" className="fixed inset-0 z-40 cursor-default bg-black/70" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="investment-history-title" className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="investment-history-title" className="text-xl font-bold">Transaction history</h2>
            <p className="mt-1 text-sm text-slate-400">{investment.title}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}><FiX size={22} /></button>
        </header>
        {(investment.withdrawals || []).length ? (
          <div className="space-y-3">
            {investment.withdrawals.map((transaction) => (
              <article key={transaction.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {transaction.transaction_type === 'MATURITY'
                        ? 'Maturity'
                        : `${transaction.withdrawal_type || 'Withdrawal'} withdrawal`}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{date(transaction.withdrawal_date)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${transaction.allocation_type ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>
                    {transaction.allocation_type
                      ? transaction.allocation_type.replace('_', ' ')
                      : 'Allocation needed'}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-slate-500">Investment value removed</dt><dd className="mt-1">{money(transaction.withdrawal_amount)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Actual proceeds</dt><dd className="mt-1 text-emerald-200">{money(transaction.actual_received_amount)}</dd></div>
                  {transaction.reason && <div className="col-span-2 sm:col-span-1"><dt className="text-xs text-slate-500">Reason</dt><dd className="mt-1 break-words">{transaction.reason}</dd></div>}
                </dl>
                {!transaction.allocation_type && (
                  <button
                    type="button"
                    onClick={() => onAllocate(transaction)}
                    className="mt-4 rounded-lg bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/25"
                  >
                    Allocate proceeds
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
            No withdrawals or maturity transactions recorded.
          </p>
        )}
      </section>
    </>
  )
}
