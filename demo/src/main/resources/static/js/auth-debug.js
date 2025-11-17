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
    const lsUserId = localStorage.getItem('userid');

    console.log(
        `[${pageName}] localStorage`,
        {
            token: lsToken,
            role: lsRole,
            username: lsUser,
            userid: lsUserId
        }
    );

    let jwtPayload = null;
    if (lsToken) {
        jwtPayload = decodeJwt(lsToken);
        console.log(`[${pageName}] JWT payload`, jwtPayload);
    } else {
        console.log(`[${pageName}] JWT токен отсутствует`);
    }

    try {
        const res = await fetch('/api/auth/me', {
            headers: lsToken ? { 'Authorization': 'Bearer ' + lsToken } : {}
        });
        const body = await res.json();
        console.log(`[${pageName}] /api/auth/me → ${res.status}`, body);
    } catch (e) {
        console.warn(`[${pageName}] Ошибка запроса /api/auth/me`, e);
    }
}
