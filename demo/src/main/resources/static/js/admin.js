// проверка роли
const role = localStorage.getItem('role') || '';
if (!role.includes('ADMIN')) {
    alert('Требуется роль ADMIN');
    window.location.replace('/index.html');
}

// шапка/выход
document.getElementById('usernameLabel').textContent =
    localStorage.getItem('username') || 'admin';
document.getElementById('logoutBtn').addEventListener('click', () => {
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

async function api(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
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

// отрисовка таблицы
async function loadUsers() {
    const list = await api('GET', '/api/admin/users');
    const tb = document.querySelector('#usersTable tbody');
    tb.innerHTML = '';
    for (const u of list) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.email ?? ''}</td>
      <td>${u.status}</td>
      <td>
        <select data-id="${u.id}" class="roleSelect">
          ${['ADMIN','MANAGER','STOREKEEPER','GUEST'].map(r =>
            `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-danger delBtn" data-id="${u.id}">Удалить</button>
        <button class="btn btn-secondary blockBtn" data-id="${u.id}" data-status="${u.status}">
          ${u.status==='ACTIVE'?'Заблокировать':'Активировать'}
        </button>
      </td>
    `;
        tb.appendChild(tr);
    }
}

// обработчики действий в таблице (делегирование)
document.querySelector('#usersTable').addEventListener('change', async (e) => {
    if (e.target.classList.contains('roleSelect')) {
        const id = +e.target.dataset.id;
        const roleCode = e.target.value;
        try {
            await api('PUT', `/api/admin/users/${id}/role`, { roleCode });
            alertBox('success', 'Роль обновлена');
        } catch (err) {
            alertBox('error', err.message);
            await loadUsers(); // откатить UI
        }
    }
});

document.querySelector('#usersTable').addEventListener('click', async (e) => {
    const del = e.target.closest('.delBtn');
    const block = e.target.closest('.blockBtn');
    if (del) {
        const id = +del.dataset.id;
        if (!confirm('Удалить пользователя?')) return;
        try {
            await api('DELETE', `/api/admin/users/${id}`);
            alertBox('success', 'Удалён');
            await loadUsers();
        } catch (err) {
            alertBox('error', err.message);
        }
    } else if (block) {
        const id = +block.dataset.id;
        const current = block.dataset.status;
        const next = current === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        try {
            await api('PUT', `/api/admin/users/${id}/status`, { status: next });
            alertBox('success', 'Статус изменён');
            await loadUsers();
        } catch (err) {
            alertBox('error', err.message);
        }
    }
});

// создание пользователя
const createPanel = document.getElementById('createPanel');
document.getElementById('btnOpenCreate').onclick = () => createPanel.style.display = 'block';
document.getElementById('btnCancelCreate').onclick = () => createPanel.style.display = 'none';

document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('c_username').value.trim();
    const email = document.getElementById('c_email').value.trim();
    const password = document.getElementById('c_password').value;
    const roleCode = document.getElementById('c_role').value;
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
loadUsers().catch(e => alertBox('error', e.message));
