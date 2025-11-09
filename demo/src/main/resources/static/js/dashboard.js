// если нет токена — отправляем на логин
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/index.html';
}

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
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/index.html';
    });
}

// универсальный GET с Bearer
async function apiGet(url) {
    const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
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
        pushAlert('error', e.message || 'Не удалось загрузить метрики');
    }
})();
(function showAdminIfNeeded() {
    const btn = document.getElementById('adminBtn');
    if (!btn) return;

    // пытаемся взять роль из localStorage (её кладём при логине)
    let roleLS = (localStorage.getItem('role') || '').toUpperCase();

    // если в LS нет роли — попробуем достать её из JWT (claim "role")
    if (!roleLS) {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                roleLS = (payload.role || '').toUpperCase();
            }
        } catch (_) { /*ignore*/ }
    }

    // допускаем форматы "ADMIN" и "ROLE_ADMIN"
    const isAdmin = roleLS.includes('ADMIN');
    if (isAdmin) btn.classList.remove('hidden');
})();