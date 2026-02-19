// /js/dashboard.js

const token = localStorage.getItem('token');
if (!token) {
    console.warn('[DASHBOARD] Нет токена, редирект на /index.html');
    window.location.href = '/index.html';
}

// Debug JWT
debugAuthContext('DASHBOARD');

// Alerts
const alerts = document.getElementById('alerts');
function pushAlert(type, text) {
    const div = document.createElement('div');
    div.className = `alert ${type}`;
    div.textContent = text;
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

// Username
const uLabel = document.getElementById('usernameLabel');
uLabel.textContent = localStorage.getItem('username') || 'пользователь';

// Logout
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    window.location.href = '/index.html';
};

// API wrapper
async function apiGet(url) {
    const t = localStorage.getItem('token') || '';
    const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + t }
    });
    
    if (!res.ok) {
        throw new Error(`Ошибка ${res.status}`);
    }
    return await res.json();
}

// Форматирование денег
const fmtMoney = (n) => new Intl.NumberFormat('ru-RU', { 
    style: 'currency', 
    currency: 'RUB',
    maximumFractionDigits: 0
}).format(n || 0);

// Форматирование даты
const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

// Иконки действий
const actionIcons = {
    'PRODUCT_CREATE': '📦',
    'PRODUCT_UPDATE': '✏️',
    'PRODUCT_DELETE': '🗑️',
    'SUPPLIER_CREATE': '🚚',
    'SUPPLIER_UPDATE': '✏️',
    'SUPPLIER_DELETE': '🗑️',
    'WAREHOUSE_CREATE': '🏢',
    'WAREHOUSE_UPDATE': '✏️',
    'WAREHOUSE_DELETE': '🗑️',
    'LOCATION_CREATE': '📍',
    'LOCATION_UPDATE': '✏️',
    'LOCATION_DELETE': '🗑️',
    'RECEIPT_CREATE': '📥',
    'RECEIPT_COMMIT': '✅',
    'RECEIPT_DELETE': '🗑️',
    'ISSUE_CREATE': '📤',
    'ISSUE_COMMIT': '✅',
    'ISSUE_DELETE': '🗑️',
    'TRANSFER_CREATE': '🔁',
    'TRANSFER_COMMIT': '✅',
    'TRANSFER_DELETE': '🗑️'
};

// Загрузка статистики
async function loadStats() {
    try {
        const [products, batches, locations, warehouses, suppliers] = await Promise.all([
            apiGet('/api/products?page=0&size=1'),
            apiGet('/api/batches?page=0&size=1'),
            apiGet('/api/locations?page=0&size=1'),
            apiGet('/api/warehouses?page=0&size=1'),
            apiGet('/api/suppliers?page=0&size=1')
        ]);

        console.log('[DASHBOARD] products:', products);
        console.log('[DASHBOARD] batches:', batches);
        console.log('[DASHBOARD] locations:', locations);
        console.log('[DASHBOARD] warehouses:', warehouses);
        console.log('[DASHBOARD] suppliers:', suppliers);

        document.getElementById('metricProducts').textContent = 
            products.totalElements ?? products.content?.length ?? products.length ?? 0;
        document.getElementById('metricBatches').textContent = 
            batches.totalElements ?? batches.content?.length ?? batches.length ?? 0;
        document.getElementById('metricLocations').textContent = 
            locations.totalElements ?? locations.content?.length ?? locations.length ?? 0;
        document.getElementById('metricWarehouses').textContent = 
            warehouses.totalElements ?? warehouses.content?.length ?? warehouses.length ?? 0;
        document.getElementById('metricSuppliers').textContent = 
            suppliers.totalElements ?? suppliers.content?.length ?? suppliers.length ?? 0;

        // Загружаем все товары для подсчёта стоимости
        try {
            const allStocks = await apiGet('/api/stocks');
            console.log('[DASHBOARD] stocks:', allStocks);
            
            const totalValue = Array.isArray(allStocks) ? allStocks.reduce((sum, s) => {
                return sum + (s.qty * (s.costPrice || 0));
            }, 0) : 0;
            
            document.getElementById('metricValue').textContent = fmtMoney(totalValue);
        } catch (e) {
            console.error('[DASHBOARD] stocks error:', e);
            document.getElementById('metricValue').textContent = '0 ₽';
        }

    } catch (e) {
        console.error('[DASHBOARD] loadStats error:', e);
    }
}

// Загрузка последних изменений
window.loadRecent = async function() {
    try {
        const list = await apiGet('/api/audit/recent?size=20');
        const tb = document.querySelector('#recentTable tbody');
        tb.innerHTML = '';

        if (!list || list.length === 0) {
            tb.innerHTML = '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;">Нет последних изменений</td></tr>';
            return;
        }

        for (const log of list) {
            const tr = document.createElement('tr');
            const icon = actionIcons[log.action] || '📝';
            
            tr.innerHTML = `
                <td style="white-space: nowrap;">${fmtDate(log.ts)}</td>
                <td>
                    <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
                    <strong>${log.action}</strong>
                </td>
                <td>
                    ${log.entity} #${log.entityId}
                </td>
                <td>
                    👤 ${log.actor || 'system'}
                </td>
            `;
            tb.appendChild(tr);
        }
    } catch (e) {
        console.error('[DASHBOARD] loadRecent error:', e);
        const tb = document.querySelector('#recentTable tbody');
        tb.innerHTML = '<tr><td colspan="4" class="error">Ошибка загрузки: ' + e.message + '</td></tr>';
    }
}

// Admin button visibility
const adminBtn = document.getElementById('adminBtn');
try {
    const jwt = JSON.parse(atob(token.split('.')[1]));
    const role = (jwt.role || '').toUpperCase();
    if (role.includes('ADMIN') && adminBtn) {
        adminBtn.classList.remove('hidden');
    }
} catch (e) {
    console.error('[DASHBOARD] check admin error:', e);
}

// Загрузка при старте
loadStats();
loadRecent();
