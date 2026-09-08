/**
 * Luminix Authentication & Security Manager
 * Handles JWT storage, OAuth 2.0 (Google & GitHub), User Profile Persistence, and Firewall UI.
 */

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
        if (user) {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        }
    },

    clearSession() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    },

    authHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    isAuthenticated() {
        return !!this.getToken() || !!this.getUser();
    },

    async fetchMe() {
        const token = this.getToken();
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/v1/auth/me', {
                credentials: 'include',
                headers
            });
            if (!res.ok) {
                if (res.status === 401) this.clearSession();
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

    async updateProfile(updates) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.authHeaders()
        };
        const res = await fetch('/v1/auth/profile', {
            method: 'PUT',
            credentials: 'include',
            headers,
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Profile update failed');
        if (data.user) {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
            window.updateUserProfileUI?.();
        }
        return data.user;
    },

    async login(email, password) {
        const res = await fetch('/v1/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data.detail || data.error || 'Login failed');
            err.status = res.status;
            err.retryAfter = parseInt(res.headers.get('Retry-After') || data.retry_after || 900, 10);
            throw err;
        }
        this.setSession(data.access_token, data.user);
        return data.user;
    },

    async register(name, email, password) {
        const res = await fetch('/v1/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data.detail || data.error || 'Registration failed');
            err.status = res.status;
            err.retryAfter = parseInt(res.headers.get('Retry-After') || data.retry_after || 900, 10);
            throw err;
        }
        this.setSession(data.access_token, data.user);
        return data.user;
    },

    async forgotPassword(email) {
        const res = await fetch('/v1/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return await res.json();
    },

    async resetPassword(token, newPassword) {
        const res = await fetch('/v1/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Password reset failed');
        return data;
    },

    async changePassword(oldPassword, newPassword) {
        const res = await fetch('/v1/auth/change-password', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...this.authHeaders()
            },
            body: JSON.stringify({ current_password: oldPassword, old_password: oldPassword, new_password: newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Password update failed');
        return data;
    },

    async deleteAccount(password, confirmation) {
        const res = await fetch('/v1/auth/delete-account', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...this.authHeaders()
            },
            body: JSON.stringify({ password, confirmation })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Account deletion failed');
        this.clearSession();
        return data;
    },

    async logout() {
        try {
            await fetch('/v1/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: this.authHeaders()
            });
        } catch (_) {}
        this.clearSession();
        if (window.stopYoga) window.stopYoga();
        if (window.stopGym) window.stopGym();
        window.closeUserProfileModal?.();
        window.updateUserProfileUI?.();
        window.renderAuthView?.();
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

// ── Render Auth View ─────────────────────────────────────────────────────────

window.renderAuthView = async function() {
    const main = document.getElementById('main-content');
    const appShell = document.getElementById('app-shell');
    if (appShell) appShell.classList.add('auth-locked');
    if (!main) return;

    let googleConfigured = false;
    let githubConfigured = false;
    try {
        const health = await fetch('/health').then(r => r.json()).catch(() => ({}));
        googleConfigured = !!health.google_oauth_configured;
        githubConfigured = !!health.github_oauth_configured;
    } catch (_) {}

    main.innerHTML = `
        <div class="auth-page-editorial">
            <div class="auth-card-editorial">
                <!-- Header with Firewall Status & Theme Toggle -->
                <div class="flex items-center justify-between mb-4">
                    <div class="hero-category-tag">SYSTEM // ACCESS GATE</div>
                    <div class="flex items-center gap-2">
                        <button type="button" class="header-action-btn theme-toggle-btn" onclick="window.toggleTheme()" title="Toggle Dark / White Mode" aria-label="Toggle Theme" style="padding: 4px 8px; font-size: 11px;">
                            <span class="theme-icon-sun">☀️</span>
                            <span class="theme-icon-moon hidden">🌙</span>
                        </button>
                        <div class="firewall-shield-badge" title="Luminix WAF, Rate Limiter & Threat Shield Active">
                            <span class="firewall-pulse-dot"></span>
                            <span>FIREWALL ACTIVE</span>
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <h2 class="text-3xl font-display font-bold text-[var(--bone)] tracking-tight">
                        LUMINIX <span class="text-vermilion font-display font-extrabold">INTELLIGENCE.</span>
                    </h2>
                    <p class="text-[var(--bone-dim)] text-xs mt-1">Authenticate to synchronize your biometrics, pose telemetry & workout history.</p>
                </div>

                <!-- Tabs -->
                <div id="auth-tabs-header" class="flex border-b border-[var(--border-subtle)] mb-5">
                    <button type="button" id="auth-tab-login" class="flex-1 py-2 font-mono text-xs uppercase font-bold text-[var(--vermilion)] border-b-2 border-[var(--vermilion)]" onclick="switchAuthTab('login')">Sign In</button>
                    <button type="button" id="auth-tab-register" class="flex-1 py-2 font-mono text-xs uppercase font-medium text-[var(--bone-dim)] hover:text-[var(--bone)]" onclick="switchAuthTab('register')">Register</button>
                </div>

                <!-- Email Login Form -->
                <form id="auth-form-login" class="space-y-4" onsubmit="submitAuthLogin(event)">
                    <div class="form-group-editorial">
                        <label class="form-label-editorial text-[10px]">EMAIL ADDRESS</label>
                        <input type="email" id="auth-email" required placeholder="name@luminix.com" class="form-input-editorial" oninput="this.classList.remove('input-has-error')">
                    </div>
                    <div class="form-group-editorial">
                        <div class="flex justify-between items-center mb-1">
                            <label class="form-label-editorial text-[10px] m-0">PASSWORD</label>
                            <button type="button" onclick="switchAuthTab('forgot')" class="text-[10px] font-mono text-[var(--bone-dim)] hover:text-[var(--vermilion)] underline">Forgot?</button>
                        </div>
                        <div class="password-input-wrap">
                            <input type="password" id="auth-password" required minlength="8" placeholder="••••••••" class="form-input-editorial" oninput="this.classList.remove('input-has-error')">
                            <button type="button" class="pw-toggle-btn" onclick="window.togglePasswordVisibility('auth-password', this)" aria-label="Toggle password visibility" title="Show/Hide password">
                                <svg class="eye-open" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                <svg class="eye-closed hidden" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn-editorial-primary w-full mt-2" id="auth-login-btn">
                        AUTHENTICATE SECURELY →
                    </button>
                </form>

                <!-- Registration Form -->
                <form id="auth-form-register" class="space-y-4 hidden" onsubmit="submitAuthRegister(event)">
                    <div class="form-group-editorial">
                        <label class="form-label-editorial text-[10px]">FULL NAME</label>
                        <input type="text" id="auth-name" placeholder="Alex Morgan" class="form-input-editorial">
                    </div>
                    <div class="form-group-editorial">
                        <label class="form-label-editorial text-[10px]">EMAIL ADDRESS</label>
                        <input type="email" id="auth-reg-email" required placeholder="name@luminix.com" class="form-input-editorial" oninput="this.classList.remove('input-has-error')">
                    </div>
                    <div class="form-group-editorial">
                        <label class="form-label-editorial text-[10px]">CREATE PASSWORD (MIN. 8 CHARS)</label>
                        <div class="password-input-wrap">
                            <input type="password" id="auth-reg-password" required minlength="8" placeholder="Minimum 8 characters" class="form-input-editorial" oninput="this.classList.remove('input-has-error')">
                            <button type="button" class="pw-toggle-btn" onclick="window.togglePasswordVisibility('auth-reg-password', this)" aria-label="Toggle password visibility" title="Show/Hide password">
                                <svg class="eye-open" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                <svg class="eye-closed hidden" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn-editorial-primary w-full mt-2" id="auth-register-btn">
                        CREATE BIOMETRIC PROFILE →
                    </button>
                </form>

                <!-- Forgot Password Form -->
                <form id="auth-form-forgot" class="space-y-4 hidden" onsubmit="submitAuthForgot(event)">
                    <div class="p-3 bg-neutral-900/50 border border-[var(--border-subtle)] rounded text-xs text-[var(--bone-dim)]">
                        Enter your registered email to request a secure password recovery token (valid for 15 minutes).
                    </div>
                    <div class="form-group-editorial">
                        <label class="form-label-editorial text-[10px]">EMAIL ADDRESS</label>
                        <input type="email" id="auth-forgot-email" required placeholder="name@luminix.com" class="form-input-editorial">
                    </div>
                    <button type="submit" class="btn-editorial-primary w-full mt-2" id="auth-forgot-btn">
                        GENERATE RESET TOKEN →
                    </button>
                    <div class="text-center mt-2">
                        <button type="button" onclick="switchAuthTab('login')" class="text-xs font-mono text-[var(--bone-dim)] hover:text-white underline">
                            ← Return to Sign In
                        </button>
                    </div>
                </form>

                <!-- Reset Password Form -->
                <form id="auth-form-reset" class="space-y-4 hidden" onsubmit="submitAuthReset(event)">
                    <div class="p-3 bg-neutral-900/50 border border-[var(--border-subtle)] rounded text-xs text-[var(--bone-dim)]">
                        Enter your one-time reset token and your new secure password (minimum 8 characters).
                    </div>
                    <div class="form-group-editorial">
                        <label class="form-label-editorial text-[10px]">RESET TOKEN</label>
                        <input type="text" id="auth-reset-token" required placeholder="Paste reset token here" class="form-input-editorial">
                    </div>
                    <div class="form-group-editorial">
                        <label class="form-label-editorial text-[10px]">NEW PASSWORD (MIN. 8 CHARS)</label>
                        <div class="password-input-wrap">
                            <input type="password" id="auth-reset-password" required minlength="8" placeholder="••••••••" class="form-input-editorial">
                            <button type="button" class="pw-toggle-btn" onclick="window.togglePasswordVisibility('auth-reset-password', this)" aria-label="Toggle password visibility" title="Show/Hide password">
                                <svg class="eye-open" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                <svg class="eye-closed hidden" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn-editorial-primary w-full mt-2" id="auth-reset-btn">
                        RESET PASSWORD & INVALIDATE OLD SESSIONS →
                    </button>
                    <div class="text-center mt-2">
                        <button type="button" onclick="switchAuthTab('login')" class="text-xs font-mono text-[var(--bone-dim)] hover:text-white underline">
                            ← Return to Sign In
                        </button>
                    </div>
                </form>

                <p id="auth-status" class="font-mono text-xs text-center mt-3 min-h-[1.2rem]"></p>

                <!-- OAuth Section -->
                <div id="auth-oauth-section" class="relative my-5 text-center">
                    <hr class="border-[var(--border-subtle)]">
                    <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--ink-2)] px-3 font-mono text-[9px] text-[var(--bone-dim)] uppercase tracking-wider">
                        OR SINGLE SIGN-ON
                    </span>
                </div>

                <div class="oauth-button-container">
                    <!-- Google Button -->
                    <button type="button" onclick="oauthLogin('google')" class="btn-oauth btn-oauth-google" id="btn-google-oauth">
                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                        <span>Continue with Google</span>
                        <span class="ml-auto font-mono text-[9px] text-blue-400 font-medium">
                            Single Sign-On
                        </span>
                    </button>
                </div>

                <div class="mt-4 pt-3 border-t border-gray-200 text-center space-y-1.5">
                    <p class="font-mono text-[10px] text-editorial-dim">
                        Encrypted with Argon2/Bcrypt + JWT HS256 & WAF Shield.
                    </p>
                    <div class="flex items-center justify-center gap-2 text-[10px] font-mono text-editorial-dim">
                        <a href="/" class="underline hover:text-white">Sanctuary</a>
                        <span>•</span>
                        <a href="/privacy" class="underline hover:text-white">Privacy</a>
                        <span>•</span>
                        <a href="/terms" class="underline hover:text-white">Terms</a>
                        <span>•</span>
                        <a href="/accessibility" class="underline hover:text-white">Accessibility</a>
                    </div>
                    <div class="text-[9px] font-mono text-editorial-dim pt-1 border-t border-gray-800/40">
                        ♿ <strong>ACCESSIBILITY STATEMENT:</strong> Luminix conforms to WCAG 2.1 Level AA. <a href="/accessibility" class="underline hover:text-white">Read Statement &rarr;</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token') || urlParams.get('token_reset');
    if (resetToken) {
        window.switchAuthTab('reset', resetToken);
    }
};

window.switchAuthTab = function(tab, token = '') {
    const isLogin = tab === 'login';
    const isRegister = tab === 'register';
    const isForgot = tab === 'forgot';
    const isReset = tab === 'reset';

    document.getElementById('auth-form-login')?.classList.toggle('hidden', !isLogin);
    document.getElementById('auth-form-register')?.classList.toggle('hidden', !isRegister);
    document.getElementById('auth-form-forgot')?.classList.toggle('hidden', !isForgot);
    document.getElementById('auth-form-reset')?.classList.toggle('hidden', !isReset);

    const tabsHeader = document.getElementById('auth-tabs-header');
    if (tabsHeader) {
        tabsHeader.classList.toggle('hidden', isForgot || isReset);
    }

    document.getElementById('auth-tab-login')?.classList.toggle('text-[var(--vermilion)]', isLogin);
    document.getElementById('auth-tab-login')?.classList.toggle('border-[var(--vermilion)]', isLogin);
    document.getElementById('auth-tab-login')?.classList.toggle('font-bold', isLogin);
    document.getElementById('auth-tab-register')?.classList.toggle('text-[var(--vermilion)]', isRegister);
    document.getElementById('auth-tab-register')?.classList.toggle('border-[var(--vermilion)]', isRegister);
    document.getElementById('auth-tab-register')?.classList.toggle('font-bold', isRegister);

    const oauthSec = document.getElementById('auth-oauth-section');
    const oauthBtns = document.querySelector('.oauth-button-container');
    if (oauthSec) oauthSec.classList.toggle('hidden', isForgot || isReset);
    if (oauthBtns) oauthBtns.classList.toggle('hidden', isForgot || isReset);

    if (token) {
        const tokenInput = document.getElementById('auth-reset-token');
        if (tokenInput) tokenInput.value = token;
    }

    const status = document.getElementById('auth-status');
    if (status) status.textContent = '';
};

window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    const openEye = btn.querySelector('.eye-open');
    const closedEye = btn.querySelector('.eye-closed');
    if (openEye && closedEye) {
        if (isPw) {
            openEye.classList.add('hidden');
            closedEye.classList.remove('hidden');
            btn.setAttribute('aria-label', 'Hide password');
        } else {
            openEye.classList.remove('hidden');
            closedEye.classList.add('hidden');
            btn.setAttribute('aria-label', 'Show password');
        }
    }
};

function startRateLimitCountdown(btn, statusEl, seconds, mode) {
    if (!btn) return;
    let remaining = seconds;
    btn.disabled = true;
    btn.classList.remove('btn-loading');

    const updateUI = () => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
        btn.innerHTML = `🔒 LOCKED (${timeStr})`;
        if (statusEl) {
            statusEl.innerHTML = `<span class="text-red-500 font-mono font-semibold">⚠️ Rate limit reached (max 5 attempts). Locked for ${timeStr}.</span>`;
            statusEl.className = 'font-mono text-xs text-center mt-3';
        }
    };

    updateUI();
    const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.innerHTML = mode === 'login' ? 'ENTER SANCTUARY →' : 'INITIALIZE PROFILE →';
            if (statusEl) {
                statusEl.innerHTML = `<span class="text-emerald-500 font-mono">✓ Cooldown expired. You may retry now.</span>`;
            }
        } else {
            updateUI();
        }
    }, 1000);
}

window.submitAuthLogin = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-login-btn');
    const status = document.getElementById('auth-status');
    const emailInput = document.getElementById('auth-email');
    const pwInput = document.getElementById('auth-password');
    const email = emailInput.value.trim();
    const password = pwInput.value;

    pwInput.classList.remove('input-has-error');
    emailInput.classList.remove('input-has-error');
    btn.disabled = true;
    btn.classList.add('btn-loading');
    const origBtnText = btn.innerHTML;
    btn.innerHTML = `<span class="btn-spinner"></span> VERIFYING CREDENTIALS…`;
    status.textContent = 'Verifying credentials & firewall check…';
    status.className = 'font-mono text-xs text-center mt-3 text-editorial-sub';

    try {
        await window.luminixAuth.login(email, password);
        status.textContent = 'Authenticated! Loading profile…';
        status.className = 'font-mono text-xs text-center mt-3 text-emerald-600 font-semibold';
        window.showSuccess?.('Authentication verified. Welcome to Luminix.');
        await window.onAuthSuccess?.();
    } catch (err) {
        if (err.status === 429 || (err.message && err.message.toLowerCase().includes('rate limit'))) {
            const retrySecs = err.retryAfter || 900;
            startRateLimitCountdown(btn, status, retrySecs, 'login');
            window.showError?.(`Login rate limit exceeded. Cooldown active for ${Math.ceil(retrySecs/60)} minutes.`);
            return;
        }
        status.textContent = err.message || 'Authentication failed';
        status.className = 'font-mono text-xs text-center mt-3 text-red-600 font-semibold';
        pwInput.classList.add('input-has-error');
        window.showError?.(err.message || 'Authentication failed. Please check credentials.');
    } finally {
        if (!btn.disabled || !btn.textContent.includes('LOCKED')) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.innerHTML = origBtnText;
        }
    }
};

window.submitAuthRegister = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-register-btn');
    const status = document.getElementById('auth-status');
    const nameInput = document.getElementById('auth-name');
    const emailInput = document.getElementById('auth-reg-email');
    const pwInput = document.getElementById('auth-reg-password');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = pwInput.value;

    pwInput.classList.remove('input-has-error');
    emailInput.classList.remove('input-has-error');
    btn.disabled = true;
    btn.classList.add('btn-loading');
    const origBtnText = btn.innerHTML;
    btn.innerHTML = `<span class="btn-spinner"></span> INITIALIZING PROFILE…`;
    status.textContent = 'Initializing biometric profile in database…';
    status.className = 'font-mono text-xs text-center mt-3 text-editorial-sub';

    try {
        await window.luminixAuth.register(name, email, password);
        status.textContent = 'Profile created! Synchronizing session…';
        status.className = 'font-mono text-xs text-center mt-3 text-emerald-600 font-semibold';
        window.showSuccess?.('Profile created successfully! Initializing vault.');
        await window.onAuthSuccess?.();
    } catch (err) {
        if (err.status === 429 || (err.message && err.message.toLowerCase().includes('rate limit'))) {
            const retrySecs = err.retryAfter || 900;
            startRateLimitCountdown(btn, status, retrySecs, 'signup');
            window.showError?.(`Registration rate limit exceeded. Cooldown active for ${Math.ceil(retrySecs/60)} minutes.`);
            return;
        }
        status.textContent = err.message || 'Registration failed';
        status.className = 'font-mono text-xs text-center mt-3 text-red-600 font-semibold';
        pwInput.classList.add('input-has-error');
        window.showError?.(err.message || 'Registration failed.');
    } finally {
        if (!btn.disabled || !btn.textContent.includes('LOCKED')) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.innerHTML = origBtnText;
        }
    }
};

window.submitAuthForgot = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-forgot-btn');
    const status = document.getElementById('auth-status');
    const emailInput = document.getElementById('auth-forgot-email');
    const email = emailInput.value.trim();

    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = `<span class="btn-spinner"></span> REQUESTING TOKEN…`;
    status.textContent = 'Processing request securely…';
    status.className = 'font-mono text-xs text-center mt-3 text-editorial-sub';

    try {
        const res = await fetch('/v1/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        status.innerHTML = `<span class="text-emerald-500 font-mono font-semibold">${data.message || 'If an account exists, a password reset link has been dispatched.'}</span>`;
        if (data.dev_reset_token) {
            status.innerHTML += `<div class="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-[10px] text-yellow-300"><strong>Dev Token:</strong> ${data.dev_reset_token} <button type="button" onclick="switchAuthTab('reset', '${data.dev_reset_token}')" class="underline ml-1 text-white font-bold">Use Now &rarr;</button></div>`;
        }
    } catch (err) {
        status.innerHTML = `<span class="text-red-500 font-mono">Unable to process password reset request.</span>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
};

window.submitAuthReset = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-reset-btn');
    const status = document.getElementById('auth-status');
    const tokenInput = document.getElementById('auth-reset-token');
    const pwInput = document.getElementById('auth-reset-password');
    const token = tokenInput.value.trim();
    const newPassword = pwInput.value;

    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = `<span class="btn-spinner"></span> RESETTING PASSWORD…`;
    status.textContent = 'Verifying one-time token…';
    status.className = 'font-mono text-xs text-center mt-3 text-editorial-sub';

    try {
        const res = await fetch('/v1/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Password reset failed');
        status.innerHTML = `<span class="text-emerald-500 font-mono font-semibold">✓ Password updated successfully! Please sign in with your new password.</span>`;
        setTimeout(() => switchAuthTab('login'), 2500);
    } catch (err) {
        status.innerHTML = `<span class="text-red-500 font-mono font-semibold">⚠️ ${err.message || 'Failed to reset password.'}</span>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
};

// Lightweight Theme Handler for Auth Page
window.initTheme = function() {
    const saved = localStorage.getItem('luminix_theme') || 'dark';
    if (saved === 'light') {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
    } else {
        document.documentElement.classList.remove('light-theme');
        document.body.classList.remove('light-theme');
    }
    updateThemeIcons(saved);
};

window.toggleTheme = function() {
    const isLight = document.body.classList.contains('light-theme');
    const nextTheme = isLight ? 'dark' : 'light';
    localStorage.setItem('luminix_theme', nextTheme);
    if (nextTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
    } else {
        document.documentElement.classList.remove('light-theme');
        document.body.classList.remove('light-theme');
    }
    updateThemeIcons(nextTheme);
    window.dispatchEvent(new CustomEvent('luminix_theme_changed', { detail: { theme: nextTheme } }));
};

function updateThemeIcons(theme) {
    document.querySelectorAll('.theme-icon-sun').forEach(el => el.classList.toggle('hidden', theme === 'light'));
    document.querySelectorAll('.theme-icon-moon').forEach(el => el.classList.toggle('hidden', theme !== 'light'));
}

// Auto-run initTheme on script load
try { window.initTheme(); } catch (_) {}

window.oauthLogin = async function(provider) {
    const status = document.getElementById('auth-status');
    const updateStatus = (msg, isErr = false, isSuccess = false) => {
        if (!status) return;
        status.textContent = msg;
        status.className = `font-mono text-xs text-center mt-3 ${
            isErr ? 'text-red-500 font-semibold' : (isSuccess ? 'text-emerald-500 font-semibold' : 'text-editorial-sub')
        }`;
    };

    updateStatus(`Opening real ${provider.toUpperCase()} sign-in window…`);

    try {
        // Priority 1: Real Firebase Authentication Provider (Zero redirect, fetches real account profile)
        if (typeof firebase !== 'undefined' && firebase.auth) {
            // Ensure default Firebase App is initialized
            if (!firebase.apps || firebase.apps.length === 0) {
                if (window.luminixFirebase?.initFirebase) {
                    await window.luminixFirebase.initFirebase();
                }
            }

            if (firebase.apps && firebase.apps.length > 0) {
                let authProvider = null;
                if (provider === 'google') {
                    authProvider = new firebase.auth.GoogleAuthProvider();
                    authProvider.addScope('profile');
                    authProvider.addScope('email');
                    authProvider.setCustomParameters({ prompt: 'select_account' });
                } else if (provider === 'github') {
                    authProvider = new firebase.auth.GithubAuthProvider();
                    authProvider.addScope('read:user');
                    authProvider.addScope('user:email');
                }

                if (authProvider) {
                    updateStatus(`Authenticating with real ${provider.toUpperCase()} account…`);
                    const result = await firebase.auth().signInWithPopup(authProvider);
                    const fbUser = result.user;
                    if (!fbUser || !fbUser.email) {
                        throw new Error(`Could not retrieve verified email from ${provider.toUpperCase()} account.`);
                    }

                    updateStatus(`Retrieved real profile for ${fbUser.displayName || fbUser.email}. Saving account…`);

                let idToken = null;
                try { idToken = await fbUser.getIdToken(); } catch (_) {}

                // Send real account data to backend for SQLite + Firestore synchronization
                const syncRes = await fetch('/v1/auth/oauth-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: provider,
                        provider_id: fbUser.uid || fbUser.providerData?.[0]?.uid || `real-${provider}-${Date.now()}`,
                        email: fbUser.email,
                        name: fbUser.displayName || fbUser.email.split('@')[0],
                        avatar_url: fbUser.photoURL || null,
                        id_token: idToken,
                        profile_data: {
                            email_verified: fbUser.emailVerified,
                            phone_number: fbUser.phoneNumber,
                            auth_time: new Date().toISOString(),
                            provider_id: fbUser.providerId,
                            real_account: true
                        }
                    })
                });

                const syncData = await syncRes.json();
                if (!syncRes.ok) {
                    throw new Error(syncData.detail || `Failed to synchronize real ${provider} profile.`);
                }

                // Persist session & update profile in local state
                window.luminixAuth.setSession(syncData.access_token, syncData.user);
                updateStatus(`Connected: ${syncData.user.name} (${syncData.user.email})`, false, true);

                window.showToast?.(`Welcome ${syncData.user.name}! Real ${provider.toUpperCase()} account connected.`, 'success');

                await window.onAuthSuccess?.();
                return;
            }
        }
    }

        // Priority 2: Standard Backend OAuth 2.0 Consent Screen (if configured in environment)
        const health = await fetch('/health').then(r => r.json()).catch(() => ({}));
        const configured = provider === 'google'
            ? health.google_oauth_configured
            : health.github_oauth_configured;

        if (configured) {
            updateStatus(`Redirecting to official ${provider.toUpperCase()} OAuth consent screen…`);
            window.location.href = `/v1/auth/${provider}/login`;
            return;
        }

        throw new Error(
            `Real ${provider.toUpperCase()} connection requires enabling ${provider.toUpperCase()} in your Firebase Console (Authentication → Sign-in method) or setting ${provider.toUpperCase()}_CLIENT_ID.`
        );

    } catch (err) {
        if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
            updateStatus(`Sign-in window closed.`, true);
        } else if (err.code === 'auth/cancelled-popup-request') {
            updateStatus(`Sign-in request cancelled.`, true);
        } else if (err.code === 'auth/configuration-not-found' || (err.message && err.message.includes('configuration-not-found'))) {
            updateStatus(
                `⚠️ ${provider === 'github' ? 'GitHub' : 'Google'} Sign-In is not enabled yet in Firebase Console. Click 'Setup Firebase' to enable it.`,
                true
            );
            window.showFirebaseSetupModal?.(provider);
        } else if (err.message && (err.message.includes('No Firebase App') || err.message.includes('app-compat/no-app'))) {
            updateStatus(
                `⚠️ Firebase Web App initialization in progress. Please refresh and try again.`,
                true
            );
            window.showFirebaseSetupModal?.(provider);
        } else if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
            if (window.location.hostname === '127.0.0.1') {
                updateStatus(`⚠️ Domain 127.0.0.1 not authorized. Please open http://localhost:8000 or add 127.0.0.1 in Firebase Console.`, true);
            } else {
                updateStatus(`⚠️ Domain ${window.location.hostname} is not authorized in Firebase Console (Authentication → Settings → Authorized Domains).`, true);
            }
        } else {
            updateStatus(err.message || `${provider} sign-in failed`, true);
        }
    }
};

window.showFirebaseSetupModal = function(provider = 'google') {
    let overlay = document.getElementById('firebase-setup-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'firebase-setup-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }

    const providerName = provider === 'github' ? 'GitHub' : 'Google';
    overlay.innerHTML = `
        <div class="modal-box max-w-[500px]" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div class="flex items-center gap-2">
                    <span class="text-amber-400 text-lg">⚠️</span>
                    <h3 class="font-display text-sm uppercase tracking-wider text-[var(--ink-1)]">
                        Enable ${providerName} Sign-In in Firebase
                    </h3>
                </div>
                <button type="button" onclick="document.getElementById('firebase-setup-modal-overlay').classList.add('hidden')" class="text-gray-400 hover:text-white font-mono text-lg font-bold">&times;</button>
            </div>

            <div class="space-y-3 py-3 text-xs text-editorial-sub leading-relaxed font-sans">
                <p>
                    Google Cloud & Firebase require a <strong>one-time activation</strong> before real ${providerName} accounts can log in to project <code class="text-amber-300 font-mono bg-black/40 px-1 py-0.5 rounded">luminix-a0363</code>.
                </p>

                <div class="p-3 bg-white/5 border border-white/10 rounded space-y-2">
                    <div class="font-semibold text-[var(--ink-1)] uppercase font-mono text-[10px] tracking-wider text-amber-300">
                        Quick 3-Step Setup (Takes 30 Seconds):
                    </div>
                    <ol class="list-decimal list-inside space-y-1.5 text-gray-300 text-[11px]">
                        <li>Click the button below to open your <strong>Firebase Authentication Console</strong>.</li>
                        <li>Click the blue <strong>"Get started"</strong> button (if prompted).</li>
                        <li>Under <strong>Sign-in method</strong>, click <strong>${providerName}</strong> &rarr; Toggle <strong>Enable</strong> &rarr; Click <strong>Save</strong>.</li>
                    </ol>
                </div>

                <p class="text-[11px] text-gray-400">
                    Once saved, return here and click <strong>"Continue with ${providerName}"</strong> &mdash; your real account selector will open immediately!
                </p>
            </div>

            <div class="pt-3 border-t border-[var(--border-subtle)] flex gap-3 justify-end">
                <button type="button" onclick="document.getElementById('firebase-setup-modal-overlay').classList.add('hidden')" class="btn-editorial-secondary text-xs py-2 px-3">
                    Close
                </button>
                <a href="https://console.firebase.google.com/project/luminix-a0363/authentication" target="_blank" rel="noopener noreferrer" class="btn-editorial-primary text-xs py-2 px-4 flex items-center gap-1.5 text-center">
                    <span>Open Firebase Console</span>
                    <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
                </a>
            </div>
        </div>
    `;

    overlay.classList.remove('hidden');
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
    };
};

// ── Profile UI & Modal ───────────────────────────────────────────────────────

// ── Profile UI, Biometric Onboarding & Firebase Sync ───────────────────────────

let selectedAvatarFile = null;

window.handleAvatarFileSelect = function(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    selectedAvatarFile = file;

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('onboarding-avatar-preview');
        const placeholder = document.getElementById('onboarding-avatar-placeholder');
        if (preview) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        }
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
};

window.openBiometricOnboardingModal = function() {
    const modal = document.getElementById('biometric-onboarding-modal');
    if (!modal) return;

    const user = window.luminixAuth.getUser();
    const guest = (() => {
        try { return JSON.parse(localStorage.getItem('luminix_guest_profile')); } catch (_) { return null; }
    })();
    const pData = user?.profile_data || guest || {};

    const nameInput = document.getElementById('onboarding-name');
    const ageInput = document.getElementById('onboarding-age');
    const weightInput = document.getElementById('onboarding-weight');
    const heightInput = document.getElementById('onboarding-height');
    const genderSelect = document.getElementById('onboarding-gender');
    const goalSelect = document.getElementById('onboarding-goal');
    const preview = document.getElementById('onboarding-avatar-preview');
    const placeholder = document.getElementById('onboarding-avatar-placeholder');
    const termsCheck = document.getElementById('onboarding-terms-check');
    const termsErr = document.getElementById('onboarding-terms-error');

    if (termsErr) termsErr.classList.add('hidden');
    if (nameInput) nameInput.value = user?.name || guest?.name || '';
    if (ageInput && pData.age) ageInput.value = pData.age;
    if (weightInput && pData.weight) weightInput.value = pData.weight;
    if (heightInput && pData.height) heightInput.value = pData.height;
    if (genderSelect && pData.gender) genderSelect.value = pData.gender;
    if (goalSelect && pData.goal) goalSelect.value = pData.goal;

    const avatarUrl = user?.avatar_url || pData.avatar_url;
    if (avatarUrl && preview && placeholder) {
        preview.src = avatarUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    }

    if (pData.terms_accepted && termsCheck) {
        termsCheck.checked = true;
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
};

window.closeBiometricOnboardingModal = function(userSkipped = false) {
    const modal = document.getElementById('biometric-onboarding-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
    if (userSkipped) {
        sessionStorage.setItem('luminix_onboarding_dismissed', '1');
        window.showToast?.('Biometric setup postponed. Access profile anytime from the top bar.', 'info', 3000);
    }
};

window.handleBiometricOnboardingSubmit = async function(event) {
    event.preventDefault();
    const termsCheck = document.getElementById('onboarding-terms-check');
    const termsErr = document.getElementById('onboarding-terms-error');
    if (!termsCheck || !termsCheck.checked) {
        if (termsErr) termsErr.classList.remove('hidden');
        termsCheck?.parentElement?.classList.add('shake');
        setTimeout(() => termsCheck?.parentElement?.classList.remove('shake'), 600);
        return;
    }

    const submitBtn = document.getElementById('onboarding-submit-btn');
    const origText = submitBtn ? submitBtn.innerHTML : 'SAVE';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span> ENCRYPTING &amp; SYNCING…';
    }

    try {
        const name = document.getElementById('onboarding-name')?.value?.trim() || 'Luminix Member';
        const age = parseInt(document.getElementById('onboarding-age')?.value, 10) || 26;
        const weight = parseFloat(document.getElementById('onboarding-weight')?.value) || 72;
        const height = parseFloat(document.getElementById('onboarding-height')?.value) || 178;
        const gender = document.getElementById('onboarding-gender')?.value || 'unspecified';
        const goal = document.getElementById('onboarding-goal')?.value || 'lean_mass';

        const user = window.luminixAuth?.getUser();
        let uid = user?.id;
        if (!uid) {
            uid = localStorage.getItem('luminix_guest_uid') || ('guest_' + Math.random().toString(36).substring(2, 9));
            localStorage.setItem('luminix_guest_uid', uid);
        }

        let avatarUrl = user?.avatar_url || null;
        if (selectedAvatarFile && window.luminixFirebase) {
            try {
                avatarUrl = await window.luminixFirebase.uploadAvatar(uid, selectedAvatarFile);
            } catch (upErr) {
                console.warn('[Firebase Storage Notice]:', upErr.message);
            }
        } else if (!avatarUrl) {
            const preview = document.getElementById('onboarding-avatar-preview');
            if (preview && preview.src && !preview.classList.contains('hidden') && preview.src.startsWith('data:')) {
                avatarUrl = preview.src;
            }
        }

        const profileData = {
            name,
            age,
            weight,
            height,
            gender,
            goal,
            avatar_url: avatarUrl,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            privacy_covenant: "ZERO_LEAK_AES256_STRICT"
        };

        // 1. Synchronize to Firebase Storage / Firestore & local vault
        if (window.luminixFirebase) {
            await window.luminixFirebase.saveUserProfile(uid, profileData);
        }

        // 2. Synchronize to Backend or local guest store
        if (window.luminixAuth.isAuthenticated()) {
            try {
                await window.luminixAuth.updateProfile({
                    name,
                    avatar_url: avatarUrl,
                    profile_data: profileData
                });
            } catch (backendErr) {
                console.warn('[Profile Backend Notice]:', backendErr.message);
            }
        } else {
            localStorage.setItem('luminix_guest_profile', JSON.stringify(profileData));
        }

        // 3. Update Nutrition Module Profile
        try {
            const nutProfile = {
                age,
                weight,
                height,
                gender,
                activity: 'moderate',
                goal: goal === 'fat_loss' ? 'cut' : (goal === 'lean_mass' ? 'bulk' : 'maintain')
            };
            localStorage.setItem('luminix_nutrition_profile', JSON.stringify(nutProfile));
        } catch (_) {}

        window.updateUserProfileUI();
        window.closeBiometricOnboardingModal();

        // Refresh Wearable Hub if currently displayed
        if (window.currentView === 'connect') {
            window.renderWearableHub?.(document.getElementById('main-content'));
        }

        window.showToast?.(`✓ Biometrics & Avatar synchronized for ${name}. Zero-leak privacy covenant active.`, 'success', 4000);
    } catch (err) {
        console.error('Onboarding submit error:', err);
        window.showToast?.('Error saving profile: ' + err.message, 'error', 4000);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
        }
    }
};

window.updateUserProfileUI = function() {
    const user = window.luminixAuth.getUser();
    const guest = (() => {
        try { return JSON.parse(localStorage.getItem('luminix_guest_profile')); } catch (_) { return null; }
    })();
    const profileEl = document.getElementById('user-profile');
    const navEl = document.getElementById('nav-menu');
    const appShell = document.getElementById('app-shell');

    const activeUser = user || (guest ? {
        name: guest.name || 'Member',
        email: 'firebase.vault@luminix.ai',
        avatar_url: guest.avatar_url,
        provider: 'FIREBASE LOCAL',
        profile_data: guest
    } : null);

    if (activeUser) {
        if (profileEl) {
            profileEl.classList.remove('hidden');
            const initials = (activeUser.name || 'U').substring(0, 2).toUpperCase();
            const avatarHtml = activeUser.avatar_url
                ? `<img src="${activeUser.avatar_url}" alt="User authenticated profile avatar" class="profile-avatar" onerror="this.outerHTML='<div class=\\'profile-avatar\\'>${initials}</div>'">`
                : `<div class="profile-avatar">${initials}</div>`;

            profileEl.innerHTML = `
                <button class="profile-pill" onclick="window.openUserProfileModal()" title="View profile, biometrics & Firebase security">
                    ${avatarHtml}
                    <span id="profile-name" class="font-semibold">${activeUser.name}</span>
                    <span class="profile-provider-badge">${activeUser.provider || 'USER'}</span>
                    <span class="logout-tag">▾</span>
                </button>
            `;
        }
        if (navEl) navEl.classList.remove('hidden');
        if (user) appShell?.classList.remove('auth-locked');
    } else {
        if (profileEl) {
            profileEl.innerHTML = `
                <button class="profile-pill" onclick="window.openBiometricOnboardingModal()" title="Set up personal biometrics & custom avatar">
                    <span class="profile-avatar-ph">👤</span>
                    <span id="profile-name">JOIN SANCTUARY</span>
                    <span class="logout-tag">+</span>
                </button>
            `;
            profileEl.classList.remove('hidden');
        }
    }
};

window.openUserProfileModal = async function() {
    let user = window.luminixAuth.getUser();
    const guest = (() => {
        try { return JSON.parse(localStorage.getItem('luminix_guest_profile')); } catch (_) { return null; }
    })();

    try {
        const freshUser = await window.luminixAuth.fetchMe();
        if (freshUser) user = freshUser;
    } catch (_) {}

    const activeUser = user || (guest ? {
        name: guest.name || 'Luminix Member',
        email: 'local.vault@luminix.ai',
        avatar_url: guest.avatar_url,
        provider: 'FIREBASE VAULT',
        profile_data: guest,
        created_at: guest.terms_accepted_at || new Date().toISOString()
    } : null);

    if (!activeUser) {
        window.openBiometricOnboardingModal();
        return;
    }

    let firewallInfo = { total_threats_blocked: 0, total_requests_inspected: 0, total_rate_limited: 0 };
    try {
        const fwRes = await fetch('/v1/auth/firewall/status', {
            headers: window.luminixAuth.authHeaders()
        });
        if (fwRes.ok) firewallInfo = await fwRes.json();
    } catch (_) {}

    let overlay = document.getElementById('user-profile-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'user-profile-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }

    const pData = activeUser.profile_data || {};
    const initials = (activeUser.name || 'U').substring(0, 2).toUpperCase();
    const avatarHtml = activeUser.avatar_url
        ? `<img src="${activeUser.avatar_url}" alt="User profile photo in biometric vault" class="w-16 h-16 rounded-full object-cover border-2 border-[var(--vermilion)] shadow-[0_0_12px_rgba(224,35,28,0.3)]">`
        : `<div class="w-16 h-16 rounded-full bg-[var(--vermilion)] text-white flex items-center justify-center text-xl font-bold font-display shadow-md">${initials}</div>`;

    const memberSince = activeUser.created_at ? new Date(activeUser.created_at).toLocaleDateString() : 'Active Member';
    const lastActive = activeUser.last_login ? new Date(activeUser.last_login).toLocaleTimeString() : 'Just now';

    overlay.innerHTML = `
        <div class="modal-box max-w-[520px]" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
                <div class="flex items-center gap-2">
                    <span class="hero-category-tag">BIOMETRIC SANCTUARY VAULT</span>
                    <span class="firewall-shield-badge">
                        <span class="firewall-pulse-dot"></span>
                        FIREBASE ENCRYPTED
                    </span>
                </div>
                <button type="button" onclick="closeUserProfileModal()" class="text-gray-400 hover:text-white font-mono text-lg font-bold">&times;</button>
            </div>

            <div class="flex items-center gap-4 my-4">
                ${avatarHtml}
                <div class="flex-1">
                    <h3 class="text-xl font-display font-bold text-[var(--bone)]">${activeUser.name || 'Luminix Member'}</h3>
                    <p class="font-mono text-xs text-[var(--bone-dim)]">${activeUser.email}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="profile-provider-badge text-[10px] px-2 py-0.5 bg-[rgba(224,35,28,0.15)] text-[var(--vermilion)] border border-[rgba(224,35,28,0.3)]">${(activeUser.provider || 'MEMBER').toUpperCase()}</span>
                        <span class="font-mono text-[10px] text-gray-400">VAULT: #${activeUser.id || 'GUEST-LOCAL'}</span>
                    </div>
                </div>
                <button type="button" onclick="closeUserProfileModal(); window.openBiometricOnboardingModal();" class="btn-editorial-secondary text-[10px] py-1 px-2.5">
                    EDIT SPECS ✎
                </button>
            </div>

            <!-- Registered Biometric Telemetry -->
            <div class="grid grid-cols-4 gap-2 mb-4">
                <div class="stat-card p-2 text-center">
                    <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Weight</div>
                    <div class="font-mono text-sm font-bold text-[var(--bone)] mt-0.5">${pData.weight || 72} kg</div>
                </div>
                <div class="stat-card p-2 text-center">
                    <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Age</div>
                    <div class="font-mono text-sm font-bold text-[var(--bone)] mt-0.5">${pData.age || 26} yrs</div>
                </div>
                <div class="stat-card p-2 text-center">
                    <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Height</div>
                    <div class="font-mono text-sm font-bold text-[var(--bone)] mt-0.5">${pData.height || 178} cm</div>
                </div>
                <div class="stat-card p-2 text-center">
                    <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Target Goal</div>
                    <div class="font-mono text-[10px] font-bold text-[var(--vermilion)] mt-1 truncate">${(pData.goal || 'Hypertrophy').replace('_', ' ').toUpperCase()}</div>
                </div>
            </div>

            <!-- Cloud Progress & Biomechanics Sync -->
            <div class="bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] rounded-lg p-3 mb-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-mono text-[10px] uppercase font-bold text-[var(--bone-dim)]">CLOUD WORKOUT PROGRESS</span>
                    <span class="font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        FIRESTORE SYNCED
                    </span>
                </div>
                <div class="grid grid-cols-4 gap-2 text-center mb-2.5">
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                        <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Workouts</div>
                        <div class="font-mono text-sm font-bold text-[var(--bone)] mt-0.5" id="modal-cloud-workouts">0</div>
                    </div>
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                        <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Total Reps</div>
                        <div class="font-mono text-sm font-bold text-[var(--bone)] mt-0.5" id="modal-cloud-reps">0</div>
                    </div>
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                        <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Yoga Holds</div>
                        <div class="font-mono text-sm font-bold text-[var(--bone)] mt-0.5" id="modal-cloud-holds">0</div>
                    </div>
                    <div class="p-2 rounded bg-white/5 border border-white/5">
                        <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">Active Streak</div>
                        <div class="font-mono text-sm font-bold text-amber-400 mt-0.5" id="modal-cloud-streak">🔥 1d</div>
                    </div>
                </div>
                <div class="flex items-center justify-between text-[10px] font-mono text-[var(--bone-dim)] pt-2 border-t border-[var(--border-subtle)]">
                    <span>Cloud Sync: Automatic on every set</span>
                    <button type="button" onclick="window.luminixFirebase?.syncAccountOnLaunch?.()" class="text-[var(--vermilion)] hover:underline font-bold">↻ SYNC NOW</button>
                </div>
            </div>

            <!-- Privacy Covenant & Firebase Status -->
            <div class="bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] rounded-lg p-3 mb-4">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="font-mono text-[10px] uppercase font-bold text-[var(--bone-dim)]">Zero-Leak Privacy Status</span>
                    <span class="font-mono text-[10px] text-emerald-400 font-semibold">&check; Strictly Protected (Cloud Firestore)</span>
                </div>
                <p class="font-mono text-[9.5px] text-[var(--text-dim)] leading-relaxed">
                    Client-side inference active. Biometrics and exercise telemetry are synchronized to your Cloud Firestore account. Zero third-party sharing.
                </p>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="stat-card">
                    <div class="stat-label">MEMBER SINCE</div>
                    <div class="font-mono text-xs font-semibold text-[var(--bone)] mt-1">${memberSince}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">LAST ACTIVE</div>
                    <div class="font-mono text-xs font-semibold text-[var(--bone)] mt-1">${lastActive}</div>
                </div>
            </div>

            ${user ? `
            <!-- Account & Security Controls (DPDP Act & Security Hardening) -->
            <div class="border border-[var(--border-subtle)] rounded-lg p-3 mb-4 bg-[rgba(255,255,255,0.015)]">
                <div class="flex items-center justify-between">
                    <span class="font-mono text-[10px] uppercase font-bold text-[var(--bone-dim)]">Account Security & Privacy</span>
                    <button type="button" onclick="document.getElementById('profile-sec-box')?.classList.toggle('hidden')" class="text-[10px] font-mono text-[var(--vermilion)] underline">Manage ▾</button>
                </div>
                <div id="profile-sec-box" class="hidden space-y-3 pt-2 mt-2 border-t border-[var(--border-subtle)]">
                    <!-- Change Password -->
                    <form onsubmit="window.submitChangePasswordInModal(event)" class="space-y-2">
                        <div class="text-[10px] font-mono font-bold text-[var(--bone)]">CHANGE PASSWORD</div>
                        <input type="password" id="modal-old-pw" placeholder="Current password" required class="form-input-editorial text-xs py-1.5 px-2 w-full">
                        <input type="password" id="modal-new-pw" minlength="8" placeholder="New password (min 8 chars)" required class="form-input-editorial text-xs py-1.5 px-2 w-full">
                        <div class="flex items-center justify-between pt-1">
                            <button type="submit" id="modal-pw-btn" class="btn-editorial-secondary text-[10px] py-1 px-3">Update Password</button>
                            <span id="modal-pw-status" class="text-[10px] font-mono"></span>
                        </div>
                    </form>

                    <!-- Right to Erasure / Account Deletion -->
                    <div class="pt-2 border-t border-[var(--border-subtle)]">
                        <div class="text-[10px] font-mono font-bold text-red-400">DATA PRIVACY: RIGHT TO ERASURE</div>
                        <p class="text-[9px] font-mono text-gray-400 mb-2">Permanently purge your account, biometric telemetry, and credentials from all databases.</p>
                        <button type="button" onclick="window.promptDeleteAccountModal()" class="btn-editorial-secondary text-red-400 border-red-800/60 hover:bg-red-950/40 text-[10px] py-1 px-2.5">
                            Delete Account & Erase All Data
                        </button>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <button type="button" onclick="luminixAuth.logout(); localStorage.removeItem('luminix_guest_profile'); window.updateUserProfileUI(); closeUserProfileModal();" class="btn-editorial-secondary text-red-400 hover:border-red-500 hover:text-red-300 text-xs py-2 px-3">
                    ${user ? 'SIGN OUT' : 'RESET GUEST VAULT'}
                </button>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="closeUserProfileModal(); window.openBiometricOnboardingModal();" class="btn-editorial-secondary text-[var(--vermilion)] border-[rgba(224,35,28,0.4)] hover:border-[var(--vermilion)] text-xs py-2 px-3">
                        ⚡ RE-CONFIGURE
                    </button>
                    <button type="button" onclick="closeUserProfileModal()" class="btn-editorial-primary text-xs py-2 px-5">
                        DONE &rarr;
                    </button>
                </div>
            </div>
        </div>
    `;

    overlay.onclick = (e) => {
        if (e.target === overlay) closeUserProfileModal();
    };

    // Dynamically populate cloud workout progress from Firebase
    if (window.luminixFirebase && typeof window.luminixFirebase.fetchUserProgress === 'function') {
        window.luminixFirebase.fetchUserProgress(activeUser?.id).then(prog => {
            if (!prog) return;
            const wEl = document.getElementById('modal-cloud-workouts');
            const rEl = document.getElementById('modal-cloud-reps');
            const hEl = document.getElementById('modal-cloud-holds');
            const sEl = document.getElementById('modal-cloud-streak');
            if (wEl) wEl.textContent = prog.total_workouts || 0;
            if (rEl) rEl.textContent = prog.total_reps || 0;
            if (hEl) hEl.textContent = prog.total_yoga_holds || 0;
            if (sEl) sEl.textContent = `🔥 ${prog.streak_days || 1}d`;
        }).catch(() => {});
    }

    setTimeout(() => overlay.classList.add('active'), 10);
};

window.closeUserProfileModal = function() {
    const overlay = document.getElementById('user-profile-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
    }
};

window.submitChangePasswordInModal = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('modal-pw-btn');
    const status = document.getElementById('modal-pw-status');
    const oldPw = document.getElementById('modal-old-pw').value;
    const newPw = document.getElementById('modal-new-pw').value;
    btn.disabled = true;
    status.innerHTML = '<span class="text-gray-400">Updating…</span>';
    try {
        await window.luminixAuth.changePassword(oldPw, newPw);
        status.innerHTML = '<span class="text-emerald-400">✓ Updated! Sign in again.</span>';
        setTimeout(() => {
            window.luminixAuth.logout();
        }, 1500);
    } catch (err) {
        status.innerHTML = `<span class="text-red-400">⚠️ ${err.message || 'Update failed'}</span>`;
    } finally {
        btn.disabled = false;
    }
};

window.promptDeleteAccountModal = async function() {
    const pw = prompt("SECURITY VERIFICATION:\nPlease enter your password to confirm permanent account deletion and data erasure:");
    if (!pw) return;
    const conf = prompt('To confirm permanent purge, type "DELETE MY ACCOUNT":');
    if (conf !== "DELETE MY ACCOUNT") {
        alert("Account deletion cancelled: confirmation phrase did not match.");
        return;
    }
    try {
        await window.luminixAuth.deleteAccount(pw, conf);
        alert("Your account and personal biometric records have been permanently erased.");
        closeUserProfileModal();
        window.luminixAuth.logout();
    } catch (err) {
        alert("Deletion failed: " + (err.message || "Unknown error"));
    }
};

// ── Chaos Loading Screen (Cloud Data Transfer Animation) ───────────────────

window.showChaosLoading = function(onComplete) {
    let loader = document.getElementById('chaos-loader-container');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'chaos-loader-container';
        loader.className = 'chaos-loader-overlay';
        loader.innerHTML = `
            <!-- Layer 1: Moving Background (Animated Red Eyes Artwork) -->
            <div class="chaos-bg-wrapper">
                <div class="chaos-bg-image"></div>
                <div class="chaos-bg-scanlines"></div>
                <div class="chaos-bg-vignette"></div>
            </div>

            <!-- Layer 2: Overlay HUD with Animation Above Background -->
            <div class="chaos-hud-overlay">
                <div class="chaos-hud-card">
                    <!-- Terminal Header -->
                    <div class="chaos-terminal-header">
                        <div class="chaos-header-left">
                            <span class="chaos-pulse-indicator"></span>
                            <span>LUMINIX // CLOUD DATA TRANSFER</span>
                        </div>
                        <span class="chaos-status-badge">QUANTUM SYNC</span>
                    </div>

                    <!-- Chaos Graphic Banner with Image 2 -->
                    <div class="chaos-art-banner">
                        <img src="/assets/chaos_loading_overlay.jpg" alt="Chaos Loading" onerror="this.parentElement.style.display='none'">
                    </div>

                    <!-- Chaos Title Typography -->
                    <h2 class="chaos-title-glitch">CHAOS LOADING</h2>

                    <!-- Retro Animated Moving Progress Bar with Cloud Transfer Metrics -->
                    <div class="chaos-progress-wrapper">
                        <div class="chaos-progress-border">
                            <div id="chaos-progress-fill" class="chaos-progress-bar"></div>
                        </div>
                        <div class="flex items-center justify-between mt-1.5 font-mono text-[11px] text-[var(--bone-dim)]">
                            <span id="chaos-progress-bytes">0 KB / 1840 KB</span>
                            <span id="chaos-progress-pct" class="text-[var(--vermilion)] font-bold">0%</span>
                        </div>
                    </div>

                    <div class="chaos-wait-text">
                        PLEASE WAIT<span class="chaos-dots">...</span>
                    </div>

                    <!-- Cloud Data Transfer Telemetry Logs -->
                    <div class="chaos-telemetry-box">
                        <div id="chaos-telemetry-text" class="chaos-telemetry-line">
                            <span class="code">> [01/06]</span> INITIALIZING ENCRYPTED CLOUD HANDSHAKE...
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loader);
    }

    const fill = loader.querySelector('#chaos-progress-fill');
    const tele = loader.querySelector('#chaos-telemetry-text');
    const pctEl = loader.querySelector('#chaos-progress-pct');
    const bytesEl = loader.querySelector('#chaos-progress-bytes');

    if (fill) fill.style.width = '0%';
    if (pctEl) pctEl.textContent = '0%';
    if (bytesEl) bytesEl.textContent = '0 KB / 1840 KB';
    if (tele) tele.innerHTML = '<span class="code">> [01/06]</span> INITIALIZING ENCRYPTED CLOUD HANDSHAKE...';

    // Activate overlay with smooth fade-in
    setTimeout(() => {
        loader.classList.add('active');
    }, 10);

    const startTime = Date.now();
    // Dynamic duration between 5.5s and 9.5s depending on cloud fetching and network latency
    const minDuration = 5500; // Minimum 5.5 seconds
    const maxDuration = 10000; // Maximum 10.0 seconds
    const targetBaseDuration = 6800 + Math.floor(Math.random() * 1800); // 6.8s - 8.6s baseline
    const totalBytes = 1840; // Simulated cloud sync payload size in KB

    let cloudSyncDone = false;
    let cloudUserInfo = null;

    // Execute real cloud data fetching in background
    const cloudSyncPromise = (async () => {
        try {
            cloudUserInfo = await window.luminixAuth?.fetchMe();
        } catch (_) {}
        try {
            await Promise.all([
                fetch('/v1/yoga/poses').catch(() => null),
                fetch('/v1/gym/categories').catch(() => null),
                fetch('/v1/auth/firewall/status').catch(() => null)
            ]);
        } catch (_) {}
        cloudSyncDone = true;
    })();

    const telemetrySteps = [
        { pct: 12, text: '<span class="code">> [01/06]</span> ESTABLISHING QUANTUM CLOUD HANDSHAKE...' },
        { pct: 28, text: '<span class="code">> [02/06]</span> AUTHENTICATING ACCESS TOKEN & FIREWALL PASS...' },
        { pct: 48, text: () => `<span class="code">> [03/06]</span> FETCHING CLOUD USER VAULT: ${cloudUserInfo?.name || 'AUTHENTICATED'}...` },
        { pct: 68, text: '<span class="code">> [04/06]</span> STREAMING POSE ENGINE & GYM WORKOUT CATALOG...' },
        { pct: 86, text: '<span class="code">> [05/06]</span> VERIFYING HEAVENLY RESTRICTION CRYPTO INTEGRITY...' },
        { pct: 95, text: '<span class="code">> [06/06]</span> DECRYPTING LUMINIX RUNTIME INTERFACE & CACHE...' },
        { pct: 100, text: '<span class="code" style="color:#00ff88">> [STATUS: 200 OK]</span> CLOUD DATA TRANSFER COMPLETE. ACCESS GRANTED.' }
    ];

    let currentStepIdx = 0;
    let finished = false;

    const interval = setInterval(() => {
        if (finished) return;
        const elapsed = Date.now() - startTime;

        let currentProgress = 0;

        if (elapsed < targetBaseDuration) {
            // Smooth pacing up to 92% across base duration
            const ratio = elapsed / targetBaseDuration;
            currentProgress = Math.min(92, Math.floor(ratio * 92));
        } else if (!cloudSyncDone && elapsed < maxDuration) {
            // If cloud fetch still pending, hold gently between 92% and 97% up to max 10s
            const overflowRatio = (elapsed - targetBaseDuration) / (maxDuration - targetBaseDuration);
            currentProgress = Math.min(97, 92 + Math.floor(overflowRatio * 5));
        } else {
            // Cloud sync done and minimum time elapsed -> complete to 100%
            currentProgress = 100;
        }

        // Enforce minimum 5.5s before hitting 100%
        if (elapsed < minDuration && currentProgress >= 100) {
            currentProgress = 94;
        }

        // Update progress bar & counters
        if (fill) fill.style.width = `${currentProgress}%`;
        if (pctEl) pctEl.textContent = `${currentProgress}%`;
        if (bytesEl) {
            const currentBytes = Math.floor((currentProgress / 100) * totalBytes);
            bytesEl.textContent = `${currentBytes} KB / ${totalBytes} KB`;
        }

        // Update telemetry log
        while (currentStepIdx < telemetrySteps.length && currentProgress >= telemetrySteps[currentStepIdx].pct) {
            if (tele) {
                const stepText = typeof telemetrySteps[currentStepIdx].text === 'function'
                    ? telemetrySteps[currentStepIdx].text()
                    : telemetrySteps[currentStepIdx].text;
                tele.innerHTML = stepText;
            }
            currentStepIdx++;
        }

        // Finish condition: 100% reached, minimum 5.2s elapsed
        if (currentProgress >= 100 && elapsed >= minDuration) {
            finished = true;
            clearInterval(interval);

            // Hold on 100% for 500ms so user perceives completion
            setTimeout(() => {
                loader.classList.remove('active');
                setTimeout(() => {
                    if (typeof onComplete === 'function') {
                        onComplete();
                    }
                }, 450);
            }, 550);
        }
    }, 60);
};

window.onAuthSuccess = async function() {
    window.showChaosLoading(async () => {
        window.updateUserProfileUI?.();
        document.getElementById('app-shell')?.classList.remove('auth-locked');
        if (window.luminixFirebase && typeof window.luminixFirebase.syncAccountOnLaunch === 'function') {
            window.luminixFirebase.syncAccountOnLaunch();
        }
        if (window.nav) {
            window.nav('dashboard');
        } else {
            window.location.href = '/';
        }
    });
};

window.requireAuth = function() {
    return window.luminixAuth.isAuthenticated();
};

// Automatic Cloud Progress Sync when app loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.luminixAuth?.isAuthenticated() && window.luminixFirebase?.syncAccountOnLaunch) {
                window.luminixFirebase.syncAccountOnLaunch();
            }
        }, 1200);
    });
} else {
    setTimeout(() => {
        if (window.luminixAuth?.isAuthenticated() && window.luminixFirebase?.syncAccountOnLaunch) {
            window.luminixFirebase.syncAccountOnLaunch();
        }
    }, 1200);
}
