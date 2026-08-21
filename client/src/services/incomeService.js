import api from "./api";

export const incomeService = {
    async addIncome(amount, source, date, description = "") {
        const response = await api.post("/api/income", {
            amount,
            source,
            date,
            description,
        });
        return response.data;
    },

    async getAllIncome() {
        const response = await api.get("/api/income");
        return response.data;
    },

    async getPaginatedIncome(skip = 0, limit = 10) {
        const response = await api.get("/api/income/paginated", {
            params: { skip, limit }
        });
        return response.data;
    },

    async getIncomeStats() {
        const response = await api.get("/api/income/stats/overview");
        return response.data;
    },

    async getMonthlyTrends(months = 12) {
        const response = await api.get("/api/income/analytics/monthly-trends", {
            params: { months }
        });
        return response.data;
    },

    async getSourceDistribution() {
        const response = await api.get("/api/income/analytics/source-distribution");
        return response.data;
    },

    async updateIncome(id, amount, source, date, description = "") {
        const response = await api.put(`/api/income/${id}`, {
            amount,
            source,
            date,
            description,
        });
        return response.data;
    },

    async deleteIncome(id) {
        const response = await api.delete(`/api/income/${id}`);
        return response.data;
    }
};