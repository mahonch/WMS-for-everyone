// /js/admin.js

console.log('[ADMIN] init...');

// Проверка роли
const role = (localStorage.getItem('role') || '').toUpperCase();
if (!role.includes('ADMIN')) {
    console.warn('[ADMIN] Нет роли ADMIN');
    alert('Требуется роль ADMIN');
    window.location.replace('/index.html');
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    initPage();
});

let usersCache = [];

function initPage() {
    console.log('[ADMIN] initPage');
    
    // Username и logout
    document.getElementById('usernameLabel').textContent = localStorage.getItem('username') || 'admin';
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    // Кнопки создания
    document.getElementById('btnOpenCreate').onclick = () => {
        document.getElementById('createPanel').style.display = 'block';
    };
    document.getElementById('btnCancelCreate').onclick = () => {
        document.getElementById('createPanel').style.display = 'none';
    };
    document.getElementById('btnCancelCreate2').onclick = () => {
        document.getElementById('createPanel').style.display = 'none';
    };

    // Форма создания
    document.getElementById('createForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('c_username').value.trim();
        const email = document.getElementById('c_email').value.trim();
        const password = document.getElementById('c_password').value;
        const roleCode = document.getElementById('c_role').value;

        try {
            await api('POST', '/api/admin/users', { username, email, password, roleCode });
            showAlert('success', 'Пользователь создан');
            document.getElementById('createPanel').style.display = 'none';
            e.target.reset();
            await loadUsers();
        } catch (err) {
            showAlert('error', err.message);
        }
    });

    // Drag-and-drop для колонок
    setupDragAndDrop();

    // Загрузка пользователей
    loadUsers();
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

// Загрузка пользователей
async function loadUsers() {
    try {
        usersCache = await api('GET', '/api/admin/users');
        renderUsers();
    } catch (err) {
        showAlert('error', 'Не удалось загрузить пользователей: ' + err.message);
    }
}

// Рендер пользователей по колонкам
function renderUsers() {
    const activeContainer = document.getElementById('activeUsers');
    const blockedContainer = document.getElementById('blockedUsers');
    
    activeContainer.innerHTML = '';
    blockedContainer.innerHTML = '';
    
    const activeUsers = usersCache.filter(u => u.active);
    const blockedUsers = usersCache.filter(u => !u.active);
    
    // Обновляем счетчики
    document.getElementById('activeCount').textContent = activeUsers.length;
    document.getElementById('blockedCount').textContent = blockedUsers.length;
    
    // Рендерим активных
    if (activeUsers.length === 0) {
        activeContainer.innerHTML = '<div class="drop-hint">Перетащите пользователя сюда для активации</div>';
    } else {
        activeUsers.forEach(u => {
            activeContainer.appendChild(createUserCard(u));
        });
    }
    
    // Рендерим заблокированных
    if (blockedUsers.length === 0) {
        blockedContainer.innerHTML = '<div class="drop-hint">Перетащите пользователя сюда для блокировки</div>';
    } else {
        blockedUsers.forEach(u => {
            blockedContainer.appendChild(createUserCard(u));
        });
    }
}

// Создание карточки пользователя
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.draggable = true;
    card.dataset.userId = user.id;
    
    const roleClass = `role-${user.role}`;
    
    card.innerHTML = `
        <div class="user-card__header">
            <div>
                <div class="user-card__name">${user.username}</div>
                <div class="user-card__email">${user.email || '—'}</div>
            </div>
            <span class="user-card__role ${roleClass}">${user.role}</span>
        </div>
        
        <div class="user-card__info">
            <div class="user-card__info-item">
                <div class="user-card__info-label">Статус</div>
                <div>${user.active ? '✅' : '🚫'}</div>
            </div>
            <div class="user-card__info-item">
                <div class="user-card__info-label">Склад</div>
                <div style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${user.warehouseName || '—'}</div>
            </div>
        </div>
        
        <div class="user-card__actions">
            <button class="btn btn-primary" onclick="openUserProfile(${user.id})">Профиль</button>
            <button class="btn btn-danger" onclick="deleteUser(${user.id})" style="flex: 0 0 40px;">🗑</button>
        </div>
    `;
    
    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    return card;
}

// Drag-and-drop логика
let draggedCard = null;

function setupDragAndDrop() {
    const containers = document.querySelectorAll('.board-list');
    
    containers.forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.userId);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedCard = null;
    
    // Убираем подсветку со всех колонок
    document.querySelectorAll('.board-list').forEach(list => {
        list.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    // Убираем подсветку только если уходим из контейнера
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const userId = e.dataTransfer.getData('text/plain');
    const newStatus = this.dataset.status;
    
    if (!userId) return;
    
    const user = usersCache.find(u => u.id == userId);
    if (!user) return;
    
    const shouldBeActive = newStatus === 'active';
    
    // Если статус не изменился - ничего не делаем
    if (user.active === shouldBeActive) return;
    
    // Подтверждение
    const actionText = shouldBeActive ? 'активировать' : 'заблокировать';
    if (!confirm(`Вы уверены, что хотите ${actionText} пользователя ${user.username}?`)) {
        return;
    }
    
    try {
        await api('PUT', `/api/admin/users/${userId}/status`, { 
            status: shouldBeActive ? 'ACTIVE' : 'BLOCKED' 
        });
        showAlert('success', `Пользователь ${shouldBeActive ? 'активирован' : 'заблокирован'}`);
        await loadUsers();
    } catch (err) {
        showAlert('error', err.message);
    }
}

// Открыть профиль пользователя
window.openUserProfile = function(userId) {
    window.location.href = `/admin-user-profile.html?id=${userId}`;
};

// Удалить пользователя (для кнопки в карточке)
window.deleteUser = async function(userId) {
    if (!confirm('Вы уверены, что хотите удалить пользователя?')) return;
    
    try {
        await api('DELETE', `/api/admin/users/${userId}`);
        showAlert('success', 'Пользователь удалён');
        await loadUsers();
    } catch (err) {
        showAlert('error', err.message);
    }
};
