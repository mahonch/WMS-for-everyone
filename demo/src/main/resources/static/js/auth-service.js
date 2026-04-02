/**
 * Auth Service - Управление аутентификацией и токенами
 * 
 * Функции:
 * - Автоматическое обновление токена при истечении
 * - Перехват 401 ошибок
 * - Отслеживание активности пользователя
 * - Logout при длительной неактивности
 */

window.AuthService = {
    // Таймер проверки токена
    tokenCheckInterval: null,
    
    // Таймер неактивности
    inactivityTimer: null,
    
    // Время неактивности до logout (30 минут)
    INACTIVITY_TIMEOUT: 30 * 60 * 1000,
    
    // Интервал проверки токена (5 минут)
    TOKEN_CHECK_INTERVAL: 5 * 60 * 1000,
    
    // Флаг что токен обновляется
    isRefreshing: false,
    
    // Очередь запросов ожидающих refresh
    refreshQueue: [],

    /**
     * Инициализация сервиса
     */
    init() {
        console.log('[AuthService] Initialized');
        
        // Проверяем токен при старте (но не редиректим сразу)
        this.checkToken();
        
        // Запускаем периодическую проверку
        this.startTokenChecker();
        
        // Отслеживаем активность пользователя
        this.trackActivity();
        
        // Перехватываем 401 ошибки глобально
        this.intercept401();
    },

    /**
     * Проверка токена
     */
    checkToken() {
        const token = localStorage.getItem('token');
        const expiresAt = localStorage.getItem('tokenExpiresAt');
        
        if (!token) {
            // Не редиректим сразу - пусть страница грузится
            // Редирект будет при первом API запросе
            console.log('[AuthService] No token stored');
            return;
        }
        
        if (expiresAt && Date.now() >= parseInt(expiresAt)) {
            console.log('[AuthService] Token expired, refreshing...');
            this.refreshToken();
        } else {
            console.log('[AuthService] Token is valid');
        }
    },

    /**
     * Обновление токена
     */
    async refreshToken() {
        if (this.isRefreshing) {
            // Если уже обновляем - ждем
            return new Promise((resolve) => {
                this.refreshQueue.push(resolve);
            });
        }
        
        this.isRefreshing = true;
        
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
            console.error('[AuthService] No refresh token');
            this.redirectToLogin();
            this.isRefreshing = false;
            return Promise.reject('No refresh token');
        }
        
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });
            
            if (!response.ok) {
                throw new Error('Refresh failed');
            }
            
            const data = await response.json();
            
            // Сохраняем новые токены
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken || refreshToken);
            localStorage.setItem('tokenExpiresAt', Date.now() + data.expiresIn - 60000); // -1 минута запас
            
            console.log('[AuthService] Token refreshed successfully');
            
            // Разрешаем все ожидающие запросы
            this.refreshQueue.forEach(resolve => resolve(data.accessToken));
            this.refreshQueue = [];
            
            return data.accessToken;
            
        } catch (error) {
            console.error('[AuthService] Refresh error:', error);
            this.redirectToLogin();
            this.refreshQueue.forEach((_, i, arr) => arr[i](null));
            this.refreshQueue = [];
            return null;
        } finally {
            this.isRefreshing = false;
        }
    },

    /**
     * Периодическая проверка токена
     */
    startTokenChecker() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        
        this.tokenCheckInterval = setInterval(() => {
            this.checkToken();
        }, this.TOKEN_CHECK_INTERVAL);
        
        console.log('[AuthService] Token checker started (interval: ' + this.TOKEN_CHECK_INTERVAL / 1000 + 's)');
    },

    /**
     * Отслеживание активности пользователя
     */
    trackActivity() {
        const resetTimer = () => {
            if (this.inactivityTimer) {
                clearTimeout(this.inactivityTimer);
            }
            
            this.inactivityTimer = setTimeout(() => {
                console.log('[AuthService] Inactivity timeout, logging out');
                this.redirectToLogin();
            }, this.INACTIVITY_TIMEOUT);
        };
        
        // События активности
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        // Запускаем таймер
        resetTimer();
        
        console.log('[AuthService] Activity tracker started (timeout: ' + this.INACTIVITY_TIMEOUT / 1000 / 60 + ' min)');
    },

    /**
     * Перехват 401 ошибок
     */
    intercept401() {
        // Сохраняем оригинальный fetch
        const originalFetch = window.fetch;
        const authService = this;
        
        window.fetch = async function(url, options = {}) {
            try {
                let response = await originalFetch(url, options);
                
                if (response.status === 401) {
                    console.log('[AuthService] 401 detected, attempting refresh');
                    
                    // Пытаемся обновить токен
                    const newToken = await authService.refreshToken();
                    
                    if (newToken) {
                        // Повторяем запрос с новым токеном
                        const newOptions = { ...options };
                        if (!newOptions.headers) {
                            newOptions.headers = {};
                        }
                        newOptions.headers['Authorization'] = 'Bearer ' + newToken;
                        
                        console.log('[AuthService] Retrying request with new token');
                        response = await originalFetch(url, newOptions);
                    }
                }
                
                return response;
                
            } catch (error) {
                console.error('[AuthService] Fetch error:', error);
                throw error;
            }
        };
        
        console.log('[AuthService] 401 interceptor installed');
    },

    /**
     * Перенаправление на страницу входа
     */
    redirectToLogin() {
        // Очищаем таймеры
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        // Очищаем localStorage
        localStorage.clear();
        
        // Редирект
        console.log('[AuthService] Redirecting to login page');
        window.location.href = '/index.html';
    },

    /**
     * Получить текущий токен (обновляет если нужно)
     */
    async getToken() {
        const token = localStorage.getItem('token');
        const expiresAt = localStorage.getItem('tokenExpiresAt');
        
        if (!token) {
            return null;
        }
        
        // Если токен скоро истечет (меньше 1 минуты)
        if (expiresAt && Date.now() >= parseInt(expiresAt) - 60000) {
            console.log('[AuthService] Token expiring soon, refreshing');
            await this.refreshToken();
        }
        
        return localStorage.getItem('token');
    }
};

// Авто-инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем только если не на странице логина
    if (!window.location.pathname.includes('index.html') && 
        !window.location.pathname.includes('/login')) {
        AuthService.init();
    }
});
