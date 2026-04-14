/**
 * Receipt Service - API функции для работы с приёмками
 */

const ReceiptService = {
    async getToken() {
        return localStorage.getItem('token');
    },

    async getReceipts(page = 0, size = 10, filters = {}) {
        const token = await this.getToken();
        const params = new URLSearchParams({ page, size: size.toString() });

        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });

        const response = await fetch(`/api/receipts?${params}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) throw new Error('Failed to fetch receipts');
        return response.json();
    },

    async createReceipt(dto) {
        const token = await this.getToken();
        const response = await fetch('/api/receipts', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dto)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create receipt');
        }

        return response.json();
    },

    async getReceiptById(id) {
        const token = await this.getToken();
        const response = await fetch(`/api/receipts/${id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) throw new Error('Failed to fetch receipt');
        return response.json();
    },

    async commitReceipt(id) {
        const token = await this.getToken();
        const response = await fetch(`/api/receipts/${id}/commit`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to commit receipt');
        }

        return response.json();
    },

    async deleteReceipt(id) {
        const token = await this.getToken();
        const response = await fetch(`/api/receipts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) throw new Error('Failed to delete receipt');
        return true;
    }
};
