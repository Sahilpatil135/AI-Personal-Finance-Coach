import api from "./api";

export const incomeService = {
    async addIncome(amount, source, date) {
        const response = await api.post("/api/income", {
            amount,
            source,
            date,
        });
        return response.data;
    },

    async getAllIncome() {
        const response = await api.get("/api/income");
        return response.data;
    },

    async updateIncome(id, amount, source, date) {
        const response = await api.put(`/api/income/${id}`, {
            amount,
            source,
            date,
        });
        return response.data;
    },

    async deleteIncome(id) {
        const response = await api.delete(`/api/income/${id}`);
        return response.data;
    }
};