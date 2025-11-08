// вызов логина + редирект
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const errBox = document.getElementById('errorBox');
    errBox.textContent = '';

    try {
        await login(username, password);          // <- твоя функция
        localStorage.setItem('username', username);
        // редирект на главную после входа
        window.location.replace('/dashboard.html');
    } catch (e2) {
        errBox.textContent = e2.message || 'Ошибка входа';
    }
});
