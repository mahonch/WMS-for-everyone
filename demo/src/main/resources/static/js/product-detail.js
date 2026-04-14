/**
 * Product Detail App
 */

const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;

// Vuetify setup
const vuetify = createVuetify({
    locale: {
        locale: 'ru',
        messages: { ru: { close: 'Закрыть', open: 'Открыть' } }
    },
    theme: {
        defaultTheme: 'light',
        themes: {
            light: {
                colors: {
                    primary: '#1976D2',
                    secondary: '#424242',
                    success: '#4CAF50',
                    warning: '#FF9800',
                    info: '#2196F3',
                    error: '#F44336'
                }
            }
        }
    }
});

const app = createApp({
    setup() {
        const drawer = ref(true);
        const loading = ref(false);
        const loadingRelated = ref(false);
        const product = ref(null);
        const stocks = ref([]);
        const relatedReceipts = ref([]);
        const relatedIssues = ref([]);
        const relatedTransfers = ref([]);
        const activeTab = ref('receipts');

        const productId = new URLSearchParams(window.location.search).get('id');

        const menuItems = [
            { title: 'Главная', icon: 'mdi-home', path: '/dashboard-vue.html' },
            { title: 'Приёмка', icon: 'mdi-truck-delivery', path: '/pages/receipts-vue.html' },
            { title: 'Списание', icon: 'mdi-delete', path: '/pages/issues.html' },
            { title: 'Перемещения', icon: 'mdi-swap-horizontal', path: '/pages/transfers.html' },
            { title: 'Товары', icon: 'mdi-package-variant', path: '/pages/products.html' },
            { title: 'Склады', icon: 'mdi-warehouse', path: '/pages/warehouses.html' },
            { title: 'Профиль', icon: 'mdi-account', path: '/pages/profile.html' },
        ];

        const breadcrumbs = computed(() => {
            const base = [
                { title: 'Главная', disabled: false, href: '/dashboard-vue.html' },
                { title: 'Товары', disabled: false, href: '/pages/products.html' },
            ];

            if (product.value) {
                base.push({ title: product.value.name, disabled: true });
            } else {
                base.push({ title: 'Загрузка...', disabled: true });
            }

            return base;
        });

        const receiptHeaders = [
            { title: '№', key: 'number' },
            { title: 'Статус', key: 'status' },
            { title: 'Поставщик', key: 'supplierName' },
            { title: 'Дата', key: 'createdAt' },
        ];

        const issueHeaders = [
            { title: '№', key: 'number' },
            { title: 'Статус', key: 'status' },
            { title: 'Причина', key: 'reason' },
            { title: 'Дата', key: 'createdAt' },
        ];

        const transferHeaders = [
            { title: '№', key: 'number' },
            { title: 'Статус', key: 'status' },
            { title: 'Откуда', key: 'fromWarehouseName' },
            { title: 'Куда', key: 'toWarehouseName' },
            { title: 'Дата', key: 'createdAt' },
        ];

        const loadProduct = async () => {
            if (!productId) {
                loading.value = false;
                return;
            }

            loading.value = true;
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/products/${productId}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    product.value = await response.json();
                    document.title = `Товар ${product.value.name} — WMS`;
                    await loadStocks();
                    await loadRelatedDocuments();
                } else {
                    product.value = null;
                }
            } catch (error) {
                console.error('Error loading product:', error);
                product.value = null;
            } finally {
                loading.value = false;
            }
        };

        const loadStocks = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/stocks?productId=${productId}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    stocks.value = await response.json();
                }
            } catch (e) {
                console.error('[loadStocks] Error:', e);
            }
        };

        const loadRelatedDocuments = async () => {
            loadingRelated.value = true;
            try {
                const token = localStorage.getItem('token');

                // Загружаем все документы и фильтруем по товару
                // Приёмки
                const receiptsResponse = await fetch('/api/receipts?page=0&size=100', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (receiptsResponse.ok) {
                    const receiptsData = await receiptsResponse.json();
                    relatedReceipts.value = (receiptsData.content || []).filter(r =>
                        r.items && r.items.some(item => item.productId == productId)
                    );
                }

                // Списания
                const issuesResponse = await fetch('/api/issues?page=0&size=100', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (issuesResponse.ok) {
                    const issuesData = await issuesResponse.json();
                    relatedIssues.value = (issuesData.content || []).filter(i =>
                        i.items && i.items.some(item => item.productId == productId)
                    );
                }

                // Перемещения
                const transfersResponse = await fetch('/api/transfers?page=0&size=100', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (transfersResponse.ok) {
                    const transfersData = await transfersResponse.json();
                    relatedTransfers.value = (transfersData.content || []).filter(t =>
                        t.items && t.items.some(item => item.productId == productId)
                    );
                }
            } catch (e) {
                console.error('[loadRelatedDocuments] Error:', e);
            } finally {
                loadingRelated.value = false;
            }
        };

        const goBack = () => {
            window.location.href = '/pages/products.html';
        };

        const goToLocation = (locationId) => {
            if (locationId) {
                window.location.href = `/pages/location-detail.html?id=${locationId}`;
            }
        };

        const goToCategory = (categoryId) => {
            // TODO: Страница категории
            console.log('Go to category:', categoryId);
        };

        const goToReceipt = (event, item) => {
            window.location.href = `/pages/receipt-detail-vue.html?id=${item.id}`;
        };

        const printDocument = () => {
            window.print();
        };

        const formatDate = (dateString) => {
            if (!dateString) return '—';
            return new Date(dateString).toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        const formatMoney = (amount) => {
            if (amount === null || amount === undefined) return '—';
            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0
            }).format(amount);
        };

        const logout = () => {
            localStorage.clear();
            window.location.href = '/index.html';
        };

        onMounted(() => {
            if (!localStorage.getItem('token')) {
                window.location.href = '/index.html';
                return;
            }
            loadProduct();
        });

        return {
            drawer,
            loading,
            loadingRelated,
            product,
            stocks,
            relatedReceipts,
            relatedIssues,
            relatedTransfers,
            activeTab,
            menuItems,
            breadcrumbs,
            receiptHeaders,
            issueHeaders,
            transferHeaders,
            goBack,
            goToLocation,
            goToCategory,
            goToReceipt,
            printDocument,
            formatDate,
            formatMoney,
            logout
        };
    }
});

app.use(vuetify);
app.mount('#app');
