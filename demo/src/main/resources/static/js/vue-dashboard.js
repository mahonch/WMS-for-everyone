/**
 * Vue 3 Dashboard App with Vuetify & Pinia
 */

// Get global variables from CDN builds
const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;
const { createPinia, defineStore } = Pinia;

// ============================================
// PINIA STORE
// ============================================
const useDashboardStore = defineStore('dashboard', {
    state: () => ({
        username: localStorage.getItem('username') || '',
        loading: false,
        productsCount: 0,
        warehousesCount: 0,
        pendingReceipts: 0,
        pendingTransfers: 0,
        recentReceipts: [],
        recentTransfers: [],
        error: null
    }),

    getters: {
        isAuthenticated: (state) => !!localStorage.getItem('token'),
    },

    actions: {
        async fetchDashboardData() {
            this.loading = true;
            this.error = null;

            const token = localStorage.getItem('token');
            const headers = { 'Authorization': 'Bearer ' + token };

            try {
                // Загружаем все данные параллельно
                const [products, warehouses, receipts, transfers] = await Promise.all([
                    fetch('/api/products?page=0&size=1', { headers }).then(r => r.json()),
                    fetch('/api/warehouses?page=0&size=100', { headers }).then(r => r.json()),
                    fetch('/api/receipts?page=0&size=5', { headers }).then(r => r.json()),
                    fetch('/api/transfers', { headers }).then(r => r.json())
                ]);

                this.productsCount = products.totalElements || 0;
                this.warehousesCount = warehouses.totalElements || warehouses.length || 0;
                this.pendingReceipts = receipts.content?.filter(r => r.status === 'DRAFT').length || 0;
                this.pendingTransfers = transfers.filter(t => t.status === 'DRAFT').length || 0;
                this.recentReceipts = receipts.content?.slice(0, 5) || [];
                this.recentTransfers = transfers.slice(0, 5) || [];

            } catch (error) {
                console.error('[Dashboard] Error loading data:', error);
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },

        logout() {
            localStorage.clear();
            window.location.href = '/index.html';
        }
    }
});

// ============================================
// VUE APP
// ============================================
const { createApp, ref, computed, onMounted } = Vue;
const { createVuetify } = Vuetify;
const { createPinia } = Pinia;

const vuetify = createVuetify({
    locale: {
        locale: 'ru',
        messages: {
            ru: {
                close: 'Закрыть',
                open: 'Открыть',
            }
        }
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
                }
            }
        }
    }
});

const pinia = createPinia();

const app = createApp({
    setup() {
        const dashboardStore = useDashboardStore();
        const drawer = ref(true);

        const menuItems = computed(() => [
            { title: 'Главная', icon: 'mdi-home', path: '/dashboard-vue.html' },
            { title: 'Приёмка', icon: 'mdi-truck-delivery', path: '/pages/receipts.html' },
            { title: 'Списание', icon: 'mdi-delete', path: '/pages/issues.html' },
            { title: 'Перемещения', icon: 'mdi-swap-horizontal', path: '/pages/transfers.html' },
            { title: 'Товары', icon: 'mdi-package-variant', path: '/pages/products.html' },
            { title: 'Склады', icon: 'mdi-warehouse', path: '/pages/warehouses.html' },
            { title: 'Профиль', icon: 'mdi-account', path: '/pages/profile.html' },
        ]);

        const dashboardStats = computed(() => ({
            productsCount: dashboardStore.productsCount,
            warehousesCount: dashboardStore.warehousesCount,
            pendingReceipts: dashboardStore.pendingReceipts,
            pendingTransfers: dashboardStore.pendingTransfers,
        }));

        const recentReceipts = computed(() => dashboardStore.recentReceipts);
        const recentTransfers = computed(() => dashboardStore.recentTransfers);

        onMounted(() => {
            if (!dashboardStore.isAuthenticated) {
                window.location.href = '/index.html';
                return;
            }
            dashboardStore.fetchDashboardData();
        });

        return {
            drawer,
            menuItems,
            dashboardStore,
            dashboardStats,
            recentReceipts,
            recentTransfers,
        };
    }
});

app.use(pinia);
app.use(vuetify);
app.mount('#app');
