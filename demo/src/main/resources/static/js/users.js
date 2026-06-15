// /js/users.js

console.log('[USERS] init...');

const role = (localStorage.getItem('role') || '').toUpperCase();
if (!role.includes('ADMIN') && !role.includes('MANAGER')) {
    console.warn('[USERS] Нет доступа');
    alert('Требуется роль ADMIN или MANAGER');
    window.location.replace('/index.html');
}

let allUsers = [];
let allStats = [];
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', initPage);

function initPage() {
    document.getElementById('usernameLabel').textContent = localStorage.getItem('username') || '—';
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterRole').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);

    loadData();
}

function showAlert(type, text) {
    const alerts = document.getElementById('alerts');
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = 'padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; font-size: 14px;';
    if (type === 'success') { div.style.background = '#d4edda'; div.style.color = '#155724'; }
    if (type === 'error') { div.style.background = '#f8d7da'; div.style.color = '#721c24'; }
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

async function api(method, url, body) {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
        const msg = (data && (data.error || data.message)) || `Ошибка ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

async function loadData() {
    try {
        const [users, stats] = await Promise.all([
            api('GET', '/api/admin/users'),
            api('GET', '/api/admin/users/stats').catch(() => [])
        ]);
        allUsers = users;
        allStats = stats;
        updateStats();
        applyFilters();
    } catch (err) {
        showAlert('error', 'Ошибка загрузки: ' + err.message);
    }
}

function updateStats() {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.active).length;
    const inactive = total - active;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statInactive').textContent = inactive;
    document.getElementById('statOnline').textContent = '—';

    try {
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        api('GET', '/api/admin/users').then(() => {
            document.getElementById('statOnline').textContent = active;
        });
    } catch (_) {}
}

function applyFilters() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const roleFilter = document.getElementById('filterRole').value;
    const statusFilter = document.getElementById('filterStatus').value;

    let filtered = allUsers.filter(u => {
        if (query && !u.username.toLowerCase().includes(query) && !(u.email || '').toLowerCase().includes(query)) return false;
        if (roleFilter && u.role !== roleFilter) return false;
        if (statusFilter === 'active' && !u.active) return false;
        if (statusFilter === 'inactive' && u.active) return false;
        return true;
    });

    if (currentTab === 'workers') {
        filtered = filtered.filter(u => u.role === 'STOREKEEPER' || u.role === 'PICKER');
    } else if (currentTab === 'inactive') {
        filtered = filtered.filter(u => !u.active);
    }

    const activeUsers = filtered.filter(u => u.active);
    const inactiveUsers = filtered.filter(u => !u.active);

    document.getElementById('activeCount').textContent = activeUsers.length;
    document.getElementById('inactiveCount').textContent = inactiveUsers.length;
    document.getElementById('inactiveHeader').style.display = currentTab === 'inactive' || inactiveUsers.length > 0 ? 'flex' : 'none';

    renderUsers('activeUsers', activeUsers);
    renderUsers('inactiveUsers', inactiveUsers);

    document.getElementById('noUsers').style.display = (activeUsers.length === 0 && inactiveUsers.length === 0) ? 'block' : 'none';
}

function renderUsers(containerId, users) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    users.forEach(u => {
        const stats = allStats.find(s => s.userId === u.id);
        const isWorker = u.role === 'STOREKEEPER' || u.role === 'PICKER';
        const card = document.createElement('div');
        card.className = 'user-card';
        card.onclick = () => openProfile(u.id);

        let statsHtml = '';
        if (isWorker && stats) {
            statsHtml = `
                <div class="user-card__stats">
                    <div class="user-card__stat">
                        <div class="user-card__stat-value">${stats.shiftCompleted || 0}</div>
                        <div class="user-card__stat-label">За смену</div>
                    </div>
                    <div class="user-card__stat">
                        <div class="user-card__stat-value">${stats.monthCompleted || 0}</div>
                        <div class="user-card__stat-label">За месяц</div>
                    </div>
                    <div class="user-card__stat">
                        <div class="user-card__stat-value">${stats.totalCompleted || 0}</div>
                        <div class="user-card__stat-label">Всего</div>
                    </div>
                </div>`;
        } else if (isWorker) {
            statsHtml = '<div class="no-stats">Статистика загружается...</div>';
        }

        const roleName = {
            ADMIN: 'Администратор',
            MANAGER: 'Менеджер',
            STOREKEEPER: 'Кладовщик',
            PICKER: 'Комплектовщик',
            GUEST: 'Гость'
        }[u.role] || u.role;

        card.innerHTML = `
            <div class="user-card__top">
                <div>
                    <div class="user-card__name">${u.username}</div>
                    <div class="user-card__email">${u.email || '—'}</div>
                </div>
                <span class="user-card__role role-${u.role}">${roleName}</span>
            </div>
            <div class="user-card__meta">
                <div class="user-card__meta-item">
                    Статус
                    <span class="user-card__status user-card__status--${u.active ? 'active' : 'inactive'}">
                        <span class="status-dot status-dot--${u.active ? 'active' : 'inactive'}"></span>
                        ${u.active ? 'Активен' : 'Заблокирован'}
                    </span>
                </div>
                <div class="user-card__meta-item">
                    Склад
                    <span>${u.warehouseName || 'Не назначен'}</span>
                </div>
            </div>
            ${statsHtml}
            <div class="user-card__footer">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openProfile(${u.id})">Профиль</button>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); toggleStatus(${u.id}, ${u.active})">
                    ${u.active ? 'Заблокировать' : 'Активировать'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openProfile(userId) {
    window.location.href = `/admin-user-profile.html?id=${userId}`;
}

async function toggleStatus(userId, currentlyActive) {
    const action = currentlyActive ? 'заблокировать' : 'активировать';
    if (!confirm(`Вы уверены, что хотите ${action} пользователя?`)) return;

    try {
        await api('PUT', `/api/admin/users/${userId}/status`, {
            status: currentlyActive ? 'BLOCKED' : 'ACTIVE'
        });
        showAlert('success', `Пользователь ${currentlyActive ? 'заблокирован' : 'активирован'}`);
        await loadData();
    } catch (err) {
        showAlert('error', err.message);
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    applyFilters();
}
