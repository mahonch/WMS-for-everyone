// Если уже вошёл — сразу на дашборд
function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch (e) {
        console.warn('[auth-debug] Не удалось декодировать JWT:', e);
        return null;
    }
}
if (localStorage.getItem('token')) {
    window.location.replace('/dashboard.html');
}

// ---- LOGIN FUNCTION ----
async function login(username, password) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = body?.error || 'Ошибка входа';
        throw new Error(msg);
    }

    const token = body.accessToken;
    if (!token) {
        throw new Error('Некорректный ответ сервера: отсутствует accessToken');
    }

    // Сохраняем токены и роль
    localStorage.setItem('token', token);
    localStorage.setItem('refresh', body.refreshToken);
    localStorage.setItem('role', body.role);

    // --------------------------------------------
    // NEW ⭐ ДЕКОДИРУЕМ JWT И СОХРАНЯЕМ USERID
    // --------------------------------------------
    const payload = decodeJwt(token);
    if (payload) {
        // Обычно sub — это userId
        if (payload.sub) {
            localStorage.setItem('userid', payload.sub);
        }

        // Если backend добавит поля userId / username — тоже сохраним
        if (payload.userId) {
            localStorage.setItem('userid', payload.userId);
        }
        if (payload.username) {
            localStorage.setItem('username', payload.username);
        }
    }
}

// ---- FORM SUBMIT ----
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const errBox = document.getElementById('errorBox');
    errBox.classList.remove('hidden');
    errBox.textContent = '';

    try {
        console.log('⏳ Вход...');
        await login(username, password);
        console.log('✅ Успешный вход, перенаправление...');

        // Если JWT нет username — берём тот, что ввёл пользователь
        if (!localStorage.getItem('username')) {
            localStorage.setItem('username', username);
        }

        window.location.replace('/dashboard.html');
    } catch (e2) {
        console.error('Ошибка входа:', e2);
        errBox.textContent = e2.message || 'Ошибка входа';
    }
});
