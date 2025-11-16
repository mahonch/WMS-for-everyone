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

async function debugAuthContext(pageName) {
    const lsToken = localStorage.getItem('token');
    const lsRole  = localStorage.getItem('role');
    const lsUser  = localStorage.getItem('username');

    console.log(`[%c${pageName}%c] localStorage`, 'color: green', 'color: inherit', {
        token: lsToken,
        role: lsRole,
        username: lsUser,
    });

    let jwtPayload = null;
    if (lsToken) {
        jwtPayload = decodeJwt(lsToken);
        console.log(`[%c${pageName}%c] JWT payload`, 'color: green', 'color: inherit', jwtPayload);
    } else {
        console.log(`[%c${pageName}%c] JWT токен отсутствует`, 'color: green', 'color: inherit');
    }

    try {
        const res = await fetch('/api/auth/me', {
            headers: lsToken ? { 'Authorization': 'Bearer ' + lsToken } : {}
        });
        const body = await res.json();
        console.log(`[%c${pageName}%c] /api/auth/me → ${res.status}`, 'color: green', 'color: inherit', body);
    } catch (e) {
        console.warn(`[%c${pageName}%c] Ошибка запроса /api/auth/me`, 'color: green', 'color: inherit', e);
    }
}
