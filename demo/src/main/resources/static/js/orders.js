// /js/orders.js

console.log('[ORDERS] init...');

const role = (localStorage.getItem('role') || '').toUpperCase();
if (!role.includes('ADMIN') && !role.includes('MANAGER')) {
    alert('Требуется роль ADMIN или MANAGER');
    window.location.replace('/index.html');
}

let currentPage = 0;
const PAGE_SIZE = 15;
let currentTaskId = null;
let usersCache = [];

document.addEventListener('DOMContentLoaded', initPage);

function initPage() {
    document.getElementById('usernameLabel').textContent = localStorage.getItem('username') || '—';
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    document.getElementById('searchInput').addEventListener('input', debounce(loadTasks, 300));
    document.getElementById('filterType').addEventListener('change', () => { currentPage = 0; loadTasks(); });
    document.getElementById('filterStatus').addEventListener('change', () => { currentPage = 0; loadTasks(); });
    document.getElementById('btnGenerate').addEventListener('click', generateOrder);
    document.getElementById('detailOverlay').addEventListener('click', closeDetail);

    loadStats();
    loadTasks();
    loadUsers();
}

function debounce(fn, ms) {
    let t;
    return function() { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), ms); };
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

async function loadStats() {
    try {
        const s = await api('GET', '/api/admin/tasks/stats');
        document.getElementById('statPending').textContent = s.pending || 0;
        document.getElementById('statAssigned').textContent = s.assigned || 0;
        document.getElementById('statInProgress').textContent = s.inProgress || 0;
        document.getElementById('statCompleted').textContent = s.completed || 0;
        document.getElementById('statCancelled').textContent = s.cancelled || 0;
    } catch (err) {
        console.error('[ORDERS] Stats error:', err);
    }
}

async function loadTasks() {
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchInput').value.toLowerCase().trim();

    let url = `/api/admin/tasks?page=${currentPage}&size=${PAGE_SIZE}`;
    if (type) url += `&type=${type}`;
    if (status) url += `&status=${status}`;

    try {
        const data = await api('GET', url);
        let tasks = data.content || [];

        if (search) {
            tasks = tasks.filter(t =>
                (t.number || '').toLowerCase().includes(search) ||
                (t.assigneeName || '').toLowerCase().includes(search)
            );
        }

        renderTasks(tasks);
        renderPagination(data.totalPages || 0, data.number || 0);
    } catch (err) {
        showAlert('error', 'Ошибка загрузки задач: ' + err.message);
    }
}

