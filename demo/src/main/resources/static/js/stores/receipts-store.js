/**
 * Receipts Store - Pinia Store для управления приёмками
 */

const useReceiptsStore = Pinia.defineStore('receipts', {
    state: () => ({
        receipts: [],
        currentReceipt: null,
        loading: false,
        error: null,
        pagination: {
            page: 0,
            size: 20,
            total: 0,
            totalPages: 0
        },
        filters: {
            search: '',
            status: '',
            supplierId: null
        }
    }),

    getters: {
        pendingReceipts: (state) => state.receipts.filter(r => r.status === 'DRAFT'),
        committedReceipts: (state) => state.receipts.filter(r => r.status === 'COMMITTED'),
        
        receiptById: (state) => (id) => {
            return state.receipts.find(r => r.id === id) || state.currentReceipt;
        }
    },

    actions: {
        async fetchReceipts(page = 0, size = 20) {
            this.loading = true;
            this.error = null;

            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams({ page, size: size.toString() });
                
                if (this.filters.search) params.append('search', this.filters.search);
                if (this.filters.status) params.append('status', this.filters.status);
                
                const response = await fetch(`/api/receipts?${params}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (!response.ok) throw new Error('Failed to fetch receipts');
                
                const data = await response.json();
                this.receipts = data.content || [];
                this.pagination = {
                    page: data.number || 0,
                    size: data.size || 20,
                    total: data.totalElements || 0,
                    totalPages: data.totalPages || 0
                };
            } catch (error) {
                this.error = error.message;
                console.error('[ReceiptsStore] Error:', error);
            } finally {
                this.loading = false;
            }
        },

        async fetchReceiptById(id) {
            this.loading = true;
            this.error = null;

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/receipts/${id}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (!response.ok) throw new Error('Failed to fetch receipt');
                
                this.currentReceipt = await response.json();
                return this.currentReceipt;
            } catch (error) {
                this.error = error.message;
                console.error('[ReceiptsStore] Error:', error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async commitReceipt(id) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/receipts/${id}/commit`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to commit receipt');
                }
                
                await this.fetchReceiptById(id);
                await this.fetchReceipts();
            } catch (error) {
                console.error('[ReceiptsStore] Commit error:', error);
                throw error;
            }
        },

        async deleteReceipt(id) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/receipts/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (!response.ok) throw new Error('Failed to delete receipt');
                
                await this.fetchReceipts();
            } catch (error) {
                console.error('[ReceiptsStore] Delete error:', error);
                throw error;
            }
        },

        setFilters(filters) {
            this.filters = { ...this.filters, ...filters };
        },

        clearFilters() {
            this.filters = {
                search: '',
                status: '',
                supplierId: null
            };
        }
    }
});
