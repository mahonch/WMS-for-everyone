/**
 * Workflow Kanban Board — Управление задачами склада
 */

const API = '';

// ==================== API HELPERS ====================

async function api(method, url, body) {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; throw new Error('No token'); }
    const opts = {
        method,
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + url, opts);
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

function alertMsg(msg, type = 'danger') {
    const el = document.getElementById('alerts');
    el.innerHTML = `<div class="alert alert-${type}" style="padding:10px 16px;margin:0 20px 12px;border-radius:8px;background:${type === 'danger' ? '#fee2e2' : '#d1fae5'};color:${type === 'danger' ? '#991b1b' : '#065f46'};font-size:13px;">${msg}</div>`;
    setTimeout(() => el.innerHTML = '', 4000);
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ==================== STATE ====================

let allTasks = [];
let draggedCard = null;
let draggedTaskId = null;

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
    // Username
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('usernameLabel').textContent = user.username || '—';
    document.getElementById('logoutBtn').onclick = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    };

    // Filters
    document.getElementById('filterType').onchange = () => renderBoard();
    document.getElementById('filterWarehouse').onchange = () => renderBoard();

    loadWarehouses();
    loadBoard();
});

async function loadWarehouses() {
    try {
        const data = await api('GET', '/api/warehouses');
        const select = document.getElementById('filterWarehouse');
        const list = Array.isArray(data) ? data : (data.content || []);
        list.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.textContent = w.name || w.code;
            select.appendChild(opt);
        });
    } catch (e) {
        console.warn('Cannot load warehouses:', e);
    }
}

// ==================== LOAD BOARD ====================

async function loadBoard() {
    try {
        // Load all task pages
        let tasks = [];
        let page = 0;
        const size = 100;
        let hasMore = true;

        while (hasMore) {
            const data = await api('GET', `/api/tasks/available?page=${page}&size=${size}`);
            if (data && data.content) {
                tasks = tasks.concat(data.content);
                hasMore = !data.last;
                page++;
            } else {
                hasMore = false;
            }
        }

        // Also load my tasks (assigned to current user)
        try {
            page = 0;
            hasMore = true;
            while (hasMore) {
                const myData = await api('GET', `/api/tasks/my?page=${page}&size=${size}`);
                if (myData && myData.content) {
                    const existingIds = new Set(tasks.map(t => t.id));
                    myData.content.forEach(t => {
                        if (!existingIds.has(t.id)) tasks.push(t);
                    });
                    hasMore = !myData.last;
                    page++;
                } else {
                    hasMore = false;
                }
            }
        } catch (e) {
            console.warn('Cannot load my tasks:', e);
        }

        allTasks = tasks;
        renderBoard();
    } catch (e) {
        alertMsg('Ошибка загрузки задач: ' + e.message);
    }
}

// ==================== RENDER BOARD ====================

function renderBoard() {
    const typeFilter = document.getElementById('filterType').value;
    const whFilter = document.getElementById('filterWarehouse').value;

    let filtered = allTasks;
    if (typeFilter) filtered = filtered.filter(t => t.type === typeFilter);
    if (whFilter) filtered = filtered.filter(t => String(t.warehouseId) === whFilter);

    const groups = {
        PENDING: [],
        ASSIGNED: [],
        IN_PROGRESS: [],
        COMPLETED: [],
        CANCELLED: []
    };

    filtered.forEach(t => {
        const status = t.status || 'PENDING';
        if (groups[status]) groups[status].push(t);
    });

    // Update stats
    document.getElementById('statPending').textContent = groups.PENDING.length;
    document.getElementById('statAssigned').textContent = groups.ASSIGNED.length;
    document.getElementById('statInProgress').textContent = groups.IN_PROGRESS.length;
    document.getElementById('statCompleted').textContent = groups.COMPLETED.length;

    // Update column counts
    document.getElementById('countPending').textContent = groups.PENDING.length;
    document.getElementById('countAssigned').textContent = groups.ASSIGNED.length;
    document.getElementById('countInProgress').textContent = groups.IN_PROGRESS.length;
    document.getElementById('countCompleted').textContent = groups.COMPLETED.length;
    document.getElementById('countCancelled').textContent = groups.CANCELLED.length;

    // Render each column
    Object.keys(groups).forEach(status => {
        const colId = 'col' + status.charAt(0) + status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        const col = document.getElementById(colId);
        if (!col) return;

        col.innerHTML = '';
        if (groups[status].length === 0) {
            col.innerHTML = '<div class="wf-empty">Нет задач</div>';
        } else {
            groups[status].forEach(task => {
                col.appendChild(createTaskCard(task));
            });
        }

        // Drag & drop
        setupDropZone(col, status);
    });
}

