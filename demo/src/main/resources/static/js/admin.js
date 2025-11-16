// /js/admin.js

// Общий дебаг авторизации
debugAuthContext('ADMIN_PAGE').then(() => {
    console.log('[ADMIN_PAGE] debugAuthContext завершён');
});

// проверка роли на фронте
const role = (localStorage.getItem('role') || '').toUpperCase();
console.log('[ADMIN_PAGE] role from LS =', role);

if (!role.includes('ADMIN')) {
    console.warn('[ADMIN_PAGE] Нет роли ADMIN на фронте, редирект на /index.html');
    alert('Требуется роль ADMIN');
    window.location.replace('/index.html');
}

// шапка/выход
document.getElementById('usernameLabel').textContent =
    localStorage.getItem('username') || 'admin';
document.getElementById('logoutBtn').addEventListener('click', () => {
    console.log('[ADMIN_PAGE] Logout clicked, очищаем localStorage');
    localStorage.clear();
    window.location.href = '/index.html';
});

// алерты
const alerts = document.getElementById('alerts');
function alertBox(type, text) {
    const div = document.createElement('div');
    div.className = `alert ${type}`;
    div.textContent = text;
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

// универсальный запрос к API с логированием
async function api(method, url, body) {
    const token = localStorage.getItem('token') || '';
    console.log('[ADMIN_PAGE][api] →', method, url, {
        tokenPresent: !!token,
        tokenShort: token ? token.substring(0, 20) + '...' : null,
        body
    });

    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    try {
        data = await res.json();
    } catch (_) {
        console.warn('[ADMIN_PAGE][api] Не удалось распарсить JSON ответа');
    }

    console.log('[ADMIN_PAGE][api] ←', method, url, 'status =', res.status, 'body =', data);

    if (!res.ok) {
        const msg = (data && (data.error || data.message)) || `Ошибка ${res.status}`;
        console.error('[ADMIN_PAGE][api] Ошибка:', msg);
        throw new Error(msg);
    }
    return data;
}

// отрисовка таблицы
async function loadUsers() {
    console.log('[ADMIN_PAGE] loadUsers() start');
    const list = await api('GET', '/api/admin/users');
    console.log('[ADMIN_PAGE] loadUsers() got', list);

    const tb = document.querySelector('#usersTable tbody');
    tb.innerHTML = '';
    for (const u of list) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td></td>
      <td>${u.active ? 'ACTIVE' : 'BLOCKED'}</td>
      <td>
        <select data-id="${u.id}" class="roleSelect">
          ${['ADMIN','MANAGER','STOREKEEPER','GUEST'].map(r =>
            `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-danger delBtn" data-id="${u.id}">Удалить</button>
        <button class="btn btn-secondary blockBtn" data-id="${u.id}" data-status="${u.active}">
          ${u.active ? 'Заблокировать' : 'Активировать'}
        </button>
      </td>
    `;
        tb.appendChild(tr);
    }
}

// обработчики действий — роли
document.querySelector('#usersTable').addEventListener('change', async (e) => {
    if (e.target.classList.contains('roleSelect')) {
        const id = +e.target.dataset.id;
        const roleCode = e.target.value;
        console.log('[ADMIN_PAGE] change role', { id, roleCode });
        try {
            await api('PUT', `/api/admin/users/${id}/role`, { roleCode });
            alertBox('success', 'Роль обновлена');
        } catch (err) {
            alertBox('error', err.message);
            await loadUsers(); // откатить UI
        }
    }
});

// обработчики действий — delete + active
document.querySelector('#usersTable').addEventListener('click', async (e) => {
    const del = e.target.closest('.delBtn');
    const block = e.target.closest('.blockBtn');

    if (del) {
        const id = +del.dataset.id;
        console.log('[ADMIN_PAGE] delete user', id);
        if (!confirm('Удалить пользователя?')) return;
        try {
            await api('DELETE', `/api/admin/users/${id}`);
            alertBox('success', 'Удалён');
            await loadUsers();
        } catch (err) {
            alertBox('error', err.message);
        }
    }

    else if (block) {
        const id = +block.dataset.id;
        const current = block.dataset.status === "true";
        const nextActive = !current;

        console.log('[ADMIN_PAGE] toggle active', { id, current, nextActive });

        try {
            await api('PUT', `/api/admin/users/${id}/active`, { active: nextActive });
            alertBox('success', 'Статус изменён');
            await loadUsers();
        } catch (err) {
            alertBox('error', err.message);
        }
    }
});

// создание пользователя
const createPanel = document.getElementById('createPanel');
document.getElementById('btnOpenCreate').onclick = () => {
    console.log('[ADMIN_PAGE] open create panel');
    createPanel.style.display = 'block';
};
document.getElementById('btnCancelCreate').onclick = () => {
    console.log('[ADMIN_PAGE] cancel create');
    createPanel.style.display = 'none';
};

document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('c_username').value.trim();
    const email = document.getElementById('c_email').value.trim();
    const password = document.getElementById('c_password').value;
    const roleCode = document.getElementById('c_role').value;

    console.log('[ADMIN_PAGE] create user submit', { username, email, roleCode });

    try {
        await api('POST', '/api/admin/users', { username, email, password, roleCode });
        alertBox('success', 'Пользователь создан');
        createPanel.style.display = 'none';
        e.target.reset();
        await loadUsers();
    } catch (err) {
        alertBox('error', err.message);
    }
});

// старт
loadUsers().catch(e => {
    console.error('[ADMIN_PAGE] loadUsers error', e);
    alertBox('error', e.message);
});
