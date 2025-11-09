// если уже вошёл — на дашборд
if (localStorage.getItem('token')) {
    window.location.replace('/dashboard.html');
}

// ---- функция логина ----
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

    localStorage.setItem('token', token);
    localStorage.setItem('refresh', body.refreshToken);
    localStorage.setItem('role', body.role);
}

// ---- обработчик формы ----
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
        localStorage.setItem('username', username);
        window.location.replace('/dashboard.html');
    } catch (e2) {
        console.error('Ошибка входа:', e2);
        errBox.textContent = e2.message || 'Ошибка входа';
    }
});
