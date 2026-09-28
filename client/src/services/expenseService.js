import api from "./api";

export const expenseService = {
    async getStats() {
        const response = await api.get("/api/expense/stats/overview");
        return response.data;
    },

    async getTrends(timeframe) {
        const response = await api.get("/api/expense/analytics/monthly-trends", {
            params: { timeframe }
        });
        return response.data;
    },

    async getCategories(timeframe) {
        const response = await api.get("/api/expense/analytics/category-distribution", {
            params: { timeframe }
        });
        return response.data;
    },

    async getBudget() {
        const response = await api.get("/api/expense/budget");
        return response.data;
    },

    async setBudget(amount) {
        const response = await api.put("/api/expense/budget", {
            amount
        });
        return response.data;
    },

    async getPaginated(skip = 0, limit = 50) {
        const response = await api.get("/api/expense/paginated", {
            params: { skip, limit }
        });
        return response.data;
    },

    async addExpense(data) {
        const response = await api.post("/api/expense", data);
        return response.data;
    },

    async updateExpense(id, data) {
        const response = await api.put(`/api/expense/${id}`, data);
        return response.data;
    },

    async deleteExpense(id) {
        const response = await api.delete(`/api/expense/${id}`);
        return response.data;
    }
};