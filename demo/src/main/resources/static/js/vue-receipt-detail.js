/**
 * Vue Receipt Detail App — с редактированием DRAFT
 */

const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;
const { createPinia } = Pinia;

const vuetify = createVuetify({
    locale: { locale: 'ru' },
    theme: { defaultTheme: 'light', themes: { light: { colors: { primary: '#1976D2', secondary: '#424242', success: '#4CAF50', warning: '#FF9800', info: '#2196F3', error: '#F44336' } } } }
});

const pinia = createPinia();

const app = createApp({
    setup() {
        const drawer = ref(true);
        const loading = ref(false);
        const receipt = ref(null);
        const errorMsg = ref('');

        // Location dialog
        const locationDialog = ref(false);
        const locations = ref([]);
        const currentItem = ref(null);
        const selectedLocation = ref(null);

        // Product dialog
        const productDialog = ref(false);
        const productSearch = ref('');
        const allProducts = ref([]);
        const filteredProducts = ref([]);
        const loadingProducts = ref(false);

        const productHeaders = [
            { title: 'Артикул', key: 'sku' },
            { title: 'Название', key: 'name' },
            { title: 'Категория', key: 'categoryName' },
            { title: 'Цена', key: 'costPrice' },
            { title: '', key: 'actions', sortable: false, align: 'end' },
        ];

        const receiptId = new URLSearchParams(window.location.search).get('id');
        if (!receiptId || receiptId === 'undefined' || receiptId === 'null') {
            errorMsg.value = 'Документ не найден. Вернитесь к списку.';
            loading.value = false;
        }

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
                { title: 'Журнал приёмки', disabled: false, href: '/pages/receipts-vue.html' },
            ];
            if (receipt.value) base.push({ title: receipt.value.number, disabled: true });
            else base.push({ title: 'Загрузка...', disabled: true });
            return base;
        });

        const totalAmount = computed(() => {
            if (!receipt.value?.items) return 0;
            return receipt.value.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
        });

        const getToken = () => localStorage.getItem('token');
        const api = async (method, url, body) => {
            const token = getToken();
            if (!token) { window.location.href = '/index.html'; throw new Error('No token'); }
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
                body: body ? JSON.stringify(body) : undefined
            });
            if (!res.ok) { const e = await res.json().catch(() => ({ message: `Ошибка ${res.status}` })); throw new Error(e.message || `Ошибка ${res.status}`); }
            if (res.status === 204) return null;
            return res.json();
        };

        const showNotification = (type, msg) => {
            const el = document.createElement('div');
            el.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type==='success'?'#4CAF50':'#F44336'};color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;`;
            el.textContent = msg; document.body.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        };

        /* ==================== LOAD ==================== */

        const loadReceipt = async () => {
            if (!receiptId || receiptId === 'undefined') return;
            loading.value = true;
            errorMsg.value = '';
            try {
                receipt.value = await api('GET', `/api/receipts/${receiptId}`);
            } catch (e) { errorMsg.value = e.message; receipt.value = null; }
            finally { loading.value = false; }
        };

        /* ==================== ITEMS CRUD ==================== */

        const updateItem = async (item) => {
            if (!item || receipt.value?.status !== 'DRAFT') return;
            try {
                await api('PUT', `/api/receipts/${receiptId}/items/${item.id}`, {
                    productId: item.productId, qty: item.qty, price: item.price, locationId: item.locationId
                });
                await loadReceipt();
                showNotification('success', 'Позиция обновлена');
            } catch (e) { showNotification('error', e.message); }
        };

        const removeItem = async (item) => {
            if (!confirm('Удалить позицию?')) return;
            try {
                await api('DELETE', `/api/receipts/${receiptId}/items/${item.id}`);
                await loadReceipt();
                showNotification('success', 'Позиция удалена');
            } catch (e) { showNotification('error', e.message); }
        };

        const addItem = async (product) => {
            try {
                await api('POST', `/api/receipts/${receiptId}/items`, {
                    productId: product.id, qty: 1, price: product.costPrice || 0
                });
                await loadReceipt();
                showNotification('success', 'Товар добавлен');
            } catch (e) { showNotification('error', e.message); }
        };

        /* ==================== LOCATION ==================== */

        const openLocationSelect = async (item) => {
            currentItem.value = item;
            selectedLocation.value = item.locationId || null;
            if (receipt.value?.warehouseId) {
                try {
                    locations.value = await api('GET', `/api/locations/warehouse/${receipt.value.warehouseId}`);
                } catch (e) { console.error(e); }
            }
            locationDialog.value = true;
        };

        const saveLocation = async () => {
            if (!currentItem.value || !selectedLocation.value) return;
            const loc = locations.value.find(l => l.id === selectedLocation.value);
            if (!loc) return;
            try {
                await api('PUT', `/api/receipts/${receiptId}/items/${currentItem.value.id}`, {
                    productId: currentItem.value.productId, qty: currentItem.value.qty,
                    price: currentItem.value.price, locationId: loc.id
                });
                await loadReceipt();
                showNotification('success', 'Локация обновлена');
                locationDialog.value = false;
            } catch (e) { showNotification('error', e.message); }
        };

        /* ==================== PRODUCT SELECT ==================== */

        const openProductDialog = async () => {
            productDialog.value = true;
            productSearch.value = '';
            if (allProducts.value.length === 0) {
                loadingProducts.value = true;
                try {
                    const data = await api('GET', '/api/products?page=0&size=2000');
                    allProducts.value = data.content || [];
                } catch (e) { console.error(e); }
                finally { loadingProducts.value = false; }
            }
            filteredProducts.value = [...allProducts.value];
        };

        const filterProducts = () => {
            const q = productSearch.value.toLowerCase();
            filteredProducts.value = q ? allProducts.value.filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))) : [...allProducts.value];
        };

        const selectProduct = (event, product) => { addItem(product); productDialog.value = false; };

        /* ==================== ACTIONS ==================== */

        const commitReceipt = async () => {
            if (!receipt.value?.items?.length) { showNotification('error', 'Добавьте хотя бы одну позицию'); return; }
            if (receipt.value.items.some(i => !i.locationId)) { showNotification('error', 'Укажите локацию для всех позиций'); return; }
            if (!confirm('Подписать документ? Товары попадут на склад.')) return;
            try {
                await api('POST', `/api/receipts/${receiptId}/commit`);
                await loadReceipt();
                showNotification('success', 'Документ подписан');
            } catch (e) { showNotification('error', e.message); }
        };

        const deleteReceipt = async () => {
            if (!confirm('Удалить документ?')) return;
            try {
                await api('DELETE', `/api/receipts/${receiptId}`);
                showNotification('success', 'Документ удалён');
                setTimeout(() => { window.location.href = '/pages/receipts-vue.html'; }, 1000);
            } catch (e) { showNotification('error', e.message); }
        };

        const printDocument = () => { window.print(); };
        const goBack = () => { window.location.href = '/pages/receipts-vue.html'; };
        const goToProduct = (id) => { if (id) window.location.href = `/pages/product-detail.html?id=${id}`; };
        const goToLocation = (id) => { if (id) window.location.href = `/pages/location-detail.html?id=${id}`; };
        const formatDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); };
        const formatMoney = (a) => { if (a == null) return '—'; return new Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB', minimumFractionDigits:0 }).format(a); };
        const logout = () => { localStorage.clear(); window.location.href = '/index.html'; };

        onMounted(() => { if (!getToken()) { window.location.href = '/index.html'; return; } loadReceipt(); });

        return {
            drawer, loading, receipt, errorMsg,
            locationDialog, locations, currentItem, selectedLocation,
            productDialog, productSearch, allProducts, filteredProducts, loadingProducts, productHeaders,
            menuItems, breadcrumbs, totalAmount,
            updateItem, removeItem, openProductDialog, selectProduct, filterProducts,
            openLocationSelect, saveLocation,
            commitReceipt, deleteReceipt, printDocument, goBack, goToProduct, goToLocation,
            formatDate, formatMoney, logout
        };
    }
});

app.use(pinia);
app.use(vuetify);
app.mount('#app');