// ==================== TASK CARD ====================

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'wf-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    const items = task.items || [];
    const confirmed = items.filter(i => i.confirmed).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    const barClass = pct === 100 ? 'full' : pct >= 60 ? 'high' : pct >= 30 ? 'mid' : 'low';

    const typeLabel = { RECEIPT: 'Приёмка', PICKING: 'Сборка', TRANSFER: 'Перемещение', INVENTORY: 'Инвентаризация' };
    const typeEmoji = { RECEIPT: '📥', PICKING: '📦', TRANSFER: '🔄', INVENTORY: '📊' };

    const assigneeName = task.assigneeName || 'Не назначен';
    const initials = assigneeName !== 'Не назначен' ? assigneeName.charAt(0).toUpperCase() : '?';

    const timeInfo = task.completedAt
        ? `Завершена ${timeAgo(task.completedAt)}`
        : task.startedAt
            ? `В работе ${timeAgo(task.startedAt)}`
            : task.assignedAt
                ? `Назначена ${timeAgo(task.assignedAt)}`
                : `Создана ${timeAgo(task.createdAt)}`;

    card.innerHTML = `
        <div class="wf-card__top">
            <span class="wf-card__number">${task.number || '#' + task.id}</span>
            <span class="wf-card__type type-${task.type}">${typeEmoji[task.type] || ''} ${typeLabel[task.type] || task.type}</span>
        </div>
        <div class="wf-card__title">${getTaskTitle(task)}</div>
        <div class="wf-card__meta">
            <span>📍 ${task.warehouseName || '—'}</span>
            ${total > 0 ? `<span>📦 ${confirmed}/${total} поз.</span>` : ''}
        </div>
        ${total > 0 ? `
        <div class="wf-card__progress">
            <div class="wf-card__progress-bar wf-card__progress-bar--${barClass}" style="width:${pct}%"></div>
        </div>` : ''}
        <div class="wf-card__footer">
            <div class="wf-card__assignee">
                <div class="wf-card__assignee-avatar">${initials}</div>
                <span>${assigneeName}</span>
            </div>
            <span class="wf-card__time">${timeInfo}</span>
        </div>
    `;

    // Click to open detail
    card.addEventListener('click', (e) => {
        if (card.classList.contains('dragging')) return;
        openTaskDetail(task.id);
    });

    // Drag
    card.addEventListener('dragstart', (e) => {
        draggedCard = card;
        draggedTaskId = task.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCard = null;
        draggedTaskId = null;
        document.querySelectorAll('.wf-column__body').forEach(c => c.classList.remove('drag-over'));
    });

    return card;
}

function getTaskTitle(task) {
    switch (task.type) {
        case 'RECEIPT': return `Приёмка от поставщика`;
        case 'PICKING': return `Сборка заказа`;
        case 'TRANSFER': return `Перемещение`;
        case 'INVENTORY': return `Инвентаризация`;
        default: return task.type || 'Задача';
    }
}

// ==================== DRAG & DROP ====================

function setupDropZone(col, status) {
    col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
            col.classList.remove('drag-over');
        }
    });
    col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        if (!draggedTaskId) return;

        const task = allTasks.find(t => t.id == draggedTaskId);
        if (!task) return;
        if (task.status === status) return;

        try {
            await transitionTask(draggedTaskId, status);
            task.status = status;
            renderBoard();
            alertMsg(`Задача ${task.number} → ${statusLabel(status)}`, 'success');
        } catch (e) {
            alertMsg('Ошибка: ' + e.message);
        }
    });
}

function statusLabel(status) {
    return {
        PENDING: 'Ожидает',
        ASSIGNED: 'Назначена',
        IN_PROGRESS: 'В работе',
        COMPLETED: 'Завершена',
        CANCELLED: 'Отменена'
    }[status] || status;
}

async function transitionTask(taskId, newStatus) {
    switch (newStatus) {
        case 'ASSIGNED':
            // Take task (assign self)
            await api('POST', `/api/tasks/${taskId}/take`);
            break;
        case 'IN_PROGRESS':
            await api('POST', `/api/tasks/${taskId}/start`);
            break;
        case 'COMPLETED':
            await api('POST', `/api/tasks/${taskId}/complete`);
            break;
        case 'CANCELLED':
            // No direct cancel endpoint, reload
            throw new Error('Отмена задачи пока не поддерживается через доску');
        case 'PENDING':
            throw new Error('Возврат в "Ожидание" не поддерживается');
        default:
            throw new Error('Неизвестный статус: ' + newStatus);
    }
}

// ==================== TASK DETAIL MODAL ====================

