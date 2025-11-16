// /js/dashboard.js

const token = localStorage.getItem('token');
if (!token) {
    console.warn('[DASHBOARD] Нет токена, редирект на /index.html');
    window.location.href = '/index.html';
}

// общий дебаг авторизации
debugAuthContext('DASHBOARD').then(() => {
    console.log('[DASHBOARD] debugAuthContext завершён');
});

// алерты
const alerts = document.getElementById('alerts');
function pushAlert(type, text) {
    const div = document.createElement('div');
    div.className = `alert ${type}`;
    div.textContent = text;
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

// имя пользователя
const uLabel = document.getElementById('usernameLabel');
if (uLabel) uLabel.textContent = localStorage.getItem('username') || 'пользователь';

// выход
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        console.log('[DASHBOARD] Logout clicked');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/index.html';
    });
}

// универсальный GET с Bearer + лог
async function apiGet(url) {
    const t = localStorage.getItem('token') || '';
    console.log('[DASHBOARD][apiGet] →', url, { tokenPresent: !!t, tokenShort: t ? t.substring(0, 20) + '...' : null });

    const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + t }
    });
    let data = null;
    try { data = await res.json(); } catch (_) {
        console.warn('[DASHBOARD][apiGet] Не удалось распарсить JSON');
    }
    console.log('[DASHBOARD][apiGet] ←', url, 'status =', res.status, 'body =', data);

    if (!res.ok) {
        const msg = (data && (data.message || data.error)) || `Ошибка запроса (${res.status})`;
        throw new Error(msg);
    }
    return data;
}

// пример загрузки метрик
(async () => {
    try {
        const [products, batches, locations] = await Promise.all([
            apiGet('/api/products?size=1').catch(() => []),
            apiGet('/api/batches?size=1').catch(() => []),
            apiGet('/api/locations?size=1').catch(() => []),
        ]);

        const p = products.totalElements ?? products.length ?? 0;
        const b = batches.totalElements  ?? batches.length  ?? 0;
        const l = locations.totalElements ?? locations.length ?? 0;

        document.getElementById('metricProducts').textContent  = p;
        document.getElementById('metricBatches').textContent   = b;
        document.getElementById('metricLocations').textContent = l;
    } catch (e) {
        console.error('[DASHBOARD] load metrics error', e);
        pushAlert('error', e.message || 'Не удалось загрузить метрики');
    }
})();

// показать кнопку админа при ADMIN
(function showAdminIfNeeded() {
    const btn = document.getElementById('adminBtn');
    if (!btn) return;

    let roleLS = (localStorage.getItem('role') || '').toUpperCase();
    let jwtRole = '';

    try {
        const t = localStorage.getItem('token');
        if (t) {
            const payload = JSON.parse(atob(t.split('.')[1]));
            jwtRole = (payload.role || '').toUpperCase();
        }
    } catch (_) {}

    console.log('[DASHBOARD] showAdminIfNeeded roles:', { roleLS, jwtRole });

    const isAdmin = roleLS.includes('ADMIN') || jwtRole.includes('ADMIN');
    if (isAdmin) btn.classList.remove('hidden');
})();
