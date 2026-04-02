/**
 * Vue Receipt Detail App
 */

const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;
const { createPinia } = Pinia;

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

const pinia = createPinia();

const app = createApp({
    setup() {
        const drawer = ref(true);
        const loading = ref(false);
        const receipt = ref(null);
        const receiptsStore = useReceiptsStore();
        
        const receiptId = new URLSearchParams(window.location.search).get('id');

        const menuItems = [
            { title: 'Главная', icon: 'mdi-home', path: '/dashboard-vue.html' },
            { title: 'Приёмка', icon: 'mdi-truck-delivery', path: '/pages/receipts-vue.html' },
            { title: 'Списание', icon: 'mdi-delete', path: '/pages/issues.html' },
            { title: 'Перемещения', icon: 'mdi-swap-horizontal', path: '/pages/transfers.html' },
            { title: 'Товары', icon: 'mdi-package-variant', path: '/pages/products.html' },
            { title: 'Склады', icon: 'mdi-warehouse', path: '/pages/warehouses.html' },
            { title: 'Профиль', icon: 'mdi-account', path: '/pages/profile.html' },
        ];

        const breadcrumbs = computed(() => [
            { title: 'Главная', disabled: false, href: '/dashboard-vue.html' },
            { title: 'Приёмка', disabled: false, href: '/pages/receipts-vue.html' },
            { title: receipt.value?.number || 'Документ', disabled: true },
        ]);

        const totalAmount = computed(() => {
            if (!receipt.value?.items) return 0;
            return receipt.value.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
        });

        const loadReceipt = async () => {
            if (!receiptId) {
                loading.value = false;
                return;
            }

            loading.value = true;
            try {
                receipt.value = await receiptsStore.fetchReceiptById(receiptId);
                document.title = `Приёмка №${receipt.value.number} — WMS`;
            } catch (error) {
                console.error('Error loading receipt:', error);
                receipt.value = null;
            } finally {
                loading.value = false;
            }
        };

        const commitReceipt = async () => {
            if (!confirm('Провести документ приёмки?')) return;
            
            try {
                await receiptsStore.commitReceipt(receiptId);
                await loadReceipt();
                showNotification('success', 'Документ проведён');
            } catch (error) {
                showNotification('error', error.message);
            }
        };

        const deleteReceipt = async () => {
            if (!confirm('Удалить документ приёмки?')) return;
            
            try {
                await receiptsStore.deleteReceipt(receiptId);
                showNotification('success', 'Документ удалён');
                setTimeout(() => {
                    window.location.href = '/pages/receipts-vue.html';
                }, 1000);
            } catch (error) {
                showNotification('error', error.message);
            }
        };

        const goBack = () => {
            window.history.back();
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

        const showNotification = (type, message) => {
            const alert = document.createElement('div');
            alert.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; 
                background: ${type === 'success' ? '#4CAF50' : '#F44336'};
                color: white; padding: 12px 24px; border-radius: 8px;
                z-index: 99999; animation: slideIn 0.3s ease;
            `;
            alert.textContent = message;
            document.body.appendChild(alert);
            setTimeout(() => alert.remove(), 3000);
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
            loadReceipt();
        });

        return {
            drawer,
            loading,
            receipt,
            receiptsStore,
            menuItems,
            breadcrumbs,
            totalAmount,
            commitReceipt,
            deleteReceipt,
            goBack,
            formatDate,
            formatMoney,
            logout
        };
    }
});

app.use(pinia);
app.use(vuetify);
app.mount('#app');