async function openTaskDetail(taskId) {
    try {
        const task = await api('GET', `/api/tasks/${taskId}`);
        if (!task) return;

        const modal = document.getElementById('taskModal');
        document.getElementById('modalTitle').textContent = `${task.number} — ${getTaskTitle(task)}`;

        // Build timeline
        const steps = [
            { label: 'Создана', done: true, time: task.createdAt },
            { label: 'Назначена', done: !!task.assignedAt, active: task.status === 'ASSIGNED', time: task.assignedAt },
            { label: 'В работе', done: !!task.startedAt, active: task.status === 'IN_PROGRESS', time: task.startedAt },
            { label: 'Завершена', done: !!task.completedAt, active: task.status === 'COMPLETED', time: task.completedAt }
        ];

        let timelineHTML = '<div class="wf-timeline">';
        steps.forEach((s, i) => {
            if (i > 0) {
                timelineHTML += `<div class="wf-timeline__line ${s.done ? 'wf-timeline__line--done' : ''}"></div>`;
            }
            const dotClass = s.done ? 'wf-timeline__dot--done' : s.active ? 'wf-timeline__dot--active' : '';
            const icon = s.done && !s.active ? '✓' : (i + 1);
            timelineHTML += `
                <div class="wf-timeline__step">
                    <div class="wf-timeline__dot ${dotClass}">${icon}</div>
                    <div class="wf-timeline__label">${s.label}</div>
                </div>`;
        });
        timelineHTML += '</div>';

        // Detail table
        const detailHTML = `
            <table class="wf-detail-table">
                <tr><td>Тип</td><td><span class="wf-card__type type-${task.type}" style="font-size:12px;">${task.type}</span></td></tr>
                <tr><td>Статус</td><td><strong>${statusLabel(task.status)}</strong></td></tr>
                <tr><td>Склад</td><td>${task.warehouseName || '—'}</td></tr>
                <tr><td>Создал</td><td>${task.createdByName || '—'}</td></tr>
                <tr><td>Исполнитель</td><td>${task.assigneeName || 'Не назначен'}</td></tr>
                <tr><td>Создана</td><td>${formatDate(task.createdAt)}</td></tr>
                ${task.assignedAt ? `<tr><td>Назначена</td><td>${formatDate(task.assignedAt)}</td></tr>` : ''}
                ${task.startedAt ? `<tr><td>Начата</td><td>${formatDate(task.startedAt)}</td></tr>` : ''}
                ${task.completedAt ? `<tr><td>Завершена</td><td>${formatDate(task.completedAt)}</td></tr>` : ''}
                ${task.notes ? `<tr><td>Заметки</td><td>${task.notes}</td></tr>` : ''}
            </table>
        `;

        // Items table
        const items = task.items || [];
        let itemsHTML = '';
        if (items.length > 0) {
            itemsHTML = `
                <h4 style="margin:16px 0 8px; font-size:14px;">📦 Позиции (${items.filter(i => i.confirmed).length}/${items.length})</h4>
                <table class="wf-items-table">
                    <thead>
                        <tr>
                            <th>Товар</th>
                            <th>SKU</th>
                            <th>Ячейка</th>
                            <th>План</th>
                            <th>Факт</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(i => `
                            <tr>
                                <td><strong>${i.productName || '—'}</strong></td>
                                <td style="color:var(--muted);">${i.productSku || '—'}</td>
                                <td>${i.locationCode || '—'}</td>
                                <td>${i.qtyPlanned ?? '—'}</td>
                                <td>${i.qtyActual ?? '—'}</td>
                                <td>${i.confirmed ? '✅' : '⏳'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        document.getElementById('modalBody').innerHTML = timelineHTML + detailHTML + itemsHTML;

        // Footer buttons
        let footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>';
        if (task.status === 'PENDING') {
            footerHTML += `<button class="btn btn-primary" onclick="takeTask(${task.id})">👤 Взять в работу</button>`;
        } else if (task.status === 'ASSIGNED') {
            footerHTML += `<button class="btn btn-primary" onclick="startTask(${task.id})">▶️ Начать</button>`;
        } else if (task.status === 'IN_PROGRESS') {
            const allConfirmed = items.length > 0 && items.every(i => i.confirmed);
            if (allConfirmed) {
                footerHTML += `<button class="btn btn-primary" onclick="completeTaskAction(${task.id})">✅ Завершить</button>`;
            }
            // Link to picking/receipt task page
            if (task.type === 'PICKING') {
                footerHTML += `<a class="btn btn-secondary" href="/worker/picking-task.html?id=${task.id}">📦 Открыть сборку</a>`;
            } else if (task.type === 'RECEIPT') {
                footerHTML += `<a class="btn btn-secondary" href="/worker/receipt-task.html?id=${task.id}">📥 Открыть приёмку</a>`;
            }
        }
        document.getElementById('modalFooter').innerHTML = footerHTML;

        document.getElementById('modalOverlay').style.display = 'flex';
    } catch (e) {
        alertMsg('Ошибка загрузки задачи: ' + e.message);
    }
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// Close on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ==================== TASK ACTIONS ====================

async function takeTask(taskId) {
    try {
        await api('POST', `/api/tasks/${taskId}/take`);
        closeModal();
        await loadBoard();
        alertMsg('Задача назначена вам', 'success');
    } catch (e) {
        alertMsg('Ошибка: ' + e.message);
    }
}

async function startTask(taskId) {
    try {
        await api('POST', `/api/tasks/${taskId}/start`);
        closeModal();
        await loadBoard();
        alertMsg('Задача начата', 'success');
    } catch (e) {
        alertMsg('Ошибка: ' + e.message);
    }
}

async function completeTaskAction(taskId) {
    try {
        await api('POST', `/api/tasks/${taskId}/complete`);
        closeModal();
        await loadBoard();
        alertMsg('Задача завершена! ✅', 'success');
    } catch (e) {
        alertMsg('Ошибка: ' + e.message);
    }
}
