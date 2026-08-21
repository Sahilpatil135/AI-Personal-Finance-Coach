import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiPlus } from 'react-icons/fi'
import { incomeService } from '../services/incomeService'
import KPICards from '../components/KPICards'
import IncomeEntryForm from '../components/IncomeEntryForm'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import SourceDistributionChart from '../components/SourceDistributionChart'
import IncomeTransactionTable from '../components/IncomeTransactionTable'

const Income = () => {
  const [stats, setStats] = useState(null)
  const [monthlyTrends, setMonthlyTrends] = useState([])
  const [sourceDistribution, setSourceDistribution] = useState([])
  const [incomes, setIncomes] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [editingIncome, setEditingIncome] = useState(null)
  const pageSize = 10
  const navigate = useNavigate()

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch stats, trends, and distribution in parallel
      const [statsData, trendsData, distributionData, paginatedData] = await Promise.all([
        incomeService.getIncomeStats(),
        incomeService.getMonthlyTrends(12),
        incomeService.getSourceDistribution(),
        incomeService.getPaginatedIncome((currentPage - 1) * pageSize, pageSize)
      ])

      setStats(statsData)
      setMonthlyTrends(trendsData)
      setSourceDistribution(distributionData)
      setIncomes(paginatedData.records)
      setTotalItems(paginatedData.total)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch income data')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [currentPage])

  // Handle form submission
  const handleAddIncome = async (formData) => {
    try {
      if (editingIncome) {
        // Update existing income
        await incomeService.updateIncome(
          editingIncome.id,
          parseFloat(formData.amount),
          formData.source,
          formData.date,
          formData.description
        )
        toast.success('Income updated successfully!')
        setEditingIncome(null)
      } else {
        // Create new income
        await incomeService.addIncome(
          parseFloat(formData.amount),
          formData.source,
          formData.date,
          formData.description
        )
        toast.success('Income added successfully!')
      }
      setCurrentPage(1)
      await fetchData()
    } catch (error) {
      throw error
    }
  }

  // Handle edit
  const handleEdit = (income) => {
    setEditingIncome(income)
    setIsFormOpen(true)
  }

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this income record?')) {
      try {
        await incomeService.deleteIncome(id)
        toast.success('Income deleted successfully!')
        setCurrentPage(1)
        await fetchData()
      } catch (error) {
        toast.error('Failed to delete income')
      }
    }
  }

  // Handle form close
  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingIncome(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Income Tracker</h1>
            <p className="text-slate-400 mt-1">Manage and track all your income sources</p>
          </div>
          <button
            onClick={() => {
              setEditingIncome(null)
              setIsFormOpen(true)
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
          >
            <FiPlus size={20} />
            Add Income
          </button>
        </div>

        {/* KPI Cards */}
        {!isLoading && stats && <KPICards stats={stats} />}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MonthlyTrendChart data={monthlyTrends} />
          <SourceDistributionChart data={sourceDistribution} />
        </div>

        {/* Income Table */}
        <IncomeTransactionTable
          data={incomes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />

        {/* Income Entry Form Modal */}
        <IncomeEntryForm
          onSubmit={handleAddIncome}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          editingData={editingIncome}
        />
      </div>
    </div>
  )
}

export default Income