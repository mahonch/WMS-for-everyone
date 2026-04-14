/**
 * Worker App Logic
 */

const API_BASE = ''; // Use relative path to backend

/* ==================== API HELPERS ==================== */

async function api(method, url, body) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        throw new Error('No token');
    }

    const opts = {
        method: method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + url, opts);
    
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/index.html';
        return;
    }

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Request failed');
    }

    return res.json();
}

/* ==================== UI HELPERS ==================== */

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function formatType(type) {
    if (type === 'RECEIPT') return 'Приёмка';
    if (type === 'PICKING') return 'Сборка';
    return type;
}

function formatRole(role) {
    if (!role) return '—';
    const r = role.replace(/^ROLE_/i, '').toUpperCase();
    if (r === 'STOREKEEPER') return 'Кладовщик';
    if (r === 'PICKER') return 'Сборщик';
    if (r === 'ADMIN') return 'Администратор';
    if (r === 'MANAGER') return 'Менеджер';
    return r;
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
}

/* ==================== WORKER PROFILE ==================== */

async function loadProfile() {
    try {
        const data = await api('GET', '/api/workers/me');
        renderProfile(data);
    } catch (e) {
        console.error(e);
    }
}

function renderProfile(data) {
    const { user } = data; // Assuming backend returns user info or we get from token storage
    
    // We might need to fetch user name separately or include in profile DTO. 
    // For now, let's use localStorage username as fallback.
    const name = localStorage.getItem('username') || 'Работник';
    document.getElementById('workerName').textContent = name;
    const roleRaw = localStorage.getItem('role') || '';
    document.getElementById('roleBadge').textContent = formatRole(roleRaw);

    const shift = data.currentShift;
    const stats = data.stats;

    // Status Badge
    const badge = document.getElementById('shiftStatusBadge');
    const btn = document.getElementById('shiftActionBtn');

    if (shift && shift.status === 'ACTIVE') {
        badge.className = 'shift-badge shift-active';
        badge.textContent = '● На смене';
        btn.textContent = 'Завершить смену';
        btn.className = 'btn btn-danger';
        btn.onclick = endShift;
        
        // Stats
        if (stats) {
            document.getElementById('statTasks').textContent = stats.completedTasks;
            const mins = stats.shiftDurationMinutes || 0;
            const hours = Math.floor(mins / 60);
            const remMins = mins % 60;
            document.getElementById('statTime').textContent = `${hours}ч ${remMins}м`;
        }
    } else {
        badge.className = 'shift-badge shift-inactive';
        badge.textContent = '● Не на смене';
        btn.textContent = 'Начать смену';
        btn.className = 'btn btn-primary';
        btn.onclick = startShift;
        
        document.getElementById('statTasks').textContent = '—';
        document.getElementById('statTime').textContent = '—';
    }
}

async function startShift() {
    try {
        await api('POST', '/api/workers/me/shift/start');
        showToast('Смена начата');
        loadProfile();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function endShift() {
    if (!confirm('Завершить смену?')) return;
    try {
        await api('POST', '/api/workers/me/shift/end');
        showToast('Смена завершена');
        loadProfile();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function generateTestOrder() {
    if (!confirm('Создать тестовый заказ?')) return;
    try {
        const task = await api('POST', '/api/orders/generate');
        showToast('Заказ создан! ID задачи: ' + task.id);
        // Refresh tasks if we are on tasks page
        if (window.location.pathname.includes('tasks.html')) {
            loadTasks('available');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* ==================== TASKS LIST ==================== */

async function loadTasks(filter = 'assigned') {
    const container = document.getElementById('tasksContainer');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Загрузка...</p>';

    try {
        let url = '';
        if (filter === 'assigned') {
            url = '/api/tasks/my?page=0&size=50';
        } else {
            // берем все доступные типы; бэкенд понимает пустой type как "любой"
            url = '/api/tasks/available?page=0&size=50';
        }
        
        const data = await api('GET', url);
        const tasks = data.content || [];

        if (tasks.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:40px; color:#999;">Задач нет</p>';
            return;
        }

        container.innerHTML = '';
        tasks.forEach(t => {
            const taskPage = resolveTaskPage(t.type);
            const el = document.createElement('div');
            el.className = `task-item type-${t.type.toLowerCase()}`;
            el.onclick = () => window.location.href = `${taskPage}?id=${t.id}`;
            
            el.innerHTML = `
                <div class="task-header">
                    <span class="task-number">${t.number}</span>
                    <span class="task-status">${formatType(t.type)}</span>
                </div>
                <div class="task-meta">
                    Склад: ${t.warehouseName}<br>
                    Создан: ${formatDate(t.createdAt)}
                </div>
            `;
            container.appendChild(el);
        });

    } catch (e) {
        container.innerHTML = `<p style="color:red; text-align:center;">Ошибка: ${e.message}</p>`;
    }
}

/* ==================== TASK EXECUTION ==================== */

let currentTask = null;

// Выбор целевой страницы под конкретный тип задачи
function resolveTaskPage(type) {
    if (!type) return 'task.html';
    if (type === 'RECEIPT') return 'task-receipt.html';
    if (type === 'PICKING') return 'task-picking.html';
    return 'task.html';
}

async function loadTaskDetail() {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) { alert('Нет ID задачи'); window.history.back(); return; }

    try {
        currentTask = await api('GET', `/api/tasks/${taskId}`);
        renderTaskDetail();
    } catch (e) {
        alert(e.message);
        window.history.back();
    }
}

function renderTaskDetail() {
    document.getElementById('taskNumber').textContent = currentTask.number;
    document.getElementById('taskType').textContent = formatType(currentTask.type);
    
    const itemsContainer = document.getElementById('taskItemsContainer');
    itemsContainer.innerHTML = '';

    const items = currentTask.items || [];
    let progress = 0;
    
    items.forEach((item, index) => {
        if (item.confirmed) progress++;

        const div = document.createElement('div');
        div.className = `item-row ${item.confirmed ? 'confirmed' : ''}`;
        div.id = `item-row-${item.id}`;
        
        const statusIcon = item.confirmed ? '✅' : '⭕';
        
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.productName}</span>
                <span class="item-qty">План: ${item.qtyPlanned} | Факт: ${item.qtyActual || 0}</span>
                ${item.locationName ? `<span class="item-qty">Ячейка: ${item.locationName}</span>` : ''}
            </div>
            <div class="item-status">${statusIcon}</div>
        `;

        // Click to scan if not confirmed
        if (!item.confirmed) {
            div.onclick = () => openScanner(item.id, index);
        }
        
        itemsContainer.appendChild(div);
    });

    // Update progress bar
    const percent = items.length > 0 ? Math.round((progress / items.length) * 100) : 0;
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').textContent = `${progress} / ${items.length} выполнено`;

    // Complete button state
    const btn = document.getElementById('completeTaskBtn');
    if (percent === 100) {
        btn.disabled = false;
        btn.textContent = 'Завершить задачу';
        btn.className = 'btn-worker btn-success';
    } else {
        btn.disabled = true;
        btn.textContent = 'Завершите все позиции';
        btn.className = 'btn-worker btn-outline';
    }
}

/* ==================== QR SCANNER ==================== */

let html5QrcodeScanner = null;

function openScanner(itemId, itemIndex) {
    const container = document.getElementById('scannerContainer');
    container.classList.add('active');

    const scanner = new Html5Qrcode("reader");
    html5QrcodeScanner = scanner;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
            handleScanSuccess(decodedText, itemId, itemIndex);
        },
        (errorMessage) => {
            // parse error, ignore loop
        }
    ).catch(err => {
        console.error("Scanner start error", err);
        showToast('Ошибка камеры: ' + err, 'error');
        closeScanner();
    });
}

function closeScanner() {
    const container = document.getElementById('scannerContainer');
    container.classList.remove('active');
    
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
        }).catch(err => console.error("Scanner stop error", err));
    }
}

async function handleScanSuccess(decodedText, itemId, itemIndex) {
    try {
        // Decode JSON from QR
        // Expected QR format: {"t": "product"|"loc", "id": 123}
        const data = JSON.parse(decodedText);
        
        if (!data.t || !data.id) {
            showToast('Неверный формат QR', 'error');
            return;
        }

        // Determine qty to confirm. For now, confirm full planned qty.
        // In real app, user might input partial qty.
        const item = currentTask.items[itemIndex];
        const qtyToConfirm = item.qtyPlanned;

        // Call API
        await api('POST', `/api/tasks/${currentTask.id}/items/${itemId}/confirm`, {
            qtyActual: qtyToConfirm
        });

        // Vibrate on success
        if (navigator.vibrate) navigator.vibrate(200);
        
        showToast('Позиция подтверждена');
        
        // Reload task to update UI
        closeScanner();
        loadTaskDetail();

    } catch (e) {
        console.error(e);
        showToast('Ошибка: ' + e.message, 'error');
    }
}

async function completeTask() {
    if (!confirm('Завершить задачу?')) return;
    try {
        await api('POST', `/api/tasks/${currentTask.id}/complete`);
        showToast('Задача завершена!');
        setTimeout(() => window.location.href = 'tasks.html', 1500);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* ==================== INIT ==================== */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Simple router based on page
    if (path.endsWith('index.html') || path === '/pages/worker/' || path === '/pages/worker') {
        loadProfile();
    } else if (path.endsWith('tasks.html')) {
        loadTasks('assigned');
        // Setup tab switcher logic if needed
    } else if (path.endsWith('task.html')) {
        loadTaskDetail();
        
        document.getElementById('scannerCloseBtn').onclick = closeScanner;
        document.getElementById('completeTaskBtn').onclick = completeTask;
        document.getElementById('backBtn').onclick = () => window.history.back();
    }
});
