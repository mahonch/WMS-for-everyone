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

// Fetch wrapper
async function apiGet(url) {
    const t = localStorage.getItem('token') || '';

    const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + t }
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok) {
        const msg = data?.message || data?.error || ('Ошибка ' + res.status);
        throw new Error(msg);
    }
    return data;
}

// ---- Load recent audit logs ----
async function loadRecent() {
    try {
        const list = await apiGet('/api/audit/recent');
        const ul = document.getElementById('recentList');
        ul.innerHTML = '';

        if (!list || list.length === 0) {
            ul.innerHTML = '<li class="muted">Пока нет операций…</li>';
            return;
        }

        for (const log of list) {
            const li = document.createElement('li');

            const icon =
                log.action.includes('COMMIT') ? '📦' :
                    log.action.includes('ISSUE')  ? '🔥' :
                        log.action.includes('TRANSFER') ? '🔁' :
                            '📝';

            li.innerHTML = `
                <div class="logrow">
                    <span class="icon">${icon}</span>
                    <div>
                        <div class="title">${log.action}</div>
                        <div class="meta">
                            ${log.entity} #${log.entityId}
                            • ${log.actor}
                            • ${new Date(log.ts).toLocaleString('ru-RU')}
                        </div>
                    </div>
                </div>
            `;
            ul.appendChild(li);
        }
    } catch (e) {
        console.error('[DASHBOARD] loadRecent error', e);
        pushAlert('error', 'Не удалось загрузить историю');
    }
}

// ---- Load metrics ----
(async () => {
    try {
        const [products, batches, locations] = await Promise.all([
            apiGet('/api/products?size=1'),
            apiGet('/api/batches?size=1'),
            apiGet('/api/locations?size=1'),
        ]);

        document.getElementById('metricProducts').textContent =
            products.totalElements ?? products.length ?? 0;

        document.getElementById('metricBatches').textContent =
            batches.totalElements ?? batches.length ?? 0;

        document.getElementById('metricLocations').textContent =
            locations.totalElements ?? locations.length ?? 0;

        await loadRecent();
    } catch (e) {
        pushAlert('error', e.message);
    }
})();

// ---- Admin button ----
(function showAdminIfNeeded() {
    const btn = document.getElementById('adminBtn');
    const jwt = JSON.parse(atob(token.split('.')[1]));
    const role = (jwt.role || '').toUpperCase();

    if (role.includes('ADMIN')) btn.classList.remove('hidden');
})();
