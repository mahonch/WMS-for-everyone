/**
 * Vue Receipts List App
 */

const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;
const { createPinia } = Pinia;

const vuetify = createVuetify({
    locale: { locale: 'ru' },
    theme: {
        defaultTheme: 'light',
        themes: { light: { colors: { primary: '#1976D2', secondary: '#424242', success: '#4CAF50', warning: '#FF9800', info: '#2196F3', error: '#F44336' } } }
    }
});

const pinia = createPinia();

const app = createApp({
    setup() {
        const drawer = ref(true);
        const searchQuery = ref('');
        const currentPage = ref(1);
        const receiptsStore = useReceiptsStore();
        const createLoading = ref(false);
        const username = localStorage.getItem('username') || 'User';

        const menuItems = [
            { title: 'Главная', icon: 'mdi-home', path: '/dashboard-vue.html' },
            { title: 'Приёмка', icon: 'mdi-truck-delivery', path: '/pages/receipts-vue.html' },
            { title: 'Списание', icon: 'mdi-delete', path: '/pages/issues.html' },
            { title: 'Перемещения', icon: 'mdi-swap-horizontal', path: '/pages/transfers.html' },
            { title: 'Товары', icon: 'mdi-package-variant', path: '/pages/products.html' },
            { title: 'Склады', icon: 'mdi-warehouse', path: '/pages/warehouses.html' },
            { title: 'Профиль', icon: 'mdi-account', path: '/pages/profile.html' },
        ];

        const breadcrumbs = [
            { title: 'Главная', disabled: false, href: '/dashboard-vue.html' },
            { title: 'Журнал приёмки', disabled: true },
        ];

        const headers = [
            { title: '№ документа', key: 'number', sortable: true },
            { title: 'Статус', key: 'status', sortable: true },
            { title: 'Поставщик', key: 'supplierName', sortable: true },
            { title: 'Склад', key: 'warehouseName', sortable: true },
            { title: 'Создал', key: 'createdByName', sortable: true },
            { title: 'Дата создания', key: 'createdAt', sortable: true },
            { title: 'Сумма', key: 'totalSum', sortable: true, align: 'end' },
            { title: '', key: 'actions', sortable: false, align: 'end' },
        ];

        let searchTimeout = null;
        const debouncedSearch = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { currentPage.value = 1; loadReceipts(); }, 300);
        };

        const loadReceipts = async () => {
            await receiptsStore.fetchReceipts(currentPage.value - 1, 10);
        };

        const openReceiptDetail = (event, item) => {
            window.location.href = `/pages/receipt-detail-vue.html?id=${item.id}`;
        };

        const createReceipt = async () => {
            createLoading.value = true;
            try {
                const token = localStorage.getItem('token');
                if (!token) { window.location.href = '/index.html'; return; }

                console.log('[createReceipt] Sending request...');
                const response = await fetch('/api/receipts', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: [] })
                });

                console.log('[createReceipt] Response status:', response.status);
                const text = await response.text();
                console.log('[createReceipt] Response body:', text);

                if (!response.ok) {
                    let errMsg = `Ошибка ${response.status}`;
                    try { errMsg = JSON.parse(text).message; } catch {}
                    throw new Error(errMsg);
                }

                const created = JSON.parse(text);
                console.log('[createReceipt] Parsed:', created);

                if (!created || created.id == null) {
                    throw new Error('Сервер вернул ответ без id: ' + JSON.stringify(created));
                }

                showNotification('success', 'Приёмка создана: ' + created.number);
                window.location.href = `/pages/receipt-detail-vue.html?id=${created.id}`;
            } catch (error) {
                console.error('[createReceipt] Error:', error);
                showNotification('error', error.message);
            } finally {
                createLoading.value = false;
            }
        };

        const commitReceipt = async (item) => {
            if (!confirm('Провести документ приёмки?')) return;
            try {
                await receiptsStore.commitReceipt(item.id);
                showNotification('success', 'Документ проведён');
                loadReceipts();
            } catch (error) { showNotification('error', error.message); }
        };

        const deleteReceipt = async (item) => {
            if (!confirm('Удалить документ приёмки?')) return;
            try {
                await receiptsStore.deleteReceipt(item.id);
                showNotification('success', 'Документ удалён');
                loadReceipts();
            } catch (error) { showNotification('error', error.message); }
        };

        const formatDate = (d) => {
            if (!d) return '—';
            return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        };

        const formatMoney = (a) => {
            if (a == null) return '—';
            return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(a);
        };

        const showNotification = (type, message) => {
            const el = document.createElement('div');
            el.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: ${type === 'success' ? '#4CAF50' : '#F44336'}; color: white; padding: 12px 24px; border-radius: 8px; z-index: 99999;`;
            el.textContent = message;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        };

        const logout = () => { localStorage.clear(); window.location.href = '/index.html'; };

        onMounted(() => {
            if (!localStorage.getItem('token')) { window.location.href = '/index.html'; return; }
            loadReceipts();
        });

        return {
            drawer, searchQuery, currentPage, receiptsStore, username, menuItems, breadcrumbs, headers, createLoading,
            debouncedSearch, loadReceipts, openReceiptDetail, createReceipt, commitReceipt, deleteReceipt, formatDate, formatMoney, logout
        };
    }
});

app.use(pinia);
app.use(vuetify);
app.mount('#app');
