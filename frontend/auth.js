/** Luminix authentication — token storage, API helpers, sign-in view */

const AUTH_TOKEN_KEY = 'luminix_token';
const AUTH_USER_KEY = 'luminix_user';

window.luminixAuth = {
    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
    },

    getUser() {
        try {
            const raw = localStorage.getItem(AUTH_USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    },

    setSession(token, user, remember = true) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        const store = remember ? localStorage : sessionStorage;
        store.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    },

    clearSession() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    },

    authHeaders() {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    async fetchMe() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const res = await fetch('/v1/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                this.clearSession();
                return null;
            }
            const data = await res.json();
            if (data.user) {
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
            }
            return data.user;
        } catch (_) {
            return null;
        }
    },

    async login(email, password) {
        const res = await fetch('/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        this.setSession(data.access_token, data.user);
        return data.user;
    },

    async register(name, email, password) {
        const res = await fetch('/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        this.setSession(data.access_token, data.user);
        return data.user;
    },

    logout() {
        this.clearSession();
        if (window.stopYoga) window.stopYoga();
        if (window.stopGym) window.stopGym();
        window.renderAuthView?.();
        window.updateUserProfileUI?.();
    },

    handleTokenFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (!token) return false;
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
};

window.renderAuthView = function() {
    const main = document.getElementById('main-content');
    const appShell = document.getElementById('app-shell');
    if (appShell) appShell.classList.add('auth-locked');
    if (!main) return;

    main.innerHTML = `
        <div class="auth-page">
            <div class="auth-card glass-card">
                <div class="auth-brand">
                    <img src="/assets/luminix-logo.svg" alt="Luminix" class="auth-logo">
                    <h2 class="text-3xl font-extrabold text-gradient">Welcome to Luminix</h2>
                    <p class="text-gray-400 text-sm mt-2">Sign in to access your health dashboard</p>
                </div>

                <div class="auth-tabs">
                    <button type="button" id="auth-tab-login" class="auth-tab auth-tab-active" onclick="switchAuthTab('login')">Sign In</button>
                    <button type="button" id="auth-tab-register" class="auth-tab" onclick="switchAuthTab('register')">Register</button>
                </div>

                <form id="auth-form-login" class="auth-form" onsubmit="submitAuthLogin(event)">
                    <label class="auth-label">Email</label>
                    <input type="email" id="auth-email" required placeholder="you@example.com" class="auth-input">
                    <label class="auth-label">Password</label>
                    <input type="password" id="auth-password" required minlength="6" placeholder="••••••••" class="auth-input">
                    <button type="submit" class="btn-primary btn-glow w-full mt-4" id="auth-login-btn">Sign In</button>
                </form>

                <form id="auth-form-register" class="auth-form hidden" onsubmit="submitAuthRegister(event)">
                    <label class="auth-label">Name</label>
                    <input type="text" id="auth-name" placeholder="Your name" class="auth-input">
                    <label class="auth-label">Email</label>
                    <input type="email" id="auth-reg-email" required placeholder="you@example.com" class="auth-input">
                    <label class="auth-label">Password</label>
                    <input type="password" id="auth-reg-password" required minlength="6" placeholder="Min 6 characters" class="auth-input">
                    <button type="submit" class="btn-primary btn-glow w-full mt-4" id="auth-register-btn">Create Account</button>
                </form>

                <p id="auth-status" class="auth-status"></p>

                <div class="auth-divider"><span>or continue with</span></div>

                <div class="auth-oauth-grid">
                    <button type="button" onclick="oauthLogin('google')" class="auth-oauth-btn">
                        <svg viewBox="0 0 24 24" class="auth-oauth-icon" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.7 14.6 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12S6.9 21.4 12 21.4c6.9 0 8.5-4.8 8.5-7.3 0-.5 0-1-.1-1.5H12z"/></svg>
                        Google
                    </button>
                    <button type="button" onclick="oauthLogin('github')" class="auth-oauth-btn">
                        <svg viewBox="0 0 24 24" class="auth-oauth-icon" aria-hidden="true"><path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.178 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.021C22 6.484 17.522 2 12 2z"/></svg>
                        GitHub
                    </button>
                </div>
                <p class="text-xs text-gray-500 text-center mt-4">OAuth uses dev mock mode when provider credentials are not configured.</p>
            </div>
        </div>
    `;
};

window.switchAuthTab = function(tab) {
    document.getElementById('auth-form-login')?.classList.toggle('hidden', tab !== 'login');
    document.getElementById('auth-form-register')?.classList.toggle('hidden', tab !== 'register');
    document.getElementById('auth-tab-login')?.classList.toggle('auth-tab-active', tab === 'login');
    document.getElementById('auth-tab-register')?.classList.toggle('auth-tab-active', tab === 'register');
    const status = document.getElementById('auth-status');
    if (status) status.textContent = '';
};

window.submitAuthLogin = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-login-btn');
    const status = document.getElementById('auth-status');
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    btn.disabled = true;
    status.textContent = 'Signing in…';
    status.className = 'auth-status text-gray-400';
    try {
        await window.luminixAuth.login(email, password);
        status.textContent = 'Success! Redirecting…';
        status.className = 'auth-status text-green-400';
        await window.onAuthSuccess?.();
    } catch (err) {
        status.textContent = err.message || 'Sign in failed';
        status.className = 'auth-status text-red-400';
    } finally {
        btn.disabled = false;
    }
};

window.submitAuthRegister = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-register-btn');
    const status = document.getElementById('auth-status');
    const name = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-reg-email').value.trim();
    const password = document.getElementById('auth-reg-password').value;
    btn.disabled = true;
    status.textContent = 'Creating account…';
    status.className = 'auth-status text-gray-400';
    try {
        await window.luminixAuth.register(name, email, password);
        status.textContent = 'Account created! Redirecting…';
        status.className = 'auth-status text-green-400';
        await window.onAuthSuccess?.();
    } catch (err) {
        status.textContent = err.message || 'Registration failed';
        status.className = 'auth-status text-red-400';
    } finally {
        btn.disabled = false;
    }
};

window.oauthLogin = async function(provider) {
    const status = document.getElementById('auth-status');
    if (status) {
        status.textContent = `Connecting to ${provider}…`;
        status.className = 'auth-status text-gray-400';
    }
    try {
        const health = await fetch('/health').then(r => r.json()).catch(() => ({}));
        const configured = provider === 'google'
            ? health.google_oauth_configured
            : health.github_oauth_configured;
        if (configured) {
            window.location.href = `/v1/auth/${provider}/login`;
            return;
        }
        const res = await fetch(`/v1/auth/${provider}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'OAuth failed');
        window.luminixAuth.setSession(data.access_token, data.user);
        if (status) {
            status.textContent = 'Signed in with dev OAuth!';
            status.className = 'auth-status text-green-400';
        }
        await window.onAuthSuccess?.();
    } catch (err) {
        if (status) {
            status.textContent = err.message || 'OAuth sign-in failed';
            status.className = 'auth-status text-red-400';
        }
    }
};

window.updateUserProfileUI = function() {
    const user = window.luminixAuth.getUser();
    const profileEl = document.getElementById('user-profile');
    const navEl = document.getElementById('sidebar-nav');
    const appShell = document.getElementById('app-shell');
    if (!profileEl) return;

    if (user) {
        profileEl.classList.remove('hidden');
        document.getElementById('profile-name').textContent = user.name || 'User';
        document.getElementById('profile-email').textContent = user.email || '';
        if (navEl) navEl.classList.remove('hidden');
        appShell?.classList.remove('auth-locked');
    } else {
        profileEl.classList.add('hidden');
        if (navEl) navEl.classList.add('hidden');
        appShell?.classList.add('auth-locked');
    }
};

window.onAuthSuccess = async function() {
    await window.luminixAuth.fetchMe();
    window.updateUserProfileUI?.();
    document.getElementById('app-shell')?.classList.remove('auth-locked');
    if (window.nav) window.nav('dashboard');
};

window.requireAuth = function() {
    return window.luminixAuth.isAuthenticated();
};
