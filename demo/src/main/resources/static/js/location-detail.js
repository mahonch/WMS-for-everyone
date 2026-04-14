/**
 * Location Detail App
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
        const location = ref(null);
        const products = ref([]);
        const relatedReceipts = ref([]);
        const relatedIssues = ref([]);
        const relatedTransfers = ref([]);
        const activeTab = ref('receipts');

        const locationId = new URLSearchParams(window.location.search).get('id');

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
            ];

            if (location.value) {
                base.push({ title: 'Склады', disabled: false, href: '/pages/warehouses.html' });
                base.push({ title: location.value.warehouseName || 'Склад', disabled: false, href: `/pages/warehouse-detail.html?id=${location.value.warehouseId}` });
                base.push({ title: location.value.code, disabled: true });
            } else {
                base.push({ title: 'Загрузка...', disabled: true });
            }

            return base;
        });

        const productHeaders = [
            { title: 'Артикул', key: 'sku' },
            { title: 'Название', key: 'name' },
            { title: 'Цена', key: 'costPrice' },
            { title: 'Кол-во', key: 'quantity' },
        ];

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

        const loadLocation = async () => {
            if (!locationId) {
                loading.value = false;
                return;
            }

            loading.value = true;
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/locations/${locationId}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    location.value = await response.json();
                    document.title = `Ячейка ${location.value.code} — WMS`;
                    await loadProducts();
                    await loadRelatedDocuments();
                } else {
                    location.value = null;
                }
            } catch (error) {
                console.error('Error loading location:', error);
                location.value = null;
            } finally {
                loading.value = false;
            }
        };

        const loadProducts = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/stocks?locationId=${locationId}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    const stocks = await response.json();
                    // Преобразуем в формат для таблицы
                    products.value = stocks.map(s => ({
                        id: s.productId,
                        sku: s.productSku,
                        name: s.productName,
                        costPrice: s.costPrice,
                        quantity: s.quantity,
                        locationId: s.locationId
                    }));
                }
            } catch (e) {
                console.error('[loadProducts] Error:', e);
            }
        };

        const loadRelatedDocuments = async () => {
            loadingRelated.value = true;
            try {
                const token = localStorage.getItem('token');

                // Приёмки
                const receiptsResponse = await fetch('/api/receipts?page=0&size=100', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (receiptsResponse.ok) {
                    const receiptsData = await receiptsResponse.json();
                    relatedReceipts.value = (receiptsData.content || []).filter(r =>
                        r.items && r.items.some(item => item.locationId == locationId)
                    );
                }

                // Списания
                const issuesResponse = await fetch('/api/issues?page=0&size=100', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (issuesResponse.ok) {
                    const issuesData = await issuesResponse.json();
                    relatedIssues.value = (issuesData.content || []).filter(i =>
                        i.items && i.items.some(item => item.locationId == locationId)
                    );
                }

                // Перемещения
                const transfersResponse = await fetch('/api/transfers?page=0&size=100', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (transfersResponse.ok) {
                    const transfersData = await transfersResponse.json();
                    relatedTransfers.value = (transfersData.content || []).filter(t =>
                        t.items && (t.items.some(item => item.fromLocationId == locationId) || t.items.some(item => item.toLocationId == locationId))
                    );
                }
            } catch (e) {
                console.error('[loadRelatedDocuments] Error:', e);
            } finally {
                loadingRelated.value = false;
            }
        };

        const goBack = () => {
            if (location.value?.warehouseId) {
                window.location.href = `/pages/warehouse-detail.html?id=${location.value.warehouseId}`;
            } else {
                window.location.href = '/pages/warehouses.html';
            }
        };

        const goToProduct = (event, item) => {
            if (item.id) {
                window.location.href = `/pages/product-detail.html?id=${item.id}`;
            }
        };

        const goToWarehouse = (warehouseId) => {
            if (warehouseId) {
                window.location.href = `/pages/warehouse-detail.html?id=${warehouseId}`;
            }
        };

        const goToParentLocation = (parentId) => {
            if (parentId) {
                window.location.href = `/pages/location-detail.html?id=${parentId}`;
            }
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
            loadLocation();
        });

        return {
            drawer,
            loading,
            loadingRelated,
            location,
            products,
            relatedReceipts,
            relatedIssues,
            relatedTransfers,
            activeTab,
            menuItems,
            breadcrumbs,
            productHeaders,
            receiptHeaders,
            issueHeaders,
            transferHeaders,
            goBack,
            goToProduct,
            goToWarehouse,
            goToParentLocation,
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
