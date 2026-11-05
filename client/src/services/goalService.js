import api from './api'

export const goalService = {
  async getAll() {
    const response = await api.get('/api/goals')
    return response.data
  },

  async getSummary() {
    const response = await api.get('/api/goals/summary')
    return response.data
  },

  async getById(id) {
    const response = await api.get(`/api/goals/${id}`)
    return response.data
  },

  async addGoal(data) {
    const response = await api.post('/api/goals', data)
    return response.data
  },

  async updateGoal(id, data) {
    const response = await api.put(`/api/goals/${id}`, data)
    return response.data
  },

  async deleteGoal(id) {
    const response = await api.delete(`/api/goals/${id}`)
    return response.data
  },
}
