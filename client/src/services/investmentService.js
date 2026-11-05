import api from './api'

export const investmentService = {
  async getSummary() {
    const response = await api.get('/api/investments/summary')
    return response.data
  },

  async getTypeDistribution() {
    const response = await api.get('/api/investments/analytics/type-distribution')
    return response.data
  },

  async getUpcomingContributions(days) {
    const response = await api.get('/api/investments/upcoming-contributions', {
      params: { days },
    })
    return response.data
  },

  async getUpcomingMaturities(days = 30) {
    const response = await api.get('/api/investments/upcoming-maturities', {
      params: { days },
    })
    return response.data
  },

  async getPaginated(skip = 0, limit = 10) {
    const response = await api.get('/api/investments', {
      params: { skip, limit },
    })
    return response.data
  },

  async getAll() {
    const limit = 100
    const records = []
    let skip = 0
    while (true) {
      const page = await this.getPaginated(skip, limit)
      if (!page.records.length) {
        if (skip < page.total) {
          throw new Error('Investment pagination did not return any records')
        }
        break
      }
      records.push(...page.records)
      skip += page.records.length
      if (skip >= page.total) break
    }
    return records
  },

  async addInvestment(data) {
    const response = await api.post('/api/investments', data)
    return response.data
  },

  async updateInvestment(id, data) {
    const response = await api.put(`/api/investments/${id}`, data)
    return response.data
  },

  async deleteInvestment(id) {
    const response = await api.delete(`/api/investments/${id}`)
    return response.data
  },
}