function renderTasks(tasks) {
    const tbody = document.getElementById('tasksBody');
    const noTasks = document.getElementById('noTasks');

    if (tasks.length === 0) {
        tbody.innerHTML = '';
        noTasks.style.display = 'block';
        return;
    }
    noTasks.style.display = 'none';

    const statusLabels = {
        PENDING: 'Ожидает',
        ASSIGNED: 'Назначена',
        IN_PROGRESS: 'В работе',
        COMPLETED: 'Завершена',
        CANCELLED: 'Отменена'
    };
    const typeLabels = {
        PICKING: 'Комплектация',
        RECEIPT: 'Приёмка',
        TRANSFER: 'Перемещение',
        INVENTORY: 'Инвентаризация'
    };

    tbody.innerHTML = tasks.map(t => {
        const progress = t.itemCount > 0 ? Math.round((t.itemsConfirmed / t.itemCount) * 100) : 0;
        const created = t.createdAt ? new Date(t.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

        return `
            <tr class="clickable-row" onclick="openDetail(${t.id})">
                <td><strong>${t.number || '#' + t.id}</strong></td>
                <td><span class="type-badge type-${t.type}">${typeLabels[t.type] || t.type}</span></td>
                <td><span class="status-badge status-${t.status}">${statusLabels[t.status] || t.status}</span></td>
                <td>${t.assigneeName || '<span style="color: var(--muted);">Не назначен</span>'}</td>
                <td>${t.warehouseName || '—'}</td>
                <td>
                    <div style="font-size: 12px; color: var(--muted);">${t.itemsConfirmed}/${t.itemCount}</div>
                    <div class="progress-bar"><div class="progress-bar__fill" style="width: ${progress}%"></div></div>
                </td>
                <td style="white-space: nowrap; font-size: 13px;">${created}</td>
                <td>
                    ${t.status === 'PENDING' ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openDetail(${t.id})">Назначить</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function renderPagination(totalPages, current) {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button ${current === 0 ? 'disabled' : ''} onclick="goPage(${current - 1})">← Назад</button>`;
    html += `<span class="page-info">Стр. ${current + 1} из ${totalPages}</span>`;
    html += `<button ${current >= totalPages - 1 ? 'disabled' : ''} onclick="goPage(${current + 1})">Далее →</button>`;
    container.innerHTML = html;
}

function goPage(p) {
    currentPage = p;
    loadTasks();
}

async function loadUsers() {
    try {
        usersCache = await api('GET', '/api/admin/users');
    } catch (err) {
        console.error('[ORDERS] Users load error:', err);
    }
}

async function openDetail(taskId) {
    currentTaskId = taskId;
    try {
        const task = await api('GET', `/api/tasks/${taskId}`);
        renderDetail(task);
        document.getElementById('detailPanel').classList.add('open');
        document.getElementById('detailOverlay').classList.add('open');
    } catch (err) {
        showAlert('error', 'Ошибка загрузки задачи: ' + err.message);
    }
}

function closeDetail() {
    document.getElementById('detailPanel').classList.remove('open');
    document.getElementById('detailOverlay').classList.remove('open');
    currentTaskId = null;
}

function renderDetail(task) {
    const typeLabels = { PICKING: 'Комплектация', RECEIPT: 'Приёмка', TRANSFER: 'Перемещение', INVENTORY: 'Инвентаризация' };
    const statusLabels = { PENDING: 'Ожидает', ASSIGNED: 'Назначена', IN_PROGRESS: 'В работе', COMPLETED: 'Завершена', CANCELLED: 'Отменена' };

    document.getElementById('detailTitle').textContent = `Задача ${task.number || '#' + task.id}`;
    document.getElementById('dNumber').textContent = task.number || '—';
    document.getElementById('dType').innerHTML = `<span class="type-badge type-${task.type}">${typeLabels[task.type] || task.type}</span>`;
    document.getElementById('dStatus').innerHTML = `<span class="status-badge status-${task.status}">${statusLabels[task.status] || task.status}</span>`;
    document.getElementById('dWarehouse').textContent = task.warehouseName || '—';
    document.getElementById('dAssignee').textContent = task.assigneeName || 'Не назначен';
    document.getElementById('dCreator').textContent = task.createdByName || '—';
    document.getElementById('dCreatedAt').textContent = formatDateTime(task.createdAt);
    document.getElementById('dAssignedAt').textContent = formatDateTime(task.assignedAt);
    document.getElementById('dStartedAt').textContent = formatDateTime(task.startedAt);
    document.getElementById('dCompletedAt').textContent = formatDateTime(task.completedAt);

    const itemsContainer = document.getElementById('dItems');
    if (task.items && task.items.length > 0) {
        itemsContainer.innerHTML = task.items.map(item => `
            <div class="items-list__item ${item.confirmed ? 'items-list__item--confirmed' : ''}">
                <div>
                    <strong>${item.productName || 'Товар #' + item.productId}</strong>
                    ${item.productSku ? `<span style="color: var(--muted); font-size: 11px; margin-left: 6px;">${item.productSku}</span>` : ''}
                    <div style="font-size: 11px; color: var(--muted);">${item.locationCode || ''} ${item.locationName || ''}</div>
                </div>
                <div style="text-align: right;">
                    <div>Запланировано: <strong>${item.qtyPlanned}</strong></div>
                    <div>Факт: <strong>${item.qtyActual || 0}</strong> ${item.confirmed ? '✓' : ''}</div>
                </div>
            </div>
        `).join('');
    } else {
        itemsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--muted);">Нет товаров</div>';
    }

    const assignSection = document.getElementById('assignSection');
    const cancelSection = document.getElementById('cancelSection');

    if (task.status === 'PENDING') {
        assignSection.style.display = 'block';
        cancelSection.style.display = 'block';
        const select = document.getElementById('assignUser');
        select.innerHTML = '<option value="">Выберите исполнителя</option>';
        usersCache.filter(u => u.active && (u.role === 'STOREKEEPER' || u.role === 'PICKER')).forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.username} (${u.role})`;
            select.appendChild(opt);
        });
    } else {
        assignSection.style.display = 'none';
        cancelSection.style.display = (task.status !== 'COMPLETED' && task.status !== 'CANCELLED') ? 'block' : 'none';
    }
}

function formatDateTime(dt) {
    if (!dt) return '—';
    try {
        return new Date(dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dt; }
}

async function assignTask() {
    const userId = document.getElementById('assignUser').value;
    if (!userId) { showAlert('error', 'Выберите исполнителя'); return; }
    if (!currentTaskId) return;

    try {
        await api('POST', `/api/admin/tasks/${currentTaskId}/assign`, { userId: parseInt(userId) });
        showAlert('success', 'Исполнитель назначен');
        closeDetail();
        loadTasks();
        loadStats();
    } catch (err) {
        showAlert('error', err.message);
    }
}

async function cancelTask() {
    if (!currentTaskId) return;
    if (!confirm('Отменить задачу?')) return;

    try {
        await api('POST', `/api/admin/tasks/${currentTaskId}/cancel`);
        showAlert('success', 'Задача отменена');
        closeDetail();
        loadTasks();
        loadStats();
    } catch (err) {
        showAlert('error', err.message);
    }
}

async function generateOrder() {
    if (!confirm('Создать тестовый заказ?')) return;

    try {
        await api('POST', '/api/orders/generate');
        showAlert('success', 'Тестовый заказ создан');
        loadTasks();
        loadStats();
    } catch (err) {
        showAlert('error', 'Ошибка создания: ' + err.message);
    }
}
