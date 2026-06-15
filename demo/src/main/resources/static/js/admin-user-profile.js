// /js/admin-user-profile.js

console.log('[ADMIN-PROFILE] init...');

// Проверка роли
const role = (localStorage.getItem('role') || '').toUpperCase();
if (!role.includes('ADMIN')) {
    console.warn('[ADMIN-PROFILE] Нет роли ADMIN');
    alert('Требуется роль ADMIN');
    window.location.replace('/index.html');
}

let currentUserId = null;
let currentUser = null;

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    initPage();
});

function initPage() {
    console.log('[ADMIN-PROFILE] initPage');
    
    // Получаем ID пользователя из URL
    const params = new URLSearchParams(window.location.search);
    currentUserId = params.get('id');
    
    if (!currentUserId) {
        showAlert('error', 'Не указан ID пользователя');
        setTimeout(() => window.location.href = '/admin.html', 2000);
        return;
    }
    
    // Username и logout
    document.getElementById('usernameLabel').textContent = localStorage.getItem('username') || 'admin';
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    // Загрузка данных пользователя
    loadUserProfile();
    
    // Загрузка складов для селекта
    loadWarehouses();
    
    // Обработчики кнопок
    document.getElementById('btnChangeRole').onclick = changeRole;
    document.getElementById('btnChangePassword').onclick = changePassword;
    document.getElementById('btnChangeStatus').onclick = changeStatus;
    document.getElementById('btnChangeWarehouse').onclick = changeWarehouse;
}

// Алёрты
function showAlert(type, text) {
    const alerts = document.getElementById('alerts');
    const div = document.createElement('div');
    div.className = `alert ${type}`;
    div.textContent = text;
    div.style.cssText = 'padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;';
    if (type === 'success') div.style.background = '#d4edda';
    if (type === 'error') div.style.background = '#f8d7da';
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

// API запрос
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

// Загрузка профиля пользователя
async function loadUserProfile() {
    try {
        currentUser = await api('GET', `/api/admin/users/${currentUserId}`);
        renderUserProfile();
        loadAuditLog();
        loadStats();
    } catch (err) {
        showAlert('error', 'Не удалось загрузить профиль: ' + err.message);
        document.getElementById('loading').style.display = 'none';
    }
}

// Рендер профиля
function renderUserProfile() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('userProfile').style.display = 'block';
    document.getElementById('pageTitle').textContent = `Профиль: ${currentUser.username}`;
    
    document.getElementById('userId').textContent = currentUser.id;
    document.getElementById('userUsername').textContent = currentUser.username;
    document.getElementById('userEmail').textContent = currentUser.email || '—';
    document.getElementById('userStatus').textContent = currentUser.active ? 'Активен' : 'Заблокирован';
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userWarehouse').textContent = currentUser.warehouseName || '—';
    
    // Заполняем селекторы текущими значениями
    document.getElementById('editRole').value = currentUser.role;
    document.getElementById('editStatus').value = currentUser.active ? 'ACTIVE' : 'BLOCKED';
    if (currentUser.warehouseId) {
        document.getElementById('editWarehouse').value = currentUser.warehouseId;
    }
}

// Загрузка складов
async function loadWarehouses() {
    try {
        const warehouses = await api('GET', '/api/warehouses?page=0&size=100');
        const select = document.getElementById('editWarehouse');
        select.innerHTML = '<option value="">Без склада</option>';
        
        warehouses.content.forEach(w => {
            const option = document.createElement('option');
            option.value = w.id;
            option.textContent = w.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('[ADMIN-PROFILE] Failed to load warehouses:', err);
    }
}

// Загрузка аудита
async function loadAuditLog() {
    try {
        const audit = await api('GET', `/api/audit/user/${currentUserId}`);
        renderAuditLog(audit);
    } catch (err) {
        console.error('[ADMIN-PROFILE] Failed to load audit:', err);
    }
}

// Рендер аудита
function renderAuditLog(audit) {
    const tbody = document.getElementById('auditBody');
    const noAudit = document.getElementById('noAudit');
    
    tbody.innerHTML = '';
    
    if (audit.length === 0) {
        noAudit.style.display = 'block';
        return;
    }
    
    noAudit.style.display = 'none';
    
    audit.forEach(log => {
        const tr = document.createElement('tr');
        const ts = new Date(log.ts).toLocaleString('ru-RU');
        
        let details = '—';
        if (log.beforeJson && log.afterJson) {
            details = `<small style="color: var(--muted);">Изменены поля</small>`;
        }
        
        tr.innerHTML = `
            <td style="white-space: nowrap;">${ts}</td>
            <td><span style="padding: 2px 8px; background: #e9ecef; border-radius: 4px; font-size: 12px;">${log.action}</span></td>
            <td>${log.entity || '—'} ${log.entityId ? '#' + log.entityId : ''}</td>
            <td>${details}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Изменить роль
async function changeRole() {
    const newRole = document.getElementById('editRole').value;
    if (!confirm(`Изменить роль на ${newRole}?`)) return;
    
    try {
        await api('PUT', `/api/admin/users/${currentUserId}/role`, { roleCode: newRole });
        showAlert('success', 'Роль изменена');
        await loadUserProfile();
    } catch (err) {
        showAlert('error', err.message);
    }
}

// Изменить пароль
async function changePassword() {
    const password = document.getElementById('editPassword').value;
    if (!password) {
        showAlert('error', 'Введите пароль');
        return;
    }
    if (password.length < 6) {
        showAlert('error', 'Пароль должен быть не менее 6 символов');
        return;
    }
    
    if (!confirm('Изменить пароль пользователю?')) return;
    
    try {
        await api('PUT', `/api/admin/users/${currentUserId}/password`, { password });
        showAlert('success', 'Пароль изменён');
        document.getElementById('editPassword').value = '';
    } catch (err) {
        showAlert('error', err.message);
    }
}

// Изменить статус
async function changeStatus() {
    const newStatus = document.getElementById('editStatus').value;
    if (!confirm(`Изменить статус на ${newStatus === 'ACTIVE' ? 'Активен' : 'Заблокирован'}?`)) return;
    
    try {
        await api('PUT', `/api/admin/users/${currentUserId}/status`, { status: newStatus });
        showAlert('success', 'Статус изменён');
        await loadUserProfile();
    } catch (err) {
        showAlert('error', err.message);
    }
}

// Изменить склад
async function changeWarehouse() {
    const warehouseId = document.getElementById('editWarehouse').value;
    if (!confirm('Изменить склад пользователя?')) return;
    
    try {
        await api('PUT', `/api/admin/users/${currentUserId}/warehouse`, { 
            warehouseId: warehouseId ? parseInt(warehouseId) : null 
        });
        showAlert('success', 'Склад изменён');
        await loadUserProfile();
    } catch (err) {
        showAlert('error', err.message);
    }
}

// Загрузка статистики (для STOREKEEPER / PICKER)
async function loadStats() {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role !== 'STOREKEEPER' && role !== 'PICKER') return;

    try {
        const stats = await api('GET', '/api/admin/users/stats');
        const userStats = stats.find(s => s.userId == currentUserId);
        if (userStats) {
            document.getElementById('statsCard').style.display = 'block';
            document.getElementById('statShift').textContent = userStats.shiftCompleted || 0;
            document.getElementById('statMonth').textContent = userStats.monthCompleted || 0;
            document.getElementById('statTotal').textContent = userStats.totalCompleted || 0;
        }
    } catch (err) {
        console.error('[PROFILE] Failed to load stats:', err);
    }
}
