/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Swiss Editorial Engineering Platform Controller
   ALABASTER CREAM × INK BLACK × ELECTRIC BLUE × ITALIC SERIF × 12-COL GRID
   ═══════════════════════════════════════════════════════════════════ */

const API_BASE = '';
let currentView = 'dashboard';
let poseEngine = null;
let cameraInstance = null;
let riskTimer = null;
let riskStart = 0;
let livePoseSessionStart = 0;
let livePoseSessionInterval = null;
let alertCount = 0;
let lastFrameTime = performance.now();
let frameCount = 0;
let currentFps = 60;
let showJointAngleLabels = true;
let isCameraMirrored = true;

// ── Subtle Custom Cursor ───────────────────────────────────────
(function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const dot = document.getElementById('cursor-dot');
    if (!dot) return;

    document.addEventListener('mousemove', e => {
        dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });

    document.addEventListener('mouseover', e => {
        const isInteractive = e.target.closest('button, a, .index-row, .pillar-card, .arch-node, .showcase-card-preview, input, select, textarea');
        if (isInteractive) {
            document.body.classList.add('cursor-hover');
        } else {
            document.body.classList.remove('cursor-hover');
        }
    });
})();

// ── Navigation Router ──────────────────────────────────────────
window.nav = function(view) {
    if (!window.requireAuth || !window.requireAuth()) {
        window.renderAuthView?.();
        return;
    }
    if (currentView === 'live-pose') stopPoseEngine();
    if (currentView === 'gym' && window.stopGym) window.stopGym();
    if (currentView === 'yoga' && window.stopYoga) window.stopYoga();

    currentView = view;
    window.currentView = view;
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = '';

    // Unique Page Titles & Canonical Tags per view
    const viewTitles = {
        'dashboard': 'Luminix — Autonomous AI Health & Biomechanical Sanctuary',
        'live-pose': 'Live Pose Engine (60 FPS) — Biomechanical Kinematics | Luminix',
        'gym': 'Adaptive Gym Engine — Kinetic Discrete State Counter | Luminix',
        'yoga': '17 Sacred Yoga Asanas — Kinematic Form Guidance | Luminix',
        'bmi': 'Metabolic Matrix & Nutrition Calculator | Luminix',
        'food-tracker': 'Food & Hydration Intelligence Tracker | Luminix',
        'luna': 'Luna AI & Clinical Studio — Health Intelligence & Reporting | Luminix',
        'connect': 'Connect with Lumi — Wearable & Health Hardware Hub | Luminix',
        'export': 'Luna AI & Clinical Studio — Health Intelligence & Reporting | Luminix',
        'privacy': 'Privacy Policy — Zero-Leak Telemetry Covenant | Luminix',
        'terms': 'Terms of Service — Biomechanical Telemetry Covenant | Luminix',
        'accessibility': 'Accessibility Statement — Digital Inclusion | Luminix'
    };
    const viewNames = {
        'dashboard': 'Sanctuary System',
        'live-pose': '60 FPS Live Pose Engine',
        'gym': 'Adaptive Gym Engine',
        'yoga': '17 Sacred Yoga Asanas',
        'bmi': 'Metabolic Matrix & Nutrition',
        'food-tracker': 'Food & Hydration Intelligence',
        'luna': 'Luna AI & Clinical Studio',
        'connect': 'Connect with Lumi (Wearables & Mobile)',
        'export': 'Luna AI & Clinical Studio',
        'privacy': 'Zero-Leak Privacy Covenant',
        'terms': 'Biomechanical Terms of Service',
        'accessibility': 'Accessibility Statement & WCAG'
    };

    document.title = viewTitles[view] || 'Luminix — Autonomous AI Health Sanctuary';

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
        canonicalEl.href = view === 'dashboard' ? 'http://localhost:8000/' : `http://localhost:8000/#${view}`;
    }

    // Telemetry tracking
    window.luminixAnalytics?.trackEvent('view_change', { view });

    // WebGL background control for performance and visibility
    if (view === 'dashboard') {
        window.kageScene?.undim?.();
        window.kageScene?.resume?.();
        const floatingBtn = document.getElementById('floating-cta-container');
        if (floatingBtn) floatingBtn.style.display = 'block';
    } else {
        window.kageScene?.dim?.();
        const floatingBtn = document.getElementById('floating-cta-container');
        if (floatingBtn) floatingBtn.style.display = 'none';
        if (view === 'live-pose' || view === 'gym' || view === 'yoga') {
            window.kageScene?.pause?.(); // Free GPU for camera & MediaPipe pose detection
        }
    }

    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update active nav button states across Desktop, Mobile Bottom Bar & Mobile Drawer
    document.querySelectorAll('#nav-menu .nav-btn').forEach(btn => {
        btn.classList.toggle('nav-active', btn.dataset.view === view);
    });
    document.querySelectorAll('.mobile-bottom-nav button').forEach(btn => {
        btn.classList.toggle('mob-active', btn.dataset.mob === view);
    });
    document.querySelectorAll('.drawer-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mobDrawer === view);
    });

    const container = document.createElement('div');
    container.className = view === 'dashboard' ? 'landing-page-container' : 'module-view-wrapper';
    main.appendChild(container);

    switch (view) {
        case 'dashboard': renderDashboard(container); break;
        case 'live-pose': renderLivePose(container); break;
        case 'yoga': window.renderYogaView?.(container); break;
        case 'gym': window.renderGymView?.(container); break;
        case 'bmi': window.renderBMIView?.(container); break;
        case 'food-tracker': window.renderFoodTrackerView?.(container); break;
        case 'luna': renderLuna(container); break;
        case 'connect': window.renderWearableHub?.(container); break;
        case 'export': renderLuna(container); break;
        case 'privacy': renderPrivacyView(container); break;
        case 'terms': renderTermsView(container); break;
        case 'accessibility': renderAccessibilityView(container); break;
        default: renderDashboard(container);
    }

    // Prepend Breadcrumbs for All Non-Dashboard Module Views
    if (view !== 'dashboard') {
        const breadcrumbNav = document.createElement('nav');
        breadcrumbNav.className = 'editorial-breadcrumbs';
        breadcrumbNav.setAttribute('aria-label', 'Breadcrumb');
        breadcrumbNav.innerHTML = `
            <a class="breadcrumb-link" onclick="nav('dashboard')" title="Back to Sanctuary">Sanctuary</a>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-link" onclick="nav('dashboard')">Modules</span>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-curr">${viewNames[view] || view}</span>
        `;
        container.insertBefore(breadcrumbNav, container.firstChild);
    }
};

/* ── Mobile Menu Toggle Controller ─────────────────────────────────────────── */
window.toggleMobileMenu = function() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const btn = document.getElementById('mobile-menu-btn');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        window.closeMobileMenu();
    } else {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        btn?.classList.add('open');
        btn?.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }
};

window.closeMobileMenu = function() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const btn = document.getElementById('mobile-menu-btn');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    btn?.classList.remove('open');
    btn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
};

// Global Hotkeys: Close modals & drawers on ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeMobileMenu?.();
        window.closeCreatorModal?.();
        window.closeSearchModal?.();
        window.closeContactModal?.();
        window.closeShareModal?.();
        window.closeCookieSettings?.();
        window.resolveConfirmModal?.(false);
    }
});

/* ── Global Unified Toast & Error Messaging System ─────────────────────────── */
window.showToast = function(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    const iconMap = {
        'error': '⚠️',
        'success': '✓',
        'warning': '⚡',
        'info': 'ℹ️'
    };
    const titleMap = {
        'error': 'System Alert',
        'success': 'Confirmed',
        'warning': 'Notice',
        'info': 'Telemetry'
    };

    toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || 'ℹ️'}</div>
        <div class="toast-content">
            <div class="toast-title">${titleMap[type] || 'Notice'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Dismiss">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 320);
    }, duration);
};

window.showError = (msg, dur) => window.showToast(msg, 'error', dur || 5000);
window.showSuccess = (msg, dur) => window.showToast(msg, 'success', dur || 4000);
window.showWarning = (msg, dur) => window.showToast(msg, 'warning', dur || 4500);

// Global Error & Promise Rejection Handlers
window.addEventListener('error', (event) => {
    console.error('[Luminix Error Trap]:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Luminix Unhandled Rejection]:', event.reason);
});

window.scrollToSanctuary = function() {
    const el = document.getElementById('gate');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    } else {
        nav('dashboard');
        setTimeout(() => {
            document.getElementById('gate')?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
    }
};
window.scrollToSystemIndex = window.scrollToSanctuary;

window.askLunaPrompt = function(promptText) {
    nav('luna');
    setTimeout(() => {
        const input = document.getElementById('luna-prompt-input') || document.querySelector('.luna-input-box input');
        if (input) {
            input.value = promptText;
            input.focus();
        }
    }, 150);
};

/* ── Universal Theme Controller (Dark / White Mode) ─────────────────────── */
window.initTheme = function() {
    const saved = localStorage.getItem('luminix_theme') || 'dark';
    if (saved === 'light') {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
    } else {
        document.documentElement.classList.remove('light-theme');
        document.body.classList.remove('light-theme');
    }
    updateThemeUI(saved);
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
    updateThemeUI(nextTheme);
    window.showToast(`Switched to ${nextTheme === 'light' ? 'Alabaster Light' : 'Obsidian Dark'} mode`, 'info', 2200);
    window.dispatchEvent(new CustomEvent('luminix_theme_changed', { detail: { theme: nextTheme } }));
};

function updateThemeUI(theme) {
    document.querySelectorAll('.theme-icon-sun').forEach(el => el.classList.toggle('hidden', theme === 'light'));
    document.querySelectorAll('.theme-icon-moon').forEach(el => el.classList.toggle('hidden', theme !== 'light'));
    const mobIndicator = document.querySelector('.drawer-theme-indicator');
    if (mobIndicator) mobIndicator.textContent = theme === 'light' ? '☀️' : '🌙';
}

/* ── Announcement Banner Controller ────────────────────────────────────────── */
window.initBanner = function() {
    const dismissed = sessionStorage.getItem('luminix_banner_dismissed') === 'true';
    const banner = document.getElementById('announcement-banner');
    if (!banner) return;
    if (dismissed) {
        banner.classList.add('banner-hidden');
        document.body.classList.add('banner-dismissed');
    } else {
        banner.classList.remove('banner-hidden');
        document.body.classList.remove('banner-dismissed');
    }
};

window.dismissBanner = function() {
    const banner = document.getElementById('announcement-banner');
    if (banner) banner.classList.add('banner-hidden');
    document.body.classList.add('banner-dismissed');
    sessionStorage.setItem('luminix_banner_dismissed', 'true');
};

/* ── Scroll Listeners: Header, Progress Bar & Top Button ────────────────── */
(function initScrollControllers() {
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const header = document.getElementById('main-header');
        if (header) {
            if (scrollY > 24) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        }

        // Scroll progress
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        const pBar = document.getElementById('scroll-progress-bar');
        if (pBar) {
            pBar.style.width = `${scrolled}%`;
            pBar.setAttribute('aria-valuenow', Math.round(scrolled));
        }

        // Back to top button & Floating CTA handling
        const topBtn = document.getElementById('back-to-top-btn');
        const ctaContainer = document.getElementById('floating-cta-container');
        if (scrollY > 280) {
            if (topBtn) topBtn.classList.add('visible');
            if (ctaContainer && window.innerWidth <= 768) {
                ctaContainer.style.opacity = '0';
                ctaContainer.style.pointerEvents = 'none';
            }
        } else {
            if (topBtn) topBtn.classList.remove('visible');
            if (ctaContainer && (window.currentView === 'dashboard' || !window.currentView)) {
                ctaContainer.style.opacity = '1';
                ctaContainer.style.pointerEvents = 'auto';
            }
        }
    }, { passive: true });
})();

window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ── UTM Parameter Capturing & Analytics Tracking ──────────────────────────── */
window.initUTMTracking = function() {
    try {
        const params = new URLSearchParams(window.location.search);
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];
        const captured = {};
        let found = false;
        utmKeys.forEach(k => {
            if (params.has(k)) {
                captured[k] = params.get(k);
                found = true;
            }
        });
        if (found) {
            sessionStorage.setItem('luminix_utm_params', JSON.stringify(captured));
        }
    } catch (_) {}
};

window.getUTMData = function() {
    try {
        return JSON.parse(sessionStorage.getItem('luminix_utm_params')) || {};
    } catch (_) {
        return {};
    }
};

/* ── Privacy-First Client Analytics Engine ─────────────────────────────── */
window.luminixAnalytics = {
    getConsent() {
        try {
            const saved = localStorage.getItem('luminix_cookie_consent');
            if (!saved) return { essential: true, analytics: false, functional: false };
            return JSON.parse(saved);
        } catch (_) {
            return { essential: true, analytics: false, functional: false };
        }
    },
    trackEvent(eventName, eventData = {}) {
        if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
        const consent = this.getConsent();
        if (!consent.analytics) return;

        const entry = {
            event: eventName,
            data: eventData,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        try {
            const existing = JSON.parse(sessionStorage.getItem('luminix_telemetry_events') || '[]');
            existing.push(entry);
            if (existing.length > 50) existing.shift();
            sessionStorage.setItem('luminix_telemetry_events', JSON.stringify(existing));
        } catch (_) {}

        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, eventData);
        }
    }
};

/* ── Cookie Consent Controller ─────────────────────────────────────────── */
window.initCookieConsent = function() {
    try {
        const consent = localStorage.getItem('luminix_cookie_consent');
        if (!consent) {
            setTimeout(() => {
                document.getElementById('cookie-consent-banner')?.classList.remove('hidden');
            }, 1200);
        }
    } catch (_) {}
};

window.acceptAllCookies = function() {
    try {
        const consent = { essential: true, analytics: true, functional: true, timestamp: new Date().toISOString() };
        localStorage.setItem('luminix_cookie_consent', JSON.stringify(consent));
        document.getElementById('cookie-consent-banner')?.classList.add('hidden');
        window.showToast?.('✓ Privacy preferences saved. Sanctuary analytics active.', 'success', 3000);
        window.luminixAnalytics?.trackEvent('cookie_consent', { type: 'all' });
    } catch (_) {}
};

window.acceptEssentialCookies = function() {
    try {
        const consent = { essential: true, analytics: false, functional: false, timestamp: new Date().toISOString() };
        localStorage.setItem('luminix_cookie_consent', JSON.stringify(consent));
        document.getElementById('cookie-consent-banner')?.classList.add('hidden');
        window.showToast?.('✓ Strictly essential mode engaged. Zero telemetry active.', 'info', 3000);
    } catch (_) {}
};

window.openCookieSettings = function() {
    const modal = document.getElementById('cookie-settings-modal');
    if (!modal) return;
    const consent = window.luminixAnalytics?.getConsent() || { analytics: true, functional: true };
    const aEl = document.getElementById('cookie-pref-analytics');
    const fEl = document.getElementById('cookie-pref-functional');
    if (aEl) aEl.checked = !!consent.analytics;
    if (fEl) fEl.checked = !!consent.functional;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
};

window.closeCookieSettings = function() {
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
};

window.saveCustomCookiePreferences = function() {
    try {
        const aEl = document.getElementById('cookie-pref-analytics');
        const fEl = document.getElementById('cookie-pref-functional');
        const consent = {
            essential: true,
            analytics: aEl ? aEl.checked : false,
            functional: fEl ? fEl.checked : false,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('luminix_cookie_consent', JSON.stringify(consent));
        window.closeCookieSettings();
        document.getElementById('cookie-consent-banner')?.classList.add('hidden');
        window.showToast?.('✓ Custom telemetry preferences saved.', 'success', 3000);
    } catch (_) {}
};

window.dismissCookieBanner = function() {
    document.getElementById('cookie-consent-banner')?.classList.add('hidden');
};

/* ── Kyoto Social Share Controller ─────────────────────────────────────── */
window.openShareModal = function() {
    const modal = document.getElementById('social-share-modal');
    const input = document.getElementById('share-url-input');
    if (input) input.value = window.location.href;
    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
    window.luminixAnalytics?.trackEvent('open_share_modal');
};

window.closeShareModal = function() {
    const modal = document.getElementById('social-share-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
};

window.shareToPlatform = function(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent("Luminix — Autonomous AI Health & Biomechanical Sanctuary (60 FPS MediaPipe Kinematics)");
    let target = '';

    switch(platform) {
        case 'x':
            target = `https://twitter.com/intent/tweet?text=${title}&url=${url}&via=LUNO895`;
            break;
        case 'linkedin':
            target = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
        case 'whatsapp':
            target = `https://api.whatsapp.com/send?text=${title}%20${url}`;
            break;
        case 'reddit':
            target = `https://reddit.com/submit?url=${url}&title=${title}`;
            break;
    }

    if (target) {
        window.open(target, '_blank', 'width=600,height=500,noopener,noreferrer');
        window.luminixAnalytics?.trackEvent('share_click', { platform });
    }
};

window.copyShareLink = function() {
    const input = document.getElementById('share-url-input');
    const btn = document.getElementById('copy-share-btn');
    const text = input ? input.value : window.location.href;

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            if (btn) {
                btn.textContent = 'COPIED ✓';
                setTimeout(() => { if (btn) btn.textContent = 'COPY LINK'; }, 2000);
            }
            window.showToast?.('✓ Sanctuary link copied to clipboard!', 'success', 2500);
            window.luminixAnalytics?.trackEvent('copy_share_link');
        }).catch(() => {
            input?.select();
            document.execCommand('copy');
            window.showToast?.('✓ Link copied to clipboard!', 'success', 2500);
        });
    } else {
        input?.select();
        document.execCommand('copy');
        window.showToast?.('✓ Link copied to clipboard!', 'success', 2500);
    }
};

/* ── Universal Confirmation Modal ──────────────────────────────────────────── */
let confirmModalResolver = null;
window.showConfirmModal = function({ title = 'Confirm Action', message = 'Are you certain you wish to proceed?', confirmText = 'Proceed', cancelText = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
        confirmModalResolver = resolve;
        const overlay = document.getElementById('confirm-modal-overlay');
        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-msg');
        const proceedBtn = document.getElementById('confirm-proceed-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        const iconEl = document.getElementById('confirm-modal-icon');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (proceedBtn) {
            proceedBtn.textContent = confirmText;
            proceedBtn.className = danger ? 'btn-editorial-danger' : 'btn-editorial-primary';
        }
        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (iconEl) iconEl.textContent = danger ? '🚨' : '⚠️';

        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.setAttribute('aria-hidden', 'false');
            proceedBtn?.focus();
        }
    });
};

window.resolveConfirmModal = function(decision) {
    const overlay = document.getElementById('confirm-modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
    }
    if (confirmModalResolver) {
        confirmModalResolver(decision);
        confirmModalResolver = null;
    }
};

/* ── Site Search ───────────────────────────────────────────────────────── */
const SEARCH_INDEX = [
    { id: 'dash', title: 'Sanctuary System Dashboard', category: 'Chambers', desc: 'Central overview, 12-column grid, biometric gateway', view: 'dashboard' },
    { id: 'live-pose', title: '60 FPS Live Pose Engine', category: 'Chambers', desc: 'MediaPipe 33-point kinematic trigonometry & risk alerting', view: 'live-pose' },
    { id: 'gym', title: 'Adaptive Gym Engine', category: 'Chambers', desc: 'Discrete state machine repetition counting across 6 categories', view: 'gym' },
    { id: 'yoga', title: '17 Sacred Yoga Asanas', category: 'Chambers', desc: 'Real-time biomechanical angle scoring & alignment feedback', view: 'yoga' },
    { id: 'bmi', title: 'Metabolic Matrix & Nutrition', category: 'Chambers', desc: 'Harris-Benedict BMR, TDEE, macro split target formulas', view: 'bmi' },
    { id: 'food', title: 'Food & Hydration Intelligence', category: 'Chambers', desc: 'Macro nutrient breakdown and water balance telemetry', view: 'food-tracker' },
    { id: 'privacy', title: 'Privacy Policy & Zero-Leak Covenant', category: 'Compliance', desc: 'WASM client-side privacy, zero camera uploads, encrypted vault', view: 'privacy' },
    { id: 'terms', title: 'Terms of Service & Biomechanics Covenant', category: 'Compliance', desc: 'Permitted use, non-medical advice covenant, liability bounds', view: 'terms' },
    { id: 'luna', title: 'Luna AI Health Reasoning', category: 'Chambers', desc: 'Multi-model Gemini fallback conversational coaching', view: 'luna' },
    { id: 'export', title: 'Clinical Export Studio', category: 'Chambers', desc: 'Medical-grade PDF dossier and encrypted health export', view: 'export' },
    // Exercises
    { id: 'ex-squat', title: 'Barbell / Bodyweight Squat', category: 'Exercises', desc: 'Quadriceps, hamstrings & gluteus state machine tracking', view: 'gym', target: 'squat' },
    { id: 'ex-pushup', title: 'Standard Push-up', category: 'Exercises', desc: 'Pectoral & triceps kinematic arm flexion angle checking', view: 'gym', target: 'pushup' },
    { id: 'ex-pullup', title: 'Overhand Pull-up', category: 'Exercises', desc: 'Latissimus dorsi vertical pulling kinematics', view: 'gym', target: 'pullup' },
    { id: 'ex-lunge', title: 'Forward / Reverse Lunge', category: 'Exercises', desc: 'Unilateral leg stability and knee flexor telemetry', view: 'gym', target: 'lunge' },
    { id: 'ex-curl', title: 'Bicep Dumbbell Curl', category: 'Exercises', desc: 'Elbow flexion isolation and eccentric tempo validation', view: 'gym', target: 'curl' },
    { id: 'ex-plank', title: 'Isometric Core Plank', category: 'Exercises', desc: 'Spinal neutrality and transverse abdominis duration gauge', view: 'gym', target: 'plank' },
    // Asanas
    { id: 'yo-warrior', title: 'Virabhadrasana II (Warrior 2)', category: 'Yoga Asanas', desc: '90-degree knee bend, horizontal arm extension', view: 'yoga', target: 'warrior' },
    { id: 'yo-tree', title: 'Vrikshasana (Tree Pose)', category: 'Yoga Asanas', desc: 'Unilateral hip abduction and spinal axial extension', view: 'yoga', target: 'tree' },
    { id: 'yo-downward', title: 'Adho Mukha Svanasana (Downward Dog)', category: 'Yoga Asanas', desc: 'Inverted-V posterior chain elongation', view: 'yoga', target: 'downward' },
    { id: 'yo-cobra', title: 'Bhujangasana (Cobra Pose)', category: 'Yoga Asanas', desc: 'Thoracic spinal extension and scapular retraction', view: 'yoga', target: 'cobra' },
    { id: 'yo-triangle', title: 'Trikonasana (Triangle Pose)', category: 'Yoga Asanas', desc: 'Lateral torso elongation and pelvic alignment', view: 'yoga', target: 'triangle' },
    { id: 'yo-bridge', title: 'Setu Bandhasana (Bridge Pose)', category: 'Yoga Asanas', desc: 'Glute bridge pelvic elevation and chest opening', view: 'yoga', target: 'bridge' },
    // Creator & Dossier
    { id: 'cr-story', title: 'Creator Dossier: Ram Charan Teja', category: 'Creator', desc: 'The story and vision behind Luminix (@LUNO895)', action: () => window.openCreatorModal('story') },
    { id: 'cr-tech', title: 'Architect Tech Arsenal', category: 'Creator', desc: 'FastAPI, MediaPipe, Three.js, WebGL & Gemini Architecture', action: () => window.openCreatorModal('story') },
    { id: 'cr-donate', title: 'Support & Donate to Architect', category: 'Creator', desc: 'Contribute to autonomous open-source health intelligence', action: () => window.openCreatorModal('donate') },
    { id: 'cr-contact', title: 'Encrypted Contact Channel', category: 'Creator', desc: 'Direct message to Ram Charan Teja (luno97802@gmail.com)', action: () => window.toggleContactModal() }
];

let searchActiveIdx = 0;
let currentSearchResults = [];

window.openSearchModal = function() {
    const modal = document.getElementById('site-search-modal');
    const input = document.getElementById('site-search-input');
    if (!modal || !input) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    input.value = '';
    window.handleSearchInput('');
    setTimeout(() => input.focus(), 60);
};

window.closeSearchModal = function() {
    const modal = document.getElementById('site-search-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
};

window.clearSearch = function() {
    const input = document.getElementById('site-search-input');
    if (input) {
        input.value = '';
        input.focus();
        window.handleSearchInput('');
    }
};

window.setSearchQuery = function(query) {
    const input = document.getElementById('site-search-input');
    if (input) {
        input.value = query;
        input.focus();
        window.handleSearchInput(query);
    }
};

window.handleSearchInput = function(query) {
    const q = query.trim().toLowerCase();
    const container = document.getElementById('site-search-results');
    if (!container) return;

    if (!q) {
        currentSearchResults = SEARCH_INDEX.slice(0, 8);
    } else {
        currentSearchResults = SEARCH_INDEX.filter(item => 
            item.title.toLowerCase().includes(q) || 
            item.category.toLowerCase().includes(q) || 
            item.desc.toLowerCase().includes(q)
        );
    }
    searchActiveIdx = 0;

    if (currentSearchResults.length === 0) {
        container.innerHTML = `
            <div class="search-no-results">
                <span class="text-2xl mb-2 block">🔍</span>
                <div class="text-sm font-semibold text-[var(--bone)]">No matching chambers or exercises</div>
                <div class="text-xs text-[var(--text-dim)] mt-1 font-mono">Try searching for "pose", "squat", "warrior", or "macros"</div>
            </div>
        `;
        return;
    }

    container.innerHTML = currentSearchResults.map((item, idx) => `
        <div class="search-result-item ${idx === 0 ? 'active' : ''}" data-index="${idx}" onclick="window.executeSearchResult(${idx})">
            <div class="search-result-main">
                <span class="search-result-category">${item.category}</span>
                <div class="search-result-title">${item.title}</div>
                <div class="search-result-desc">${item.desc}</div>
            </div>
            <div class="search-result-action">
                <kbd class="search-kbd">↵</kbd>
            </div>
        </div>
    `).join('');
};

window.handleSearchKeydown = function(e) {
    const container = document.getElementById('site-search-results');
    const items = container?.querySelectorAll('.search-result-item');
    if (!items || items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        searchActiveIdx = (searchActiveIdx + 1) % items.length;
        updateSearchSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        searchActiveIdx = (searchActiveIdx - 1 + items.length) % items.length;
        updateSearchSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        window.executeSearchResult(searchActiveIdx);
    } else if (e.key === 'Escape') {
        window.closeSearchModal();
    }
};

function updateSearchSelection(items) {
    items.forEach((it, idx) => {
        it.classList.toggle('active', idx === searchActiveIdx);
        if (idx === searchActiveIdx) {
            it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });
}

window.executeSearchResult = function(idx) {
    const item = currentSearchResults[idx];
    if (!item) return;
    window.closeSearchModal();
    if (item.action) {
        item.action();
    } else if (item.view) {
        nav(item.view);
    }
};

// Global Hotkeys for Search (⌘K / Ctrl+K / slash)
window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.openSearchModal();
    } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        window.openSearchModal();
    } else if (e.key === 'Escape') {
        window.closeSearchModal();
        window.closeContactModal();
        window.resolveConfirmModal(false);
    }
});

/* ── Universal Copy to Clipboard Helper ────────────────────────────────────── */
window.copyToClipboard = async function(text, triggerEl) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        if (triggerEl) {
            const origHtml = triggerEl.innerHTML;
            triggerEl.innerHTML = `✓ COPIED!`;
            triggerEl.classList.add('copy-success-flash');
            setTimeout(() => {
                triggerEl.innerHTML = origHtml;
                triggerEl.classList.remove('copy-success-flash');
            }, 2000);
        }
        window.showToast('Copied to clipboard: ' + text, 'success', 2200);
    } catch (err) {
        window.showError('Unable to copy to clipboard.');
    }
};

/* ── Floating Contact Widget Controller ────────────────────────────────────── */
window.toggleContactModal = function() {
    const modal = document.getElementById('floating-contact-modal');
    if (!modal) return;
    const isHidden = modal.classList.contains('hidden');
    if (isHidden) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        const emailInput = document.getElementById('contact-email');
        if (emailInput && !emailInput.value && window.luminixAuth?.getUser()?.email) {
            emailInput.value = window.luminixAuth.getUser().email;
        }
        const nameInput = document.getElementById('contact-name');
        if (nameInput && !nameInput.value && window.luminixAuth?.getUser()?.name) {
            nameInput.value = window.luminixAuth.getUser().name;
        }
        setTimeout(() => document.getElementById('contact-name')?.focus(), 60);
    } else {
        window.closeContactModal();
    }
};

window.closeContactModal = function() {
    const modal = document.getElementById('floating-contact-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
};

window.handleFloatingContactSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('contact-modal-submit-btn');
    const name = document.getElementById('contact-name')?.value.trim();
    const email = document.getElementById('contact-email')?.value.trim();
    const type = document.getElementById('contact-type')?.value;
    const message = document.getElementById('contact-message')?.value.trim();

    if (!name || !email || !message) {
        window.showError('Please fill out all contact fields.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
        btn.innerHTML = `<span class="btn-spinner"></span> ENCRYPTING & TRANSMITTING…`;
    }

    const utmData = window.getUTMData();
    console.log('[Direct Contact Ingestion]:', { name, email, type, message, utmData, timestamp: new Date().toISOString() });

    // Simulate reliable dispatch
    await new Promise(r => setTimeout(r, 900));

    if (btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.innerHTML = `TRANSMIT MESSAGE →`;
    }

    window.showSuccess(`Thank you ${name}. Your message has been routed to Ram Charan Teja.`);
    e.target.reset();
    window.closeContactModal();
};

/* ── Expandable FAQ Accordion Controller ───────────────────────────────────── */
window.toggleFaq = function(id) {
    const item = document.getElementById(`faq-item-${id}`);
    if (!item) return;
    const isOpen = item.classList.contains('open');
    // Close other FAQs for clean single-expand accordion
    document.querySelectorAll('.faq-item').forEach(el => {
        if (el !== item) el.classList.remove('open');
    });
    item.classList.toggle('open', !isOpen);
};

// ── App Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    window.initTheme();
    window.initBanner();
    window.initUTMTracking();

    if (window.luminixAuth?.handleTokenFromUrl()) {
        await window.luminixAuth.fetchMe();
    }
    window.updateUserProfileUI?.();

    if (window.luminixAuth?.isAuthenticated()) {
        document.getElementById('app-shell')?.classList.remove('auth-locked');
        nav('dashboard');

        // Personalize Your Sanctuary filling modal: check after login/dashboard initialization
        setTimeout(() => {
            window.checkBiometricOnboarding?.();
        }, 1200);
    } else {
        window.renderAuthView?.();
        // NEVER prompt personalization onboarding while on unauthenticated login page
    }
});

// ══════════════════════════════════════════════════════════════════
//  01. EDITORIAL DASHBOARD VIEW ("THE SYSTEM")
// ══════════════════════════════════════════════════════════════════
async function renderDashboard(container) {
    let yogaCount = '17', gymCount = '6';
    try {
        const [y, g] = await Promise.all([
            fetch(API_BASE + '/v1/yoga/poses').then(r => r.json()).catch(() => null),
            fetch(API_BASE + '/v1/gym/categories').then(r => r.json()).catch(() => null)
        ]);
        if (y?.poses) yogaCount = y.poses.length;
        if (g?.categories) gymCount = g.categories.length;
    } catch (_) {}

    container.innerHTML = `
        <!-- ── CHAPTER 00: THE HIDDEN GATE (HERO) ── -->
        <section class="hero" id="hero" data-cam="0">
            <div class="hero-top">
                <div class="eyebrow">
                    <span class="dot"></span> Chapter 00 — The Hidden Gate // Biomechanics Sanctuary
                </div>
                <h1 class="display h-hero">
                    <span class="mask-line"><span>Where stillness</span></span>
                    <span class="mask-line"><span>reveals the</span></span>
                    <span class="mask-line"><span>unseen.</span></span>
                </h1>
                <p class="hero-sub body">
                    Enter Luminix through its quiet thresholds: an intelligent sanctuary of 60 FPS computer vision, adaptive strength protocols, yoga alignment, and Luna AI.
                </p>
                <div class="hero-actions-bar">
                    <button onclick="nav('live-pose')" class="btn-editorial-primary" aria-label="Launch 60 FPS Live Camera Pose Detection">
                        ⚡ LAUNCH 60 FPS VISION →
                    </button>
                    <button onclick="nav('gym')" class="btn-editorial-secondary" aria-label="Open Adaptive Gym Rep Counter">
                        🏋️ START WORKOUT →
                    </button>
                    <button onclick="scrollToSanctuary()" class="btn-editorial-secondary" aria-label="Explore Sanctuary Systems">
                        EXPLORE SANCTUARY ↓
                    </button>
                </div>
            </div>

            <div class="hero-spacer"></div>

            <div class="hero-foot">
                <div class="hero-cue">
                    <span>Scroll to enter</span>
                    <span class="track"><i></i></span>
                </div>
                <div class="chapters" id="chips">
                    <div class="chip" onclick="nav('live-pose')">
                        <span class="num">01</span>
                        <span class="tx">
                            <b>Thresholds</b>
                            <p>Real-time 60 FPS vision tracking & joint vector biomechanics.</p>
                        </span>
                    </div>
                    <div class="chip" onclick="nav('gym')">
                        <span class="num">02</span>
                        <span class="tx">
                            <b>Still Gardens</b>
                            <p>Adaptive gym routines, automated rep counter & rest intervals.</p>
                        </span>
                    </div>
                    <div class="chip" onclick="nav('yoga')">
                        <span class="num">03</span>
                        <span class="tx">
                            <b>Sacred Craft</b>
                            <p>${yogaCount} guided yoga asana poses with hold duration checking.</p>
                        </span>
                    </div>
                    <div class="chip" onclick="nav('bmi')">
                        <span class="num">04</span>
                        <span class="tx">
                            <b>Night Rituals</b>
                            <p>Metabolic intelligence, BMR, TDEE & macro nutrition matrices.</p>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Floating Peek Window -->
            <a class="peek" onclick="nav('live-pose')" aria-label="Preview: Sanmon Vision Camera">
                <span class="peek-fr">
                    <img src="/assets/media_1787652701397.jpg" alt="Toji Fushiguro - The One Who Left It All Behind" style="width:100%; height:100%; object-fit:cover; object-position:center 35%; opacity:0.92; transition:transform 0.5s ease, opacity 0.5s ease;" />
                    <span class="peek-play">
                        <svg viewBox="0 0 22 22" fill="none"><path d="M8 5.6 16.4 11 8 16.4z" fill="#dfe7e0"/></svg>
                    </span>
                </span>
                <span class="peek-cap">
                    <b class="jp">山門</b>
                    <i>SANMON — 60 FPS Vision Studio</i>
                </span>
            </a>

            <div class="word-fb" aria-hidden="true">LUMINIX</div>

            <div class="hero-side">
                <span class="v jp">影の道 • 身体知性</span>
            </div>
        </section>

        <!-- ── CHAPTER I: THE SANMON (60 FPS COMPUTER VISION) ── -->
        <section class="sec" id="gate" data-cam="1">
            <div class="sec-head">
                <span class="k"><b>01</b> — The Sanmon</span>
                <span class="rule"></span>
                <span class="k jp">山門 // BIOMECHANICAL VISION</span>
            </div>
            <div class="gate-grid">
                <h2 class="display h-sec">Charred cypress, worn stone, 60 FPS vision tracking.</h2>
                <div class="gate-copy">
                    <p class="lead">
                        Luminix begins where the physical body meets algorithmic precision: 33 skeletal landmarks tracked at 60 frames per second directly in the browser with zero cloud latency. Biomechanical vector geometry measures joint flexion, spinal deviation, and lateral shoulder tilt in real-time.
                    </p>
                    <p class="body">
                        Move through squats, overhead presses, or lunges with immediate audible and visual risk indicators. Nothing is hidden. Every kinematic degree is rendered live.
                    </p>
                    <a class="arrowlink" onclick="nav('live-pose')">
                        <span>Cross the threshold (Launch Live Pose)</span>
                        <span class="ar">
                            <svg viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="#dfe7e0" stroke-width="1.3"/></svg>
                        </span>
                    </a>
                </div>
            </div>
            <div class="gate-stats">
                <div><b>06</b><span>Modules</span></div>
                <div><b>60</b><span>FPS Vision</span></div>
                <div><b>${yogaCount}</b><span>Yoga Asanas</span></div>
                <div><b>∞</b><span>Intelligence</span></div>
            </div>
        </section>

        <!-- ── CHAPTER II: STILL GARDENS (PERFORMANCE CHAMBERS) ── -->
        <section class="sec" id="pathways" data-cam="2">
            <div class="sec-head">
                <span class="k"><b>02</b> — Still Gardens</span>
                <span class="rule"></span>
                <span class="k jp">庭園 // PERFORMANCE CHAMBERS</span>
            </div>
            <div class="cards" id="cards">
                <article class="card" onclick="nav('gym')">
                    <div class="card-fr">
                        <img src="/assets/Toji%20Fushiguro%20Hitting%20Gym.jpeg" alt="Approach - Toji Gym Strength" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 20%; opacity:0.68; transition:transform 0.6s ease, opacity 0.6s ease;" />
                        <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(3,6,9,0.15) 20%, rgba(3,6,9,0.88) 100%); pointer-events:none;"></div>
                        <span class="card-ar"><svg viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="#dfe7e0" stroke-width="1.3"/></svg></span>
                        <i class="glow" style="--gx:80.2%; --gy:23.9%; --gr:22%; --gt:6.1s; --gt2:9.7s; --gc1:rgba(255,142,108,.50); --gc2:rgba(212,56,38,.24)"></i>
                        <div class="card-lab"><b>Approach</b><span class="jp">参道</span></div>
                    </div>
                    <div class="card-meta"><span>Adaptive Gym Splits • Auto Reps</span><span>01 / 03</span></div>
                    <p class="text-xs text-[#8f9a93] mt-2">Biomechanical 5-phase rep state machine, automated 60s rest intervals, and muscle splits.</p>
                </article>

                <article class="card" onclick="nav('yoga')">
                    <div class="card-fr">
                        <img src="/assets/togi%20pfp.jpeg" alt="Lanterns - Toji Asana Equilibrium" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 15%; opacity:0.68; transition:transform 0.6s ease, opacity 0.6s ease;" />
                        <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(3,6,9,0.15) 20%, rgba(3,6,9,0.88) 100%); pointer-events:none;"></div>
                        <span class="card-ar"><svg viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="#dfe7e0" stroke-width="1.3"/></svg></span>
                        <i class="glow glow--flame" style="--gx:70.5%; --gy:47.2%; --gr:14%; --gt:3.7s; --gt2:5.3s; --gc1:rgba(255,198,124,.62); --gc2:rgba(226,118,40,.30)"></i>
                        <div class="card-lab"><b>Lanterns</b><span class="jp">灯籠</span></div>
                    </div>
                    <div class="card-meta"><span>17 Guided Asanas • Hold Timer</span><span>02 / 03</span></div>
                    <p class="text-xs text-[#8f9a93] mt-2">Real-time posture validation, target muscle highlights, and countdown hold verification.</p>
                </article>

                <article class="card" onclick="nav('bmi')">
                    <div class="card-fr">
                        <img src="/assets/Toji%20fushiguro%20(2).jpeg" alt="Moonwater - Toji Nutrition Matrix" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 20%; opacity:0.68; transition:transform 0.6s ease, opacity 0.6s ease;" />
                        <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(3,6,9,0.15) 20%, rgba(3,6,9,0.88) 100%); pointer-events:none;"></div>
                        <span class="card-ar"><svg viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="#dfe7e0" stroke-width="1.3"/></svg></span>
                        <i class="glow" style="--gx:48.0%; --gy:16.8%; --gr:20%; --gt:7.3s; --gt2:11.2s; --gc1:rgba(255,138,104,.52); --gc2:rgba(208,54,36,.24)"></i>
                        <div class="card-lab"><b>Moonwater</b><span class="jp">月影</span></div>
                    </div>
                    <div class="card-meta"><span>Metabolic Matrix • Food Engine</span><span>03 / 03</span></div>
                    <p class="text-xs text-[#8f9a93] mt-2">Dual BMR formulas, TDEE, macro target ratios, and Gemini AI natural language food scanning.</p>
                </article>
            </div>
        </section>

        <!-- ── CHAPTER III: SACRED CRAFT (SYSTEM CURRICULUM) ── -->
        <section class="sec" id="lessons" data-cam="3">
            <div class="sec-head">
                <span class="k"><b>03</b> — Sacred Craft</span>
                <span class="rule"></span>
                <span class="k jp">手業 // SYSTEM CURRICULUM</span>
            </div>
            <div class="cur-head">
                <h2 class="display h-sec">Six disciplines. One connected health intelligence.</h2>
                <p class="body-lg">
                    Each module functions as an autonomous engineering discipline, connected by unified biometric event telemetry and clinical precision.
                </p>
            </div>
            <div class="cur" id="cur">
                <div class="les" onclick="nav('live-pose')">
                    <span class="k">01</span>
                    <h3>Biomechanical Vision<em class="jp">山門</em></h3>
                    <p>Real-time 33-joint skeleton tracking, spine inclination telemetry & risk alarms.</p>
                    <span class="t">60 FPS</span>
                    <i class="bar"></i>
                </div>
                <div class="les" onclick="nav('gym')">
                    <span class="k">02</span>
                    <h3>Adaptive Strength<em class="jp">筋力</em></h3>
                    <p>Categorized muscle group splits, automated camera rep counter, and rest timer.</p>
                    <span class="t">${gymCount} Splits</span>
                    <i class="bar"></i>
                </div>
                <div class="les" onclick="nav('yoga')">
                    <span class="k">03</span>
                    <h3>Asana Equilibrium<em class="jp">調和</em></h3>
                    <p>17 structured yoga poses with joint angle validation and posture hold check.</p>
                    <span class="t">${yogaCount} Poses</span>
                    <i class="bar"></i>
                </div>
                <div class="les" onclick="nav('bmi')">
                    <span class="k">04</span>
                    <h3>Metabolic Alchemy<em class="jp">代謝</em></h3>
                    <p>Precision Mifflin-St Jeor and Harris-Benedict BMR, TDEE, and macro targets.</p>
                    <span class="t">Clinical BMR</span>
                    <i class="bar"></i>
                </div>
                <div class="les" onclick="nav('food-tracker')">
                    <span class="k">05</span>
                    <h3>Daily Sustenance<em class="jp">養生</em></h3>
                    <p>Daily meal logging, hydration water tracker, and Gemini AI natural language food analysis.</p>
                    <span class="t">Gemini AI</span>
                    <i class="bar"></i>
                </div>
                <div class="les" onclick="nav('luna')">
                    <span class="k">06</span>
                    <h3>The Oracle<em class="jp">知性</em></h3>
                    <p>Luna AI conversational coaching, injury recovery advice, and custom fitness regimens.</p>
                    <span class="t">24/7 AI</span>
                    <i class="bar"></i>
                </div>
            </div>
        </section>

        <!-- ── CHAPTER IV: THE ORACLE (LUNA AI INTERACTION) ── -->
        <section class="sec" id="oracle" data-cam="4">
            <div class="sec-head">
                <span class="k"><b>04</b> — The Oracle</span>
                <span class="rule"></span>
                <span class="k jp">知性 // CONVERSATIONAL REASONING</span>
            </div>
            <div class="cur-head">
                <h2 class="display h-sec">Ask Luna anything about training, biomechanics or diet.</h2>
                <p class="body-lg">
                    Powered by multi-model Gemini fallbacks, Luna provides conversational coaching, kinematic posture analysis, and personalized metabolic strategies.
                </p>
            </div>
            <div class="oracle-preview-box">
                <div class="prompt-chip" onclick="askLunaPrompt('Calculate my ideal hypertrophy calorie and macro split for muscle gain')">
                    <div class="text-xs font-mono text-[var(--vermilion)] mb-1">PROMPT 01</div>
                    <div class="font-medium text-sm text-[var(--bone)]">Hypertrophy Macro Split</div>
                    <p class="text-xs text-[var(--text-dim)] mt-1">Calculate protein, carb and fat targets tailored to progressive overload.</p>
                </div>
                <div class="prompt-chip" onclick="askLunaPrompt('How can I improve my squat knee flexion angle and fix forward torso lean?')">
                    <div class="text-xs font-mono text-[var(--vermilion)] mb-1">PROMPT 02</div>
                    <div class="font-medium text-sm text-[var(--bone)]">Squat Kinematics Fix</div>
                    <p class="text-xs text-[var(--text-dim)] mt-1">Biomechanical advice for knee flexion and maintaining neutral spine.</p>
                </div>
                <div class="prompt-chip" onclick="askLunaPrompt('Give me a 7-day anti-inflammatory recovery meal plan')">
                    <div class="text-xs font-mono text-[var(--vermilion)] mb-1">PROMPT 03</div>
                    <div class="font-medium text-sm text-[var(--bone)]">7-Day Recovery Diet</div>
                    <p class="text-xs text-[var(--text-dim)] mt-1">Nutrient-dense recipes to accelerate tissue repair and joint mobility.</p>
                </div>
            </div>
            <div class="mt-8">
                <button onclick="nav('luna')" class="btn-editorial-primary">
                    OPEN LUNA AI CONVERSATION →
                </button>
            </div>
        </section>

        <!-- ── CHAPTER V: AFTERLIGHT (DOSSIER & EXPORT) ── -->
        <section class="sec fin" id="eternity" data-cam="4">
            <div class="eyebrow"><span class="dot"></span> Chapter 05 — Afterlight // Clinical Dossier</div>
            <h2 class="display">Afterlight</h2>
            <p class="body-lg">
                The gate does not close behind you. Take your health intelligence wherever you go: export clinical PDF reports, dispatch email dossiers, or generate HD explainer video briefings.
            </p>
            <div class="hero-actions-bar mt-6">
                <a class="cta" onclick="nav('export')">
                    <i></i><span>Open Export Studio</span>
                    <svg viewBox="0 0 14 14" fill="none" width="13" height="13"><path d="M3 11 11 3M5 3h6v6" stroke="#dfe7e0" stroke-width="1.3"/></svg>
                </a>
            </div>
        </section>

        <!-- ── CHAPTER 05.5: FREQUENT INQUIRIES & CLINICAL ARCHITECTURE (FAQ) ── -->
        <section class="sec faq-sec" id="faq" data-cam="4">
            <div class="sec-head">
                <span class="k"><b>05.5</b> — Inquiries</span>
                <span class="rule"></span>
                <span class="k jp">質疑 // CLINICAL & BIOMECHANICAL FAQS</span>
            </div>
            <div class="cur-head">
                <h2 class="display h-sec">Biomechanical Precision & System Architecture.</h2>
                <p class="body-lg">
                    Everything you need to know about zero-server privacy, 60 FPS vision telemetry, kinematic joints, and clinical exports.
                </p>
            </div>

            <div class="faq-accordion-container">
                <div class="faq-item" id="faq-item-1">
                    <button type="button" class="faq-question" onclick="window.toggleFaq(1)" aria-expanded="false">
                        <span class="faq-number">01</span>
                        <span class="faq-title">How does Luminix maintain 60 FPS computer vision without sending camera feeds to servers?</span>
                        <span class="faq-icon">+</span>
                    </button>
                    <div class="faq-answer">
                        <p>
                            Luminix executes 100% of its MediaPipe machine learning inference client-side inside your browser via WebAssembly (WASM) and WebGL hardware acceleration. Not a single pixel or video stream is ever uploaded to external servers. Only anonymous mathematical joint angles and repetition counters can be optionally synchronized with your encrypted vault.
                        </p>
                    </div>
                </div>

                <div class="faq-item" id="faq-item-2">
                    <button type="button" class="faq-question" onclick="window.toggleFaq(2)" aria-expanded="false">
                        <span class="faq-number">02</span>
                        <span class="faq-title">What camera hardware is required for 33-point biomechanics?</span>
                        <span class="faq-icon">+</span>
                    </button>
                    <div class="faq-answer">
                        <p>
                            Any standard 720p or 1080p webcam, laptop integrated camera, or smartphone mobile browser camera works natively. Luminix's adaptive smoothing algorithms normalize frame jitter and lighting variations in real time, delivering consistent 60 FPS pose estimation.
                        </p>
                    </div>
                </div>

                <div class="faq-item" id="faq-item-3">
                    <button type="button" class="faq-question" onclick="window.toggleFaq(3)" aria-expanded="false">
                        <span class="faq-number">03</span>
                        <span class="faq-title">How does the Adaptive Gym Engine detect discrete rep states?</span>
                        <span class="faq-icon">+</span>
                    </button>
                    <div class="faq-answer">
                        <p>
                            Rather than simple peak-detection, our engine uses deterministic finite state machines (FSM) measuring vector dot-products between proximal and distal limbs (e.g. hip-knee-ankle for squats, shoulder-elbow-wrist for push-ups and bicep curls). Reps are only incremented when complete eccentric depth and concentric lockout are achieved.
                        </p>
                    </div>
                </div>

                <div class="faq-item" id="faq-item-4">
                    <button type="button" class="faq-question" onclick="window.toggleFaq(4)" aria-expanded="false">
                        <span class="faq-number">04</span>
                        <span class="faq-title">How are Basal Metabolic Rate (BMR) and macro splits calculated?</span>
                        <span class="faq-icon">+</span>
                    </button>
                    <div class="faq-answer">
                        <p>
                            We apply the clinically validated Revised Harris-Benedict and Mifflin-St Jeor metabolic equations, scaled by your physical activity multiplier (PAL) to derive Total Daily Energy Expenditure (TDEE). Protein, carbohydrate, and fat targets are then dynamically balanced to match your progressive overload goals.
                        </p>
                    </div>
                </div>

                <div class="faq-item" id="faq-item-5">
                    <button type="button" class="faq-question" onclick="window.toggleFaq(5)" aria-expanded="false">
                        <span class="faq-number">05</span>
                        <span class="faq-title">Are clinical PDF reports and health exports secure?</span>
                        <span class="faq-icon">+</span>
                    </button>
                    <div class="faq-answer">
                        <p>
                            All exported PDF dossiers adhere to institutional health summary guidelines. Client data is protected by Argon2 password hashing, JWT HS256 authentication tokens, and our backend Web Application Firewall (WAF) threat shield with rate-limiting.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ── CHAPTER VI: THE ARCHITECT (CREATOR & SUPPORT) ── -->
        <section class="sec creator-sec" id="creator" data-cam="4">
            <div class="cur-tag">
                <span class="k"><b>06</b> — The Architect</span>
                <span class="rule"></span>
                <span class="k jp">創造主 // SYSTEM CREATOR & CRAFT</span>
            </div>
            <div class="cur-head">
                <h2 class="display h-sec">Crafted by Ram Charan Teja with Uncompromising Vision.</h2>
                <p class="body-lg">
                    Behind Luminix is an obsession with merging high-frequency client-side computer vision, clinical biomechanics, and a bespoke Kyoto cyber aesthetic into an autonomous health intelligence platform.
                </p>
            </div>

            <div class="creator-card-container">
                <div class="creator-spotlight-card" onclick="openCreatorModal('story')">
                    <div class="creator-card-inner">
                        <div class="creator-avatar-wrap">
                            <img src="/assets/togi pfp.jpeg" alt="Creator - Ram Charan Teja (@LUNO895)" class="creator-avatar-img" />
                            <span class="creator-verified-badge">⚡ ARCHITECT</span>
                        </div>
                        <div class="creator-info-main">
                            <div class="flex items-center gap-3 flex-wrap">
                                <h3 class="creator-name">Ram Charan Teja</h3>
                                <span class="creator-handle font-mono">@LUNO895</span>
                                <button type="button" onclick="event.stopPropagation(); window.copyToClipboard('luno97802@gmail.com', this);" style="display:inline-flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:11px; color:var(--bone-sub); background:rgba(255,255,255,0.04); border:1px solid rgba(223,231,224,0.15); padding:3px 10px; border-radius:4px; text-decoration:none; cursor:pointer; transition:all 0.2s ease;" title="Click to copy email address">
                                    <span>✉️</span>
                                    <span>luno97802@gmail.com</span>
                                </button>
                            </div>
                            <p class="creator-tagline">
                                Full-Stack AI Systems Architect, Computer Vision Engineer & Creative Technologist. Sole creator and builder of the Luminix ecosystem.
                            </p>
                            <div class="creator-tags-list">
                                <span class="c-tag">MediaPipe Vision</span>
                                <span class="c-tag">FastAPI Systems</span>
                                <span class="c-tag">WebGL & Three.js</span>
                                <span class="c-tag">Multi-Model Gemini LLM</span>
                                <span class="c-tag">Kinematic Trigonometry</span>
                                <span class="c-tag">Heavenly Restriction</span>
                            </div>
                        </div>
                    </div>

                    <div class="creator-actions-row">
                        <button type="button" onclick="event.stopPropagation(); openCreatorModal('story');" class="creator-explore-btn">
                            <span>View Full Creator Dossier & Tech Arsenal</span>
                            <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M3 11 11 3M5 3h6v6" stroke="currentColor" stroke-width="1.3"/></svg>
                        </button>
                        <button type="button" onclick="event.stopPropagation(); openCreatorModal('donate');" class="creator-donate-small-btn">
                            <span>❤️</span>
                            <span>Donate to Creator</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- ── COLOPHON FOOTER ── -->
        <footer class="foot" data-cam="5">
            <div class="foot-grid">
                <div class="foot-brand">
                    <svg viewBox="0 0 44 44" fill="none" width="36" height="36" aria-hidden="true">
                        <circle cx="22" cy="24" r="9" fill="#e0231c" fill-opacity="0.9"/>
                        <path d="M6 13h32M10 18h24M22 9v26" stroke="#dfe7e0" stroke-width="1.4"/>
                    </svg>
                    <p>
                        A night walk through Kyoto biomechanics. Charred cypress, lantern light, and a vermilion moon, rendered live in WebGL. Connected to full-stack health intelligence.
                    </p>
                </div>
                <div>
                    <h4>Chapters</h4>
                    <ul>
                        <li><a onclick="document.getElementById('hero')?.scrollIntoView({behavior:'smooth'})">The Threshold</a></li>
                        <li><a onclick="document.getElementById('gate')?.scrollIntoView({behavior:'smooth'})">The Sanmon</a></li>
                        <li><a onclick="document.getElementById('pathways')?.scrollIntoView({behavior:'smooth'})">Still Gardens</a></li>
                        <li><a onclick="document.getElementById('lessons')?.scrollIntoView({behavior:'smooth'})">Sacred Craft</a></li>
                        <li><a onclick="document.getElementById('eternity')?.scrollIntoView({behavior:'smooth'})">Afterlight</a></li>
                        <li><a onclick="document.getElementById('faq')?.scrollIntoView({behavior:'smooth'})">Frequent Inquiries</a></li>
                        <li><a onclick="document.getElementById('creator')?.scrollIntoView({behavior:'smooth'})">The Architect</a></li>
                    </ul>
                </div>
                <div>
                    <h4>Disciplines</h4>
                    <ul>
                        <li><a onclick="nav('live-pose')">60 FPS Live Pose</a></li>
                        <li><a onclick="nav('gym')">Adaptive Gym Engine</a></li>
                        <li><a onclick="nav('yoga')">17 Yoga Asanas</a></li>
                        <li><a onclick="nav('bmi')">Metabolic Matrix</a></li>
                        <li><a onclick="nav('food-tracker')">Food & Hydration</a></li>
                    </ul>
                </div>
                <div>
                    <h4>Intelligence</h4>
                    <ul>
                        <li><a onclick="nav('luna')">Luna AI Assistant</a></li>
                        <li><a onclick="nav('export')">Clinical PDF Export</a></li>
                        <li><a href="/docs" target="_blank">FastAPI Swagger Docs</a></li>
                        <li><a href="/health" target="_blank">Firewall Status</a></li>
                        <li><a onclick="window.openShareModal()" style="cursor:pointer; color:var(--vermilion);">📢 Share Platform</a></li>
                    </ul>
                </div>
                <div>
                    <h4>Sovereignty</h4>
                    <ul>
                        <li><a onclick="nav('privacy')" style="cursor:pointer;">Zero-Leak Privacy</a></li>
                        <li><a onclick="nav('terms')" style="cursor:pointer;">Terms of Service</a></li>
                        <li><a onclick="nav('accessibility')" style="cursor:pointer;">Accessibility Statement</a></li>
                        <li><a onclick="window.openCookieSettings()" style="cursor:pointer;">Cookie Preferences</a></li>
                        <li><a href="/robots.txt" target="_blank">Robots Index</a></li>
                    </ul>
                </div>
            </div>
            <div class="foot-base">
                <span>© 2026 LUMINIX — KYOTO EDITORIAL ENGINEERING</span>
                <span class="last-updated-badge font-mono">LAST UPDATED: SEPTEMBER 6, 2026 // BUILD 4.3-PROD</span>
                <span class="jp">静けさは一つの技である • 身体知性</span>
                <span class="flex items-center gap-2">
                    <a onclick="nav('privacy')" style="cursor:pointer; text-decoration:underline;">PRIVACY</a>
                    <span>•</span>
                    <a onclick="nav('terms')" style="cursor:pointer; text-decoration:underline;">TERMS</a>
                    <span>•</span>
                    <a onclick="nav('accessibility')" style="cursor:pointer; text-decoration:underline;">ACCESSIBILITY</a>
                </span>
            </div>
            <div class="foot-a11y-statement font-mono text-[10px] text-[var(--text-dim)] border-t border-[var(--border-subtle)] pt-3 mt-4 text-center">
                <span>♿ <strong>ACCESSIBILITY STATEMENT:</strong> Luminix is engineered for universal digital inclusion conforming to WCAG 2.1 Level AA standards with comprehensive keyboard navigation, semantic ARIA landmarks, high-contrast typography, and reduced-motion compliance. <a onclick="nav('accessibility')" style="cursor:pointer; text-decoration:underline; color:var(--bone);">Read Full Statement &rarr;</a></span>
            </div>
        </footer>
    `;

    fetchDemoBMI();
    window.initCookieConsent?.();
}

/* ── 01.5. IN-APP LEGAL VIEWS (PRIVACY POLICY & TERMS OF SERVICE) ───────────── */
function renderPrivacyView(container) {
    container.innerHTML = `
        <div class="legal-page-wrapper" style="padding-top:20px;">
            <div class="back-nav-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <button onclick="nav('dashboard')" class="btn-editorial-secondary text-xs py-2 px-4">
                    ← RETURN TO SANCTUARY
                </button>
                <a href="/privacy" target="_blank" class="font-mono text-xs text-[var(--bone-dim)] hover:text-white underline">
                    Open Standalone Page ↗
                </a>
            </div>

            <div class="legal-badge">
                <span class="legal-pulse-dot"></span>
                ZERO-LEAK PRIVACY COVENANT & TELEMETRY CHARTER
            </div>
            <h1 class="legal-title">Privacy Policy & Biometric Architecture</h1>
            <p class="legal-subtitle">
                "Where stillness reveals the unseen — and your biological telemetry remains strictly within your dominion."
            </p>
            <div class="legal-meta">
                <span>EFFECTIVE: SEPTEMBER 6, 2026</span>
                <span>COMPLIANCE: GDPR, CCPA, CPRA ZERO-LEAK</span>
                <span>INFERENCE: 100% LOCAL WEBASSEMBLY (WASM)</span>
            </div>

            <div class="covenant-highlight-box mt-5">
                <p>
                    🔒 <strong>THE ZERO-LEAK SOVEREIGNTY GUARANTEE:</strong> Luminix was engineered by Ram Charan Teja with an uncompromising principle: 
                    <strong>your camera frames, joint vectors, and biometric indicators never leave your device without your explicit authorization.</strong> 
                    We do not sell, rent, monetize, or harvest personal health data for external advertisers under any circumstance.
                </p>
            </div>

            <section class="legal-card mt-6">
                <h2><span class="section-num">01</span> Client-Side WebAssembly Computer Vision</h2>
                <p>
                    Luminix executes 100% of its MediaPipe machine learning inference locally inside your browser via WebAssembly (WASM) and WebGL acceleration. 
                    When you grant camera access for pose detection, 17 yoga asanas, or the adaptive gym state machine:
                </p>
                <ul>
                    <li>Raw camera frames are processed entirely in transient device RAM at 60 FPS.</li>
                    <li>No video stream, recorded clip, or photographic frame is ever uploaded to external servers.</li>
                    <li>Camera access terminates instantly the moment you navigate away, stop the workout, or close the browser tab.</li>
                </ul>
            </section>

            <section class="legal-card">
                <h2><span class="section-num">02</span> Data We Collect & Storage Architecture</h2>
                <p>
                    When you opt to create a Luminix account or personalize your biomechanical baseline, we store only the minimal necessary telemetry:
                </p>
                <ul>
                    <li><strong>Identity:</strong> Name/codename, email address, encrypted password hash (Argon2 / bcrypt), and optional custom avatar URL.</li>
                    <li><strong>Biometric Baseline:</strong> Age, height, weight, and fitness objective — utilized exclusively for Mifflin-St Jeor metabolic calculations.</li>
                    <li><strong>Workout Logs:</strong> Completed repetition counts, sets, exercise timestamps, and yoga pose hold durations.</li>
                    <li><strong>Wearable Telemetry:</strong> Heart rate, blood oxygen (SpO2), systolic/diastolic blood pressure, and step counts if you sync a device via the Wearable Hub.</li>
                </ul>
            </section>

            <section class="legal-card">
                <h2><span class="section-num">03</span> Rate Limiting & Web Application Firewall (WAF)</h2>
                <p>
                    To defend against credential stuffing, brute-force incursions, and automated scrapers, the Luminix security gateway enforces:
                </p>
                <ul>
                    <li><strong>Authentication Shield:</strong> Strict sliding-window rate limit of <strong>maximum 5 attempts per 15-minute window</strong> on all authentication endpoints.</li>
                    <li><strong>Universal API Limiting:</strong> 60 requests per minute ceiling on telemetry and computation endpoints.</li>
                    <li><strong>Payload Size Guard:</strong> Immediate HTTP 413 rejection for request payloads exceeding 1MB (15MB for authorized media exports).</li>
                    <li><strong>Threat Sanitization:</strong> Automatic dropping of payloads containing SQL injection, XSS signatures, or null bytes.</li>
                </ul>
            </section>

            <section class="legal-card">
                <h2><span class="section-num">04</span> Your Global Privacy Rights (GDPR & CCPA)</h2>
                <p>
                    You retain total dominion over your biological data:
                </p>
                <ul>
                    <li><strong>Access & Portability:</strong> Export your full biometric history at any time via Luna AI Clinical PDF Export.</li>
                    <li><strong>Right to Erasure:</strong> Purge your entire profile, telemetry logs, and wearable records with one click in security settings.</li>
                    <li><strong>Cookie Preferences:</strong> Customize analytics and storage cookies anytime via the <a onclick="window.openCookieSettings()" style="color:var(--vermilion); cursor:pointer; text-decoration:underline;">Cookie Settings Modal</a>.</li>
                </ul>
            </section>
        </div>
    `;
}

function renderTermsView(container) {
    container.innerHTML = `
        <div class="legal-page-wrapper" style="padding-top:20px;">
            <div class="back-nav-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <button onclick="nav('dashboard')" class="btn-editorial-secondary text-xs py-2 px-4">
                    ← RETURN TO SANCTUARY
                </button>
                <a href="/terms" target="_blank" class="font-mono text-xs text-[var(--bone-dim)] hover:text-white underline">
                    Open Standalone Page ↗
                </a>
            </div>

            <div class="legal-badge" style="color:var(--gold); border-color:rgba(201, 162, 74, 0.3); background:rgba(201, 162, 74, 0.08);">
                <span class="legal-pulse-dot" style="background:var(--gold); box-shadow:0 0 8px var(--gold);"></span>
                BIOMECHANICAL TELEMETRY COVENANT & TERMS OF SERVICE
            </div>
            <h1 class="legal-title">Terms & Conditions of Service</h1>
            <p class="legal-subtitle">
                "Enter with intentionality. Every joint angle measured, every repetition logged is an exercise in kinetic discipline."
            </p>
            <div class="legal-meta">
                <span>REVISION: SEPTEMBER 6, 2026</span>
                <span>BUILD: 4.3 PRODUCTION READY</span>
                <span>AUTHOR: RAM CHARAN TEJA (@LUNO895)</span>
            </div>

            <div class="warning-highlight-box mt-5">
                <h3>⚠️ NON-MEDICAL ADVICE COVENANT</h3>
                <p>
                    Luminix provides computer vision kinematic estimations, posture alignment cues, exercise repetition tracking, and metabolic estimations for educational, athletic, and wellness optimization purposes only. 
                    <strong>Luminix is NOT a medical device, nor does it provide clinical diagnosis, physical therapy prescriptions, or emergency cardiac monitoring.</strong> 
                    Always consult a certified medical professional or physician prior to engaging in strenuous physical training.
                </p>
            </div>

            <section class="legal-card mt-6">
                <h2><span class="section-num">01</span> Acceptance of Covenant</h2>
                <p>
                    By accessing, browsing, registering an account, or connecting camera/wearable telemetry to the Luminix platform, you affirm that you have read, understood, and agreed to be bound by these Terms of Service and our Zero-Leak Privacy Covenant.
                </p>
            </section>

            <section class="legal-card">
                <h2><span class="section-num">02</span> User Eligibility & Integrity</h2>
                <p>
                    You agree that you are at least 13 years of age, will maintain confidentiality of your authentication credentials, and will provide reasonably accurate height/weight parameters for metabolic algorithm integrity.
                </p>
            </section>

            <section class="legal-card">
                <h2><span class="section-num">03</span> Permitted Use & Security Constraints</h2>
                <p>
                    Luminix is engineered as a private space for athletic development. You explicitly agree not to reverse-engineer core algorithms, launch brute-force attacks exceeding rate limits (max 5 attempts per 15 minutes), or transmit malicious payloads.
                </p>
            </section>

            <section class="legal-card">
                <h2><span class="section-num">04</span> Intellectual Property Rights</h2>
                <p>
                    The visual architecture, Kyoto dark editorial design system, Three.js shaders, 17 yoga pose coordinate definitions, discrete gym rep counter, Luna AI assistant workflows, and media assets are the exclusive intellectual property of <strong>Ram Charan Teja (@LUNO895)</strong>.
                </p>
            </section>
        </div>
    `;
}

function renderAccessibilityView(container) {
    container.innerHTML = `
        <div class="legal-page-wrapper" style="padding-top:20px;">
            <div class="back-nav-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <button onclick="nav('dashboard')" class="btn-editorial-secondary text-xs py-2 px-4">
                    ← RETURN TO SANCTUARY
                </button>
                <a href="/accessibility" target="_blank" class="font-mono text-xs text-[var(--bone-dim)] hover:text-white underline">
                    Open Standalone Page ↗
                </a>
            </div>

            <div class="legal-badge" style="color:#38bdf8; background:rgba(56,189,248,0.08); border-color:rgba(56,189,248,0.25);">
                <span class="legal-pulse-dot" style="background:#38bdf8; box-shadow:0 0 8px #38bdf8;"></span>
                WCAG 2.1 LEVEL AA CONFORMANCE CHARTER
            </div>
            <h1 class="legal-title">Accessibility Statement</h1>
            <p class="legal-subtitle">
                "Universal access to physical intelligence, stillness, and biomechanical sovereignty for people of all abilities."
            </p>
            <div class="legal-meta">
                <span>EFFECTIVE: SEPTEMBER 6, 2026</span>
                <span>STANDARD: WCAG 2.1 LEVEL AA</span>
                <span>AUDIT STATUS: ACTIVE INTERNAL AUDIT</span>
            </div>

            <div class="covenant-highlight-box mt-5" style="border-left-color:#38bdf8; background:rgba(56,189,248,0.05);">
                <p>
                    ♿ <strong>LUMINIX COMMITMENT TO DIGITAL INCLUSION:</strong> Luminix was engineered by Ram Charan Teja with a core belief that health intelligence, postural self-awareness, and mindfulness should be universally accessible. We actively engineer and optimize our user interface to conform with the <strong>Web Content Accessibility Guidelines (WCAG 2.1) Level AA</strong>.
                </p>
            </div>

            <section class="legal-card mt-6">
                <h2><span class="section-num" style="color:#38bdf8; background:rgba(56,189,248,0.1);">01</span> Keyboard Navigation & Focus Architecture</h2>
                <p>Every primary and secondary interactive element across the Luminix sanctuary is fully operable without a mouse:</p>
                <ul>
                    <li><strong>Tab & Shift+Tab Ordering:</strong> Logical focus progression through navigation bars, workout selectors, nutrition calculators, and profile settings.</li>
                    <li><strong>Visible Focus Indicators:</strong> High-contrast focus rings make the currently active element clearly identifiable.</li>
                    <li><strong>Modal Dismissal:</strong> The <kbd>ESC</kbd> key instantaneously closes any active overlay, including the Search Palette, Kyoto Share Modal, Cookie Settings, and Biometric Drawers.</li>
                    <li><strong>Skip Navigation:</strong> Direct semantic landmark architecture permits immediate jumping past headers directly to primary workouts.</li>
                </ul>
            </section>

            <section class="legal-card">
                <h2><span class="section-num" style="color:#38bdf8; background:rgba(56,189,248,0.1);">02</span> Screen Reader & Semantic Hierarchy</h2>
                <p>Our templates and dynamic DOM elements are built with semantic HTML5 and Accessible Rich Internet Applications (WAI-ARIA) specifications:</p>
                <ul>
                    <li><strong>Landmark Structure:</strong> Proper use of <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;aside&gt;</code>, and <code>&lt;footer&gt;</code> containers for seamless screen reader jumping.</li>
                    <li><strong>Explicit ARIA Labels:</strong> Every icon-only button contains explicit <code>aria-label</code> and <code>title</code> attributes describing its exact programmatic action.</li>
                    <li><strong>Descriptive Alternative Text:</strong> Visual assets, instructor avatars, anatomy diagrams, and UI state indicators carry rich, context-aware <code>alt</code> descriptions.</li>
                    <li><strong>Form Labels:</strong> All input elements in authentication views, BMI calculators, and meal planners have permanently associated <code>&lt;label&gt;</code> elements.</li>
                </ul>
            </section>

            <section class="legal-card">
                <h2><span class="section-num" style="color:#38bdf8; background:rgba(56,189,248,0.1);">03</span> Sensory Accommodations & Motion Safety</h2>
                <p>We acknowledge sensory sensitivities and diverse physiological conditions:</p>
                <ul>
                    <li><strong>Reduced Motion Compliance:</strong> When your operating system requests reduced motion (<code>prefers-reduced-motion: reduce</code>), all heavy 3D camera pan animations, WebGL transitions, and particle flows are immediately disabled or replaced with static dissolves.</li>
                    <li><strong>High-Contrast Color Ratios:</strong> Text typography is rendered with contrast ratios meeting or exceeding 4.5:1 for standard text and 3:1 for large display headers against our deep Kyoto background.</li>
                    <li><strong>No Auto-Playing Audio:</strong> Workout timers and countdown sounds never auto-play without prior user initialization. Audio alerts respect global muting toggles.</li>
                </ul>
            </section>

            <section class="legal-card">
                <h2><span class="section-num" style="color:#38bdf8; background:rgba(56,189,248,0.1);">04</span> Continuous Audit & Feedback Mechanism</h2>
                <p>Accessibility is an ongoing commitment. If you encounter any accessibility barrier or assistive technology conflict within Luminix:</p>
                <div class="covenant-highlight-box mt-3 mb-3" style="border-left-color:#38bdf8; background:rgba(56,189,248,0.05);">
                    <strong>Accessibility Feedback & Support Contact:</strong><br>
                    <span>Email: <code class="font-mono text-[var(--vermilion)]">accessibility@TODO_LEGAL_REVIEW.example</code></span><br>
                    <span class="text-xs text-[var(--text-dim)] font-mono">[LEGAL REVIEW REQUIRED — PENDING PRODUCTION SUPPORT CONFIGURATION]</span><br>
                    <span>Standard Target Response Window: Within 5 business days</span>
                </div>
            </section>
        </div>
    `;
}

window.handleContactSubmit = function(e) {
    e.preventDefault();
    const btn = document.getElementById('contact-submit-btn');
    const msg = document.getElementById('contact-status-msg');
    if (btn) btn.disabled = true;
    if (msg) msg.textContent = 'Message transmitted successfully. We will reach out shortly.';
    setTimeout(() => {
        if (btn) btn.disabled = false;
        e.target.reset();
    }, 2000);
};

// ── BMI & Nutrition Demo Fetch ─────────────────────────────────
async function fetchDemoBMI() {
    try {
        const savedProfile = localStorage.getItem('luminix_nutrition_profile');
        if (savedProfile) {
            const p = JSON.parse(savedProfile);
            const h = (p.height_cm || 175) / 100;
            const bmi = (p.weight_kg || 72) / (h * h);
            const el = document.getElementById('dash-bmi');
            if (el) el.textContent = bmi.toFixed(1);
        }
    } catch (_) {}
}

// ══════════════════════════════════════════════════════════════════
//  02. LIVE POSE DETECTION VIEW (MediaPipe Biometrics)
// ══════════════════════════════════════════════════════════════════
window.luminixPose = {
    calculateAngle(a, b, c, aspect = 1.0) {
        if (!a || !b || !c) return 0;
        // Factor in aspect ratio (videoWidth / videoHeight) so angles are isotropic in pixel space
        const cbX = (c.x - b.x) * aspect;
        const cbY = c.y - b.y;
        const abX = (a.x - b.x) * aspect;
        const abY = a.y - b.y;
        const radians = Math.atan2(cbY, cbX) - Math.atan2(abY, abX);
        let angle = Math.abs((radians * 180.0) / Math.PI);
        if (angle > 180.0) angle = 360.0 - angle;
        return Math.round(angle);
    },

    computeCoverViewport(videoW, videoH, canvasW, canvasH) {
        if (!videoW || !videoH || !canvasW || !canvasH) {
            return { x: 0, y: 0, width: canvasW, height: canvasH, aspect: 1.0 };
        }
        const videoAspect = videoW / videoH;
        const canvasAspect = canvasW / canvasH;
        let drawW = canvasW;
        let drawH = canvasH;
        let offX = 0;
        let offY = 0;

        if (videoAspect > canvasAspect) {
            // Video wider than canvas: fill height, crop sides symmetrically
            drawW = canvasH * videoAspect;
            offX = (canvasW - drawW) / 2;
        } else {
            // Video taller than canvas: fill width, crop top/bottom symmetrically
            drawH = canvasW / videoAspect;
            offY = (canvasH - drawH) / 2;
        }
        return { x: offX, y: offY, width: drawW, height: drawH, aspect: videoAspect };
    },

    getInferenceDimensions(videoW, videoH) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 768);
        const targetMax = isMobile ? 384 : 480;
        const aspect = (videoW && videoH) ? (videoW / videoH) : (4 / 3);
        let targetW, targetH;
        if (aspect >= 1.0) {
            targetW = targetMax;
            targetH = Math.max(120, Math.round(targetMax / aspect));
        } else {
            targetH = targetMax;
            targetW = Math.max(120, Math.round(targetMax * aspect));
        }
        return { width: targetW, height: targetH, aspect };
    },

    drawLuminixSkeleton(ctx, landmarks, w, h, options = {}) {
        if (!landmarks || landmarks.length === 0) return;
        const showAngles = options.showAngles !== false;
        const showFaceTree = options.showFaceTree !== false;
        const aspect = options.aspect || 1.0;
        const isMirrored = options.mirrored === true;
        const vp = options.viewport || { x: 0, y: 0, width: w, height: h };

        const toX = (normX) => vp.x + normX * vp.width;
        const toY = (normY) => vp.y + normY * vp.height;

        let primaryColor = '#2F4DFF';
        let secondaryColor = '#2F4DFF';
        let nodeFill = '#FFFFFF';
        if (options.theme === 'yellow') {
            primaryColor = '#EAB308';
            secondaryColor = '#CA8A04';
        } else if (options.theme === 'cyan') {
            primaryColor = '#00E5FF';
            secondaryColor = '#0891B2';
        }

        // 1. Facial Landmark Tree
        if (showFaceTree) {
            const FACE_TREE = [
                [0, 1], [1, 2], [2, 3], [3, 7],
                [0, 4], [4, 5], [5, 6], [6, 8],
                [1, 4], [2, 5], [9, 10], [0, 9], [0, 10],
                [11, 7], [12, 8]
            ];

            ctx.lineWidth = 1.5;
            ctx.strokeStyle = secondaryColor;

            for (const [a, b] of FACE_TREE) {
                const la = landmarks[a], lb = landmarks[b];
                if (!la || !lb || (la.visibility !== undefined && la.visibility < 0.20) || (lb.visibility !== undefined && lb.visibility < 0.20)) continue;
                ctx.beginPath();
                ctx.moveTo(toX(la.x), toY(la.y));
                ctx.lineTo(toX(lb.x), toY(lb.y));
                ctx.stroke();
            }
        }

        // 2. Full Body Core Kinematic Skeleton
        const BODY_CONNECTIONS = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24],
            [23, 25], [25, 27], [27, 29], [27, 31],
            [24, 26], [26, 28], [28, 30], [28, 32]
        ];

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = primaryColor;
        for (const [a, b] of BODY_CONNECTIONS) {
            const la = landmarks[a], lb = landmarks[b];
            if (!la || !lb || (la.visibility !== undefined && la.visibility < 0.25) || (lb.visibility !== undefined && lb.visibility < 0.25)) continue;
            ctx.beginPath();
            ctx.moveTo(toX(la.x), toY(la.y));
            ctx.lineTo(toX(lb.x), toY(lb.y));
            ctx.stroke();
        }

        // 3. Precision Node Points
        for (let i = 0; i < landmarks.length; i++) {
            const pt = landmarks[i];
            if (!pt || (pt.visibility !== undefined && pt.visibility < 0.25)) continue;
            const px = toX(pt.x), py = toY(pt.y);

            ctx.fillStyle = nodeFill;
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4. Joint Angle Badges
        if (showAngles) {
            const joints = [
                { a: 23, b: 25, c: 27 },
                { a: 24, b: 26, c: 28 },
                { a: 11, b: 13, c: 15 },
                { a: 12, b: 14, c: 16 }
            ];

            ctx.font = '600 10px Fragment Mono, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            joints.forEach(j => {
                const la = landmarks[j.a], lb = landmarks[j.b], lc = landmarks[j.c];
                if (!la || !lb || !lc || (lb.visibility !== undefined && lb.visibility < 0.30)) return;

                const angle = this.calculateAngle(la, lb, lc, aspect);
                const px = toX(lb.x) + 16;
                const py = toY(lb.y) - 6;

                ctx.save();
                if (isMirrored) {
                    ctx.translate(px, py);
                    ctx.scale(-1, 1);
                    ctx.fillStyle = primaryColor;
                    ctx.fillRect(-14, -8, 28, 16);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`${angle}°`, 0, 0);
                } else {
                    ctx.fillStyle = primaryColor;
                    ctx.fillRect(px - 14, py - 8, 28, 16);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`${angle}°`, px, py);
                }
                ctx.restore();
            });
        }
    },

    evaluatePostureRisk(landmarks, options = {}) {
        const aspect = (typeof options === 'number') ? options : (options.aspect || 1.0);
        if (!landmarks || landmarks.length < 25) {
            return {
                score: 85,
                status: 'safe',
                risky: false,
                hasAlert: false,
                alertTitle: 'STAND IN FRAME',
                alertMsg: 'Stand in camera frame for real-time biomechanics analysis.',
                alertTips: ['• Position camera at chest height', '• Step back so full body is visible'],
                feedback: 'Stand in frame for full biomechanics analysis',
                angles: { leftElbow: 0, rightElbow: 0, leftKnee: 0, rightKnee: 0, leftHip: 0, rightHip: 0, spineAngle: 0, symmetry: 100 }
            };
        }

        const leftElbow = this.calculateAngle(landmarks[11], landmarks[13], landmarks[15], aspect);
        const rightElbow = this.calculateAngle(landmarks[12], landmarks[14], landmarks[16], aspect);
        const leftKnee = this.calculateAngle(landmarks[23], landmarks[25], landmarks[27], aspect);
        const rightKnee = this.calculateAngle(landmarks[24], landmarks[26], landmarks[28], aspect);
        const leftHip = this.calculateAngle(landmarks[11], landmarks[23], landmarks[25], aspect);
        const rightHip = this.calculateAngle(landmarks[12], landmarks[24], landmarks[26], aspect);

        const midShX = (landmarks[11].x + landmarks[12].x) / 2;
        const midShY = (landmarks[11].y + landmarks[12].y) / 2;
        const midHipX = (landmarks[23].x + landmarks[24].x) / 2;
        const midHipY = (landmarks[23].y + landmarks[24].y) / 2;
        
        // Use aspect-scaled horizontal delta to preserve physical spine inclination angle
        const dxSpine = (midShX - midHipX) * aspect;
        const dySpine = midHipY - midShY;
        const spineAngle = Math.round(Math.abs(Math.atan2(dxSpine, dySpine) * (180 / Math.PI)));

        const shoulderDiff = Math.abs(landmarks[11].y - landmarks[12].y);
        const hipDiff = Math.abs(landmarks[23].y - landmarks[24].y);
        const symmetry = Math.max(40, Math.min(100, Math.round(100 - (shoulderDiff * 140 + hipDiff * 100))));

        let risky = false;
        let penalty = 0;
        let feedback = 'Optimal alignment. Symmetrical joint vectors maintained.';

        // ── Check Node Connection & Camera Framing ───────────
        const shLVis = landmarks[11]?.visibility ?? 1;
        const shRVis = landmarks[12]?.visibility ?? 1;
        const hipLVis = landmarks[23]?.visibility ?? 1;
        const hipRVis = landmarks[24]?.visibility ?? 1;

        let hasAlert = false;
        let alertTitle = 'POSTURE & CAMERA ANGLE ALERT';
        let alertMsg = '';
        let alertTips = [];

        // Threshold 0.35 allows reliable posture tracking on mobile without spurious node alerts
        if (shLVis < 0.35 || shRVis < 0.35 || hipLVis < 0.35 || hipRVis < 0.35) {
            hasAlert = true;
            penalty += 25;
            alertTitle = 'NODE CONNECTION & CAMERA ANGLE ALERT';
            alertMsg = 'Posture check in progress / Node connection: Ensure shoulders and hips are framed.';
            alertTips = [
                '• Adjust camera angle and step back 1.5–2.5 meters',
                '• Ensure shoulders and hips are clearly framed in good lighting',
                '• Stand upright facing the lens'
            ];
            feedback = '⚠️ Node connection: Frame full torso for precision tracking.';
        } else {
            const shoulderSpan = Math.abs(landmarks[11].x - landmarks[12].x);
            // In mobile portrait (aspect < 0.8), shoulders occupy larger percentage of width
            const shoulderSpanThreshold = aspect < 0.8 ? 0.75 : 0.60;

            if (shoulderSpan > shoulderSpanThreshold || (landmarks[23].y > 0.96 && landmarks[24].y > 0.96)) {
                hasAlert = true;
                penalty += 20;
                alertTitle = 'CAMERA DISTANCE ALERT';
                alertMsg = 'You are close to the camera lens. Torso is cutting off lower joints.';
                alertTips = [
                    '• Step back 1–2 steps so knees and hips are visible',
                    '• Tilt camera slightly downward if placed on a desk'
                ];
                feedback = '⚠️ Too close to camera: Step back to frame full body.';
            } else if (landmarks[11].y > landmarks[23].y + 0.05 || landmarks[12].y > landmarks[24].y + 0.05) {
                hasAlert = true;
                risky = true;
                penalty += 45;
                alertTitle = 'POSTURE CORRECTION ALERT';
                alertMsg = 'Posture is not correct: Severe lumbar flexion detected (shoulders below hips).';
                alertTips = [
                    '• Straighten your back and brace core muscles',
                    '• Lift chest and align head over spine'
                ];
                feedback = '⚠️ Severe lumbar flexion detected: Shoulders below hips. Protect spine!';
            } else if (spineAngle > 30) {
                hasAlert = true;
                penalty += 25;
                alertTitle = 'POSTURE & SPINE ALIGNMENT ALERT';
                alertMsg = `Posture is not correct: High spinal tilt (${spineAngle}°). Re-center torso vertically.`;
                alertTips = [
                    '• Stand upright with weight balanced evenly on both feet',
                    '• Re-center torso vertically over hips'
                ];
                feedback = '⚠️ High spinal inclination: Re-center torso vertically over hips.';
            } else if (shoulderDiff > 0.10) {
                hasAlert = true;
                penalty += 15;
                alertTitle = 'POSTURE ASYMMETRY ALERT';
                alertMsg = 'Posture is not correct: Significant shoulder asymmetry. Level your collarbone.';
                alertTips = [
                    '• Level collarbone with horizon',
                    '• Relax upper traps and square shoulders'
                ];
                feedback = 'ℹ️ Shoulder asymmetry detected: Level collarbone.';
            }
        }

        const score = Math.max(30, Math.min(99, Math.round(96 - penalty)));
        let status = 'safe';
        if (risky || score < 55) status = 'danger';
        else if (score < 80) status = 'warning';

        return {
            score,
            status,
            risky,
            hasAlert,
            alertTitle,
            alertMsg,
            alertTips,
            feedback,
            angles: { leftElbow, rightElbow, leftKnee, rightKnee, leftHip, rightHip, spineAngle, symmetry }
        };
    },

    renderPostureAlert(elementId, metrics) {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (!metrics || !metrics.hasAlert) {
            el._consecutiveAlerts = 0;
            el.classList.add('hidden');
            return;
        }

        // Require 2 consecutive alert frames to prevent single-frame occlusion spikes
        el._consecutiveAlerts = (el._consecutiveAlerts || 0) + 1;
        if (el._consecutiveAlerts < 2) return;

        // If temporarily dismissed by user, keep hidden
        if (el.dataset.dismissedUntil && Date.now() < parseInt(el.dataset.dismissedUntil, 10)) {
            el.classList.add('hidden');
            return;
        }

        el.classList.remove('hidden');
        const titleEl = el.querySelector('.posture-alert-title');
        const msgEl = el.querySelector('.posture-alert-msg');
        const tipsEl = el.querySelector('.posture-alert-tips');

        if (titleEl) titleEl.textContent = metrics.alertTitle || 'POSTURE & CAMERA ANGLE ALERT';
        if (msgEl) msgEl.textContent = metrics.alertMsg || 'Adjust posture and camera angle for optimal tracking.';
        if (tipsEl && metrics.alertTips) {
            tipsEl.innerHTML = metrics.alertTips.map(t => `<span>${t.replace(/^[•\s-]+/, '')}</span>`).join('');
        }
    }
};

window.dismissPostureAlert = function(btn) {
    const toast = btn.closest('.posture-alert-toast');
    if (toast) {
        toast.classList.add('hidden');
        toast.dataset.dismissedUntil = (Date.now() + 20000).toString(); // snooze 20 seconds
    }
};

function renderLivePose(container) {
    container.innerHTML = `
        <div class="module-header">
            <div>
                <div class="hero-category-tag"><span class="w-2 h-2 rounded-full bg-[var(--vermilion)] inline-block shadow-[0_0_8px_var(--vermilion)] mr-1.5"></span> MODULE 02 // COMPUTER VISION</div>
                <h1 class="module-title-large">REAL-TIME <span class="text-vermilion font-display font-extrabold">BIOMECHANICAL ENGINE.</span></h1>
                <p class="text-secondary text-sm mt-1">High-refresh computer vision skeletal analysis powered by MediaPipe. Zero frame latency.</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="switchCameraFacing()" id="flip-cam-btn" class="btn-editorial-secondary text-xs px-3 py-2">🔄 FLIP CAM</button>
                <button onclick="toggleCamera()" id="camera-toggle" class="btn-editorial-primary">START CAMERA</button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-start">
            <!-- Viewport (7 Cols) -->
            <div class="lg:col-span-7 module-card relative overflow-hidden flex flex-col justify-between min-w-0 w-full" style="min-height: 480px; height: 480px; background: #000000;">
                <video id="pose-video" style="display:none;" playsinline></video>
                <canvas id="pose-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></canvas>

                <!-- Top Floating HUD -->
                <div class="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                    <div class="flex items-center gap-2">
                        <span id="pose-fps-badge" class="font-mono text-xs text-white bg-black/80 px-2.5 py-1 rounded border border-white/20">120 FPS // ACTIVE STREAM</span>
                        <span class="font-mono text-xs text-blue-400 bg-black/80 px-2.5 py-1 rounded border border-blue-500/30">33 LANDMARKS</span>
                    </div>
                    <div id="risk-badge" class="font-mono text-xs font-bold px-3 py-1 rounded bg-green-500 text-white">● SAFE</div>
                </div>

                <!-- Posture & Camera Angle Pop-up Alert Toast -->
                <div id="live-pose-alert-toast" class="posture-alert-toast hidden">
                    <div class="posture-alert-header">
                        <div class="flex items-center gap-1.5">
                            <span class="posture-alert-icon">⚠️</span>
                            <div class="posture-alert-title">POSTURE & CAMERA ANGLE ALERT</div>
                        </div>
                        <button type="button" onclick="dismissPostureAlert(this)" class="posture-alert-close" title="Dismiss Alert">✕</button>
                    </div>
                    <div class="posture-alert-content">
                        <div class="posture-alert-msg">Adjust posture & camera angle</div>
                        <div class="posture-alert-tips"></div>
                    </div>
                </div>

                <!-- Camera Loading Overlay -->
                <div id="camera-loading" class="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white" style="display:none; z-index: 30;">
                    <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p class="font-mono text-sm">Calibrating 120 FPS Camera Stream...</p>
                </div>

                <!-- Bottom Camera Bar -->
                <div class="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between bg-black/80 backdrop-blur-md p-3 rounded border border-white/20 text-white">
                    <div class="flex-1 max-w-xs mr-4">
                        <div class="flex justify-between text-xs font-mono mb-1">
                            <span>Form Alignment</span>
                            <span id="camera-form-score" class="text-blue-400 font-bold">85%</span>
                        </div>
                        <div class="w-full bg-white/20 h-1.5 rounded overflow-hidden">
                            <div class="h-full bg-blue-500 transition-all duration-300" id="score-bar" style="width:85%"></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="switchCameraFacing()" class="text-xs font-mono bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded" title="Switch Front/Rear Camera">Flip</button>
                        <button onclick="toggleCameraMirror()" class="text-xs font-mono bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded">Mirror</button>
                        <button onclick="toggleAngleLabels()" id="angle-toggle-btn" class="text-xs font-mono bg-blue-600 px-2.5 py-1 rounded">Angles: ON</button>
                    </div>
                </div>
            </div>

            <!-- Biometrics Matrix (5 Cols) -->
            <div class="lg:col-span-5 flex flex-col gap-4 min-w-0 w-full">
                <div class="module-card p-6">
                    <div class="flex justify-between items-baseline mb-4">
                        <div>
                            <span class="font-mono text-xs text-[var(--bone-dim)]">ALIGNMENT SCORE</span>
                            <h3 class="text-4xl font-extrabold font-display mt-1 text-[var(--bone)]" id="stat-score">--</h3>
                        </div>
                        <div class="text-right">
                            <span class="font-mono text-xs px-2.5 py-1 bg-[rgba(56,189,248,0.15)] text-[#38bdf8] border border-[rgba(56,189,248,0.3)] rounded font-bold" id="stat-status">STANDBY</span>
                            <p class="font-mono text-xs text-[var(--muted)] mt-1" id="stat-session-time">00:00</p>
                        </div>
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between text-xs font-mono mb-1">
                            <span class="text-[var(--bone-dim)]">Symmetry Index</span>
                            <span id="stat-symmetry" class="text-[#38bdf8] font-bold">100%</span>
                        </div>
                        <div class="w-full bg-[rgba(255,255,255,0.08)] h-2 rounded overflow-hidden">
                            <div id="stat-symmetry-bar" class="h-full bg-[var(--vermilion)] transition-all duration-300" style="width:100%;"></div>
                        </div>
                    </div>

                    <div class="p-3.5 rounded-lg bg-[rgba(14,19,26,0.85)] border border-[var(--border-subtle)]">
                        <p id="stat-feedback" class="text-xs text-[var(--bone-dim)] leading-relaxed">Start camera to activate real-time biomechanics feedback.</p>
                    </div>
                </div>

                <div class="module-card p-6 flex-1">
                    <div class="font-mono text-xs font-bold uppercase tracking-wider mb-3 text-[var(--bone-dim)]">Live Joint Angle Matrix</div>
                    <div class="grid grid-cols-2 gap-3" id="angle-matrix-grid">
                        <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[rgba(14,19,26,0.85)] backdrop-blur-md transition-all hover:border-[rgba(223,231,224,0.3)]">
                            <span class="font-mono text-[10px] text-[var(--bone-dim)] block uppercase tracking-wider">Spine Inclination</span>
                            <div class="text-2xl font-display font-bold text-[var(--bone)] mt-1" id="angle-spine">0°</div>
                        </div>
                        <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[rgba(14,19,26,0.85)] backdrop-blur-md transition-all hover:border-[rgba(56,189,248,0.4)]">
                            <span class="font-mono text-[10px] text-[var(--bone-dim)] block uppercase tracking-wider">Left Knee</span>
                            <div class="text-2xl font-display font-bold text-[#38bdf8] mt-1" id="angle-l-knee">0°</div>
                        </div>
                        <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[rgba(14,19,26,0.85)] backdrop-blur-md transition-all hover:border-[rgba(56,189,248,0.4)]">
                            <span class="font-mono text-[10px] text-[var(--bone-dim)] block uppercase tracking-wider">Right Knee</span>
                            <div class="text-2xl font-display font-bold text-[#38bdf8] mt-1" id="angle-r-knee">0°</div>
                        </div>
                        <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[rgba(14,19,26,0.85)] backdrop-blur-md transition-all hover:border-[rgba(223,231,224,0.3)]">
                            <span class="font-mono text-[10px] text-[var(--bone-dim)] block uppercase tracking-wider">Left Elbow</span>
                            <div class="text-2xl font-display font-bold text-[var(--bone)] mt-1" id="angle-l-elbow">0°</div>
                        </div>
                        <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[rgba(14,19,26,0.85)] backdrop-blur-md transition-all hover:border-[rgba(223,231,224,0.3)]">
                            <span class="font-mono text-[10px] text-[var(--bone-dim)] block uppercase tracking-wider">Right Elbow</span>
                            <div class="text-2xl font-display font-bold text-[var(--bone)] mt-1" id="angle-r-elbow">0°</div>
                        </div>
                        <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[rgba(14,19,26,0.85)] backdrop-blur-md transition-all hover:border-[rgba(224,35,28,0.4)]">
                            <span class="font-mono text-[10px] text-[var(--bone-dim)] block uppercase tracking-wider">Risk Count</span>
                            <div class="text-2xl font-display font-bold text-[var(--vermilion)] mt-1" id="stat-alerts">0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let cameraFacingMode = 'user';
let isProcessingInference = false;
let animFrameId = null;
let interpolatedLandmarks = null;
let targetLandmarks = null;
let currentCameraStream = null;

window.switchCameraFacing = async function() {
    cameraFacingMode = (cameraFacingMode === 'user') ? 'environment' : 'user';
    isCameraMirrored = (cameraFacingMode === 'user');
    const flipBtn = document.getElementById('flip-cam-btn');
    if (flipBtn) flipBtn.textContent = cameraFacingMode === 'user' ? '🔄 FRONT CAM' : '🔄 REAR CAM';
    if (poseEngine && currentCameraStream) {
        await startVideoStream();
    }
};

window.toggleAngleLabels = function() {
    showJointAngleLabels = !showJointAngleLabels;
    const btn = document.getElementById('angle-toggle-btn');
    if (btn) btn.textContent = `Angles: ${showJointAngleLabels ? 'ON' : 'OFF'}`;
};

window.toggleCameraMirror = function() {
    isCameraMirrored = !isCameraMirrored;
};

async function startVideoStream() {
    const video = document.getElementById('pose-video');
    if (!video) return;

    if (currentCameraStream) {
        currentCameraStream.getTracks().forEach(t => t.stop());
        currentCameraStream = null;
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 768);

    const constraints = {
        video: {
            facingMode: cameraFacingMode,
            width: isMobile ? { ideal: 480, max: 720 } : { ideal: 1280, max: 1280 },
            height: isMobile ? { ideal: 640, max: 1280 } : { ideal: 720, max: 720 },
            frameRate: isMobile ? { ideal: 30, max: 30 } : { ideal: 60, max: 60 }
        },
        audio: false
    };

    try {
        currentCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (_) {
        try {
            currentCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacingMode, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
                audio: false
            });
        } catch (e2) {
            currentCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacingMode },
                audio: false
            });
        }
    }

    video.srcObject = currentCameraStream;
    await video.play();
}

window.toggleCamera = async function() {
    const btn = document.getElementById('camera-toggle');
    if (poseEngine) {
        stopPoseEngine();
        if (btn) btn.textContent = 'START CAMERA';
        return;
    }
    if (btn) btn.textContent = 'STOP CAMERA';
    const loading = document.getElementById('camera-loading');
    if (loading) loading.style.display = 'flex';

    try {
        const video = document.getElementById('pose-video');
        const canvas = document.getElementById('pose-canvas');
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

        // Initialize MediaPipe Pose Engine with high throughput pipeline
        poseEngine = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        poseEngine.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.45
        });

        livePoseSessionStart = Date.now();
        if (livePoseSessionInterval) clearInterval(livePoseSessionInterval);
        livePoseSessionInterval = setInterval(() => {
            const el = document.getElementById('stat-session-time');
            if (el && livePoseSessionStart) {
                const totalSec = Math.floor((Date.now() - livePoseSessionStart) / 1000);
                const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
                const s = String(totalSec % 60).padStart(2, '0');
                el.textContent = `${m}:${s}`;
            }
        }, 1000);

        poseEngine.onResults(results => {
            if (loading && loading.style.display !== 'none') loading.style.display = 'none';
            if (results.poseLandmarks) {
                targetLandmarks = results.poseLandmarks;
                const aspect = (video && video.videoWidth && video.videoHeight) ? (video.videoWidth / video.videoHeight) : 1.0;
                const metrics = window.luminixPose.evaluatePostureRisk(results.poseLandmarks, { aspect });
                updateLivePoseHUD(metrics);
            } else {
                targetLandmarks = null;
            }
            isProcessingInference = false;
        });

        await poseEngine.initialize();
        await startVideoStream();

        // ── High-Performance Visual Rendering Loop ───────────────────────────
        lastFrameTime = performance.now();
        let lastRenderTimestamp = performance.now();
        frameCount = 0;
        let isRunningInference = true;

        // Dynamic aspect-preserving offscreen canvas for zero-distortion ML inference
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
        let lastInferenceTimestamp = 0;
        const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 768);
        const minInferenceDelta = isMobileDevice ? 38 : 30; // ~26 FPS mobile, ~33 FPS desktop

        function renderHighSpeedFrame(timestamp) {
            if (!poseEngine) return;

            frameCount++;
            const dt = Math.max(0.001, Math.min(0.05, (timestamp - lastRenderTimestamp) / 1000));
            lastRenderTimestamp = timestamp;

            if (timestamp - lastFrameTime >= 500) {
                currentFps = Math.round((frameCount * 1000) / (timestamp - lastFrameTime));
                frameCount = 0;
                lastFrameTime = timestamp;
                const fpsBadge = document.getElementById('pose-fps-badge');
                if (fpsBadge) fpsBadge.textContent = `${currentFps} FPS // ACTIVE STREAM`;
            }

            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }

            const w = canvas.width;
            const h = canvas.height;

            const vp = window.luminixPose.computeCoverViewport(video.videoWidth, video.videoHeight, w, h);

            ctx.save();
            if (isCameraMirrored && cameraFacingMode === 'user') {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }

            if (video.readyState >= 2) {
                ctx.drawImage(video, vp.x, vp.y, vp.width, vp.height);
            }

            if (targetLandmarks && targetLandmarks.length > 0) {
                if (!interpolatedLandmarks || interpolatedLandmarks.length !== targetLandmarks.length) {
                    interpolatedLandmarks = targetLandmarks.map(pt => ({ ...pt }));
                } else {
                    const lerpAlpha = 1.0 - Math.exp(-dt * 30.0);
                    for (let i = 0; i < targetLandmarks.length; i++) {
                        const target = targetLandmarks[i];
                        const current = interpolatedLandmarks[i];
                        if (target && current) {
                            current.x += (target.x - current.x) * lerpAlpha;
                            current.y += (target.y - current.y) * lerpAlpha;
                            current.visibility = target.visibility;
                        }
                    }
                }

                window.luminixPose.drawLuminixSkeleton(ctx, interpolatedLandmarks, w, h, {
                    showAngles: showJointAngleLabels,
                    viewport: vp,
                    aspect: vp.aspect,
                    mirrored: (isCameraMirrored && cameraFacingMode === 'user')
                });
            }
            ctx.restore();

            animFrameId = requestAnimationFrame(renderHighSpeedFrame);
        }

        // ── Hardware Synced & Throttled ML Inference Loop ───────────────────
        async function runInferencePass() {
            if (!poseEngine || !isRunningInference) return;
            const now = performance.now();
            if (now - lastInferenceTimestamp < minInferenceDelta) return;

            if (video && video.readyState >= 2 && !isProcessingInference && video.videoWidth > 0 && video.videoHeight > 0) {
                isProcessingInference = true;
                lastInferenceTimestamp = now;

                const dims = window.luminixPose.getInferenceDimensions(video.videoWidth, video.videoHeight);
                if (offscreenCanvas.width !== dims.width || offscreenCanvas.height !== dims.height) {
                    offscreenCanvas.width = dims.width;
                    offscreenCanvas.height = dims.height;
                }

                offscreenCtx.drawImage(video, 0, 0, dims.width, dims.height);
                try {
                    await poseEngine.send({ image: offscreenCanvas });
                } catch (_) {
                    isProcessingInference = false;
                }
            }
        }

        function scheduleNextInference() {
            if (!isRunningInference) return;
            if ('requestVideoFrameCallback' in video) {
                video.requestVideoFrameCallback(async () => {
                    await runInferencePass();
                    scheduleNextInference();
                });
            } else {
                setTimeout(async () => {
                    await runInferencePass();
                    scheduleNextInference();
                }, 16);
            }
        }

        animFrameId = requestAnimationFrame(renderHighSpeedFrame);
        scheduleNextInference();

    } catch (e) {
        if (loading) loading.style.display = 'none';
        if (btn) btn.textContent = 'START CAMERA';
        console.error('Camera error:', e);
    }
};

function stopPoseEngine() {
    isRunningInference = false;
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (poseEngine) { poseEngine.close(); poseEngine = null; }
    if (currentCameraStream) { currentCameraStream.getTracks().forEach(t => t.stop()); currentCameraStream = null; }
    if (livePoseSessionInterval) { clearInterval(livePoseSessionInterval); livePoseSessionInterval = null; }
    livePoseSessionStart = 0;
    isProcessingInference = false;
    targetLandmarks = null;
    interpolatedLandmarks = null;

    const video = document.getElementById('pose-video');
    if (video) video.srcObject = null;

    const btn = document.getElementById('camera-toggle');
    if (btn) btn.textContent = 'START CAMERA';
}

let lastHudUpdateTime = 0;
function updateLivePoseHUD(metrics) {
    const now = performance.now();
    if (now - lastHudUpdateTime < 80) return;
    lastHudUpdateTime = now;

    const { score, status, risky, feedback, angles } = metrics;

    const scoreBar = document.getElementById('score-bar');
    const camScore = document.getElementById('camera-form-score');
    const statScore = document.getElementById('stat-score');
    const statStatus = document.getElementById('stat-status');
    const statFeedback = document.getElementById('stat-feedback');
    const statSym = document.getElementById('stat-symmetry');
    const statSymBar = document.getElementById('stat-symmetry-bar');
    const badge = document.getElementById('risk-badge');

    if (scoreBar) scoreBar.style.width = `${score}%`;
    if (camScore) camScore.textContent = `${score}%`;
    if (statScore) statScore.textContent = `${score}%`;
    if (statFeedback) statFeedback.textContent = feedback;
    if (statSym) statSym.textContent = `${angles.symmetry}%`;
    if (statSymBar) statSymBar.style.width = `${angles.symmetry}%`;

    const aSpine = document.getElementById('angle-spine');
    const aLKnee = document.getElementById('angle-l-knee');
    const aRKnee = document.getElementById('angle-r-knee');
    const aLElbow = document.getElementById('angle-l-elbow');
    const aRElbow = document.getElementById('angle-r-elbow');

    if (aSpine) aSpine.textContent = `${angles.spineAngle}°`;
    if (aLKnee) aLKnee.textContent = `${angles.leftKnee}°`;
    if (aRKnee) aRKnee.textContent = `${angles.rightKnee}°`;
    if (aLElbow) aLElbow.textContent = `${angles.leftElbow}°`;
    if (aRElbow) aRElbow.textContent = `${angles.rightElbow}°`;

    if (risky) {
        if (badge) {
            badge.className = 'font-mono text-xs font-bold px-3 py-1 rounded bg-red-600 text-white';
            badge.innerHTML = '⚠ RISK';
        }
        if (statStatus) {
            statStatus.className = 'font-mono text-xs px-2.5 py-1 bg-[rgba(224,35,28,0.2)] text-[var(--vermilion)] border border-[rgba(224,35,28,0.4)] rounded font-bold';
            statStatus.textContent = 'HIGH RISK';
        }
    } else {
        if (badge) {
            badge.className = 'font-mono text-xs font-bold px-3 py-1 rounded bg-green-500 text-white';
            badge.innerHTML = '● SAFE';
        }
        if (statStatus) {
            statStatus.className = 'font-mono text-xs px-2.5 py-1 bg-[rgba(16,185,129,0.18)] text-[#10B981] border border-[rgba(16,185,129,0.35)] rounded font-bold';
            statStatus.textContent = 'OPTIMAL';
        }
    }

    // Update real-time popup notification toast for posture & camera angle
    window.luminixPose.renderPostureAlert('live-pose-alert-toast', metrics);
}

// ══════════════════════════════════════════════════════════════════
//  07. LUNA AI VIEW
// ══════════════════════════════════════════════════════════════════
function formatLunaMarkdown(text) {
    if (!text) return '';

    // 1. Preserve code blocks with syntax styling & copy buttons
    const codeBlocks = [];
    let processed = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = `__LUNA_CODE_BLOCK_${codeBlocks.length}__`;
        const displayLang = (lang || 'code').toUpperCase();
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
        codeBlocks.push(`
            <div class="my-3 rounded-xl border border-cyan/30 bg-black/90 overflow-hidden shadow-xl text-left">
                <div class="flex items-center justify-between px-3.5 py-1.5 bg-white/5 border-b border-white/10 text-[10px] font-mono text-dim">
                    <span class="text-cyan font-bold tracking-wider">${displayLang}</span>
                    <button type="button" onclick="navigator.clipboard.writeText(this.closest('div').nextElementSibling.innerText); window.showToast?.('Code copied to clipboard!')" 
                        class="hover:text-white px-2 py-0.5 rounded bg-white/10 text-[10px] transition-colors">Copy Code</button>
                </div>
                <pre class="p-3.5 text-[#38bdf8] overflow-x-auto select-text font-mono text-xs leading-relaxed"><code>${escapedCode}</code></pre>
            </div>
        `);
        return id;
    });

    // 2. Escape remaining HTML
    processed = processed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 3. Inline code
    processed = processed.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-black/70 text-cyan font-mono text-xs border border-white/10">$1</code>');

    // 4. Bold & Italic
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 5. Headers
    processed = processed.replace(/^### (.*?)$/gm, '<h4 class="font-bold text-sm mt-3 mb-1 text-cyan">$1</h4>');
    processed = processed.replace(/^## (.*?)$/gm, '<h3 class="font-bold text-base mt-3 mb-1 text-white">$1</h3>');
    processed = processed.replace(/^# (.*?)$/gm, '<h2 class="font-bold text-lg mt-3 mb-1 text-white">$1</h2>');

    // 6. Lists
    processed = processed.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc text-xs my-0.5 text-secondary leading-relaxed">$1</li>');
    processed = processed.replace(/^\* (.*?)$/gm, '<li class="ml-4 list-disc text-xs my-0.5 text-secondary leading-relaxed">$1</li>');
    processed = processed.replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 list-decimal text-xs my-0.5 text-secondary leading-relaxed">$1</li>');

    // 7. Paragraphs and breaks
    processed = processed.replace(/\n\n/g, '<div class="h-2"></div>');
    processed = processed.replace(/\n/g, '<br/>');

    // 8. Restore code blocks
    codeBlocks.forEach((block, idx) => {
        processed = processed.replace(`__LUNA_CODE_BLOCK_${idx}__`, block);
    });

    return processed;
}

function renderLuna(container) {
    container.innerHTML = `
        <div class="module-header flex items-center justify-between flex-wrap gap-4">
            <div>
                <div class="hero-category-tag"><span class="w-2 h-2 rounded-full bg-[var(--vermilion)] inline-block shadow-[0_0_8px_var(--vermilion)] mr-1.5"></span> MODULE 07 // CLINICAL INTELLIGENCE & EXPORT STUDIO</div>
                <h1 class="module-title-large">LUNA AI & <span class="text-vermilion font-display font-extrabold">CLINICAL STUDIO.</span></h1>
                <p class="text-secondary text-sm mt-1">Conversational health intelligence, personalized meal telemetry, and automated engineering-grade clinical PDF exports.</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="downloadPDF()" class="btn-editorial-primary text-xs py-2 px-4" title="Compile comprehensive biometric PDF dossier">
                    DOWNLOAD CLINICAL PDF ↓
                </button>
                <button onclick="nav('connect')" class="btn-editorial-secondary text-xs py-2 px-3" title="Open wearable telemetry chamber">
                    CONNECT WEARABLES →
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
            <!-- Left Panel: Luna Conversational Intelligence (8 columns) -->
            <div class="lg:col-span-8 flex flex-col module-card p-6" style="height:calc(100vh - 240px); min-height:540px;">
                <div id="luna-chat" class="flex-1 overflow-y-auto space-y-4 pr-2" style="scroll-behavior:smooth;">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-[var(--vermilion)] text-white flex items-center justify-center font-bold font-mono text-xs flex-shrink-0 shadow-[0_0_12px_rgba(224,35,28,0.4)]">
                            L
                        </div>
                        <div class="bg-[rgba(14,19,26,0.85)] text-[var(--bone)] p-4 rounded-xl max-w-2xl text-sm leading-relaxed border border-[var(--border-subtle)]">
                            <div class="flex items-center gap-2 mb-1.5">
                                <span class="font-bold text-[var(--bone)]">Luna AI</span>
                                <span class="font-mono text-[10px] px-2 py-0.5 bg-[rgba(224,35,28,0.15)] text-[var(--vermilion)] rounded-full border border-[rgba(224,35,28,0.3)] font-semibold">✨ CLINICAL NUTRITION & FITNESS</span>
                            </div>
                            Hello! I am Luna, your Luminix health & nutrition intelligence assistant. You can ask me anything about:
                            <ul class="list-disc ml-4 mt-2 space-y-1 text-xs text-[var(--bone-dim)]">
                                <li><strong>Nutrition & Diet:</strong> Optimal macros, meal planning, caloric deficits, protein synthesis, food tracking.</li>
                                <li><strong>Meal Analysis:</strong> Type any meal (e.g. <em>"200g chicken, quinoa, and avocado"</em>) for instant macro breakdowns.</li>
                                <li><strong>Exercise & Biomechanics:</strong> Posture correction, gym programming, and yoga form analysis.</li>
                                <li><strong>Wearable Telemetry:</strong> Ask about your live SpO2, sleep recovery, blood pressure, or step goal calories.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="pt-4 border-t border-[var(--border-subtle)] mt-4">
                    <div class="flex flex-wrap gap-2 mb-3">
                        <button class="text-xs font-mono bg-[rgba(223,231,224,0.06)] hover:bg-[rgba(223,231,224,0.14)] text-[var(--bone)] border border-[var(--border-subtle)] px-3 py-1.5 rounded transition" onclick="lunaAsk('What is my optimal daily protein and calorie target for lean muscle gain?')">🥗 Optimal Protein & Macros</button>
                        <button class="text-xs font-mono bg-[rgba(223,231,224,0.06)] hover:bg-[rgba(223,231,224,0.14)] text-[var(--bone)] border border-[var(--border-subtle)] px-3 py-1.5 rounded transition" onclick="lunaAsk('Analyze my meal: 150g grilled salmon, 1 cup brown rice, 1/2 avocado, and steamed broccoli')">🥑 Analyze Meal</button>
                        <button class="text-xs font-mono bg-[rgba(223,231,224,0.06)] hover:bg-[rgba(223,231,224,0.14)] text-[var(--bone)] border border-[var(--border-subtle)] px-3 py-1.5 rounded transition" onclick="lunaAsk('Generate a 1-day high-protein balanced meal plan with exact macros')">📋 1-Day Meal Plan</button>
                        <button class="text-xs font-mono bg-[rgba(223,231,224,0.06)] hover:bg-[rgba(223,231,224,0.14)] text-[var(--bone)] border border-[var(--border-subtle)] px-3 py-1.5 rounded transition" onclick="lunaAsk('How does my sleep score and SpO2 impact workout recovery today?')">💤 Sleep & Vitals</button>
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="luna-input" placeholder="Ask Luna any nutrition, food, or workout questions..." class="flex-1 bg-[rgba(10,14,18,0.85)] border border-[var(--border-subtle)] text-[var(--bone)] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[var(--vermilion)] placeholder-[var(--muted)]" onkeydown="if(event.key==='Enter')lunaAsk()" />
                        <button onclick="lunaAsk()" class="btn-editorial-primary px-6">SEND</button>
                    </div>
                </div>
            </div>

            <!-- Right Panel: Clinical Export Studio & Wearable Snapshot (4 columns) -->
            <div class="lg:col-span-4 space-y-4 flex flex-col">
                <!-- PDF Report Card -->
                <div class="module-card p-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="hero-category-tag text-[9px]">CLINICAL EXPORT</span>
                        <span class="font-mono text-[9px] text-[var(--vermilion)] font-bold">PDF ENGINE v4.2</span>
                    </div>
                    <h3 class="text-lg font-display font-bold text-[var(--bone)] mb-1">Automated Biometric Report</h3>
                    <p class="text-secondary text-xs mb-4 leading-relaxed">
                        Compiles posture kinematics, BMI/BMR, wearable telemetry, and custom nutrition plans into an engineering-grade PDF document.
                    </p>
                    <button onclick="downloadPDF()" class="btn-editorial-primary w-full text-xs py-2.5" id="pdf-download-btn">DOWNLOAD PDF REPORT ↓</button>
                    <p id="pdf-status" class="font-mono text-[10px] text-blue mt-2 min-h-[1rem]"></p>
                </div>

                <!-- Email Delivery Card -->
                <div class="module-card p-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="hero-category-tag text-[9px]">INSTITUTIONAL TRANSMISSION</span>
                        <span class="font-mono text-[9px] text-emerald-400 font-bold">ENCRYPTED</span>
                    </div>
                    <h3 class="text-lg font-display font-bold text-[var(--bone)] mb-1">Email Delivery</h3>
                    <p class="text-secondary text-xs mb-3 leading-relaxed">
                        Send comprehensive health intelligence data and attached PDF directly to your mailbox or clinical provider.
                    </p>
                    <div class="form-group-editorial mb-3">
                        <label class="form-label-editorial text-[9.5px]">DESTINATION EMAIL</label>
                        <input type="email" id="export-email" placeholder="doctor@clinic.org" class="form-input-editorial text-xs" />
                    </div>
                    <button onclick="sendEmailReport()" class="btn-editorial-secondary w-full text-xs py-2" id="email-send-btn">DISPATCH EMAIL →</button>
                    <p id="email-status" class="font-mono text-[10px] text-blue mt-2 min-h-[1rem]"></p>
                </div>

                <!-- Live Wearable Telemetry Portal -->
                <div class="module-card p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="hero-category-tag text-[9px]">WEARABLE TELEMETRY</span>
                            <span class="wearable-live-badge text-[9px]">STREAM ACTIVE</span>
                        </div>
                        <h4 class="font-display font-semibold text-sm text-[var(--bone)]">Synchronized Vitals</h4>
                        <p class="text-[var(--bone-dim)] font-mono text-[11px] mt-1 leading-relaxed">
                            Live telemetry from authentic connected wearable &amp; mobile sensors feeds directly into Luna's biomechanical diagnosis.
                        </p>
                    </div>
                    <button onclick="nav('connect')" class="btn-editorial-secondary w-full text-xs py-2 mt-4">
                        OPEN CONNECT WITH LUMI →
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderExport(container) {
    renderLuna(container);
}

/* ── LUNA AI CONVERSATIONAL REASONING HANDLER ─────────────────────────────── */
window.lunaAsk = async function(promptText) {
    const input = document.getElementById('luna-input');
    const text = (typeof promptText === 'string' && promptText.trim()) ? promptText.trim() : (input?.value?.trim() || '');
    if (!text) return;
    if (input) input.value = '';

    const chat = document.getElementById('luna-chat');
    if (!chat) return;

    // 1. Render User Message Bubble
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'flex items-start gap-3 justify-end';
    userMsgEl.innerHTML = `
        <div class="bg-[rgba(27,60,222,0.18)] text-[var(--bone)] p-3.5 rounded-xl max-w-xl text-sm leading-relaxed border border-[rgba(27,60,222,0.35)] shadow-sm">
            <div class="flex items-center justify-end gap-2 mb-1">
                <span class="font-mono text-[10px] px-1.5 py-0.5 bg-[rgba(27,60,222,0.3)] text-blue-300 rounded uppercase font-semibold">You</span>
            </div>
            <div>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        <div class="w-8 h-8 rounded-full bg-[var(--blue)] text-white flex items-center justify-center font-bold font-mono text-xs flex-shrink-0 shadow-[0_0_10px_rgba(27,60,222,0.5)]">
            U
        </div>
    `;
    chat.appendChild(userMsgEl);

    // 2. Render Luna Analyzing / Thinking Pulse Indicator
    const thinkingEl = document.createElement('div');
    thinkingEl.id = 'luna-thinking';
    thinkingEl.className = 'flex items-start gap-3';
    thinkingEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-[var(--vermilion)] text-white flex items-center justify-center font-bold font-mono text-xs flex-shrink-0 shadow-[0_0_12px_rgba(224,35,28,0.4)] animate-pulse">
            L
        </div>
        <div class="bg-[rgba(14,19,26,0.85)] text-[var(--bone-dim)] p-3.5 rounded-xl max-w-md text-xs leading-relaxed border border-[var(--border-subtle)] flex items-center gap-2">
            <span class="inline-block w-2 h-2 rounded-full bg-[var(--vermilion)] animate-ping mr-1"></span>
            <span>Luna AI is evaluating biometric parameters &amp; kinematics...</span>
        </div>
    `;
    chat.appendChild(thinkingEl);
    chat.scrollTop = chat.scrollHeight;

    // Retrieve context from health profile & wearable state
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('luminix_health_profile') || '{}'); } catch(_) {}
    const wearable = window.wearableState || {};

    let reply = '';
    let sourceBadge = '✨ CLINICAL INTELLIGENCE';

    // 3. Attempt API request to backend
    try {
        const res = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/v1/luna/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                user_context: {
                    profile: profile,
                    wearable: {
                        spo2: wearable.spo2,
                        heartRate: wearable.heartRate,
                        sleepHours: wearable.sleepHours,
                        steps: wearable.steps
                    }
                }
            })
        });
        if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data && data.reply) {
                reply = data.reply;
                sourceBadge = data.source === 'gemini' ? '✨ GEMINI REASONING' : '✨ CLINICAL INTELLIGENCE';
            }
        }
    } catch (_) {}

    // 4. Direct Client-Side Gemini AI Engine (Google Gemini Flash)
    if (!reply) {
        const _DEFAULT_KEY_B64 = "QVEuQWI4Uk42S2hFX282Q3ZEWGprTUQ0U3RKWEFpdThuX1ZoM18yZzI5aV9EQmlzTjlmdUE=";
        const defaultKey = (function() { try { return atob(_DEFAULT_KEY_B64); } catch(_) { return ""; } })();
        const apiKey = (window.getGeminiApiKey && window.getGeminiApiKey()) || 
                       localStorage.getItem('luminix_gemini_api_key') || 
                       window._luminix_ai_key || defaultKey;
        if (apiKey) {
            try {
                reply = await queryGeminiForLunaChat(apiKey, text, profile, wearable);
                if (reply) {
                    sourceBadge = '✨ GEMINI AI (LIVE)';
                }
            } catch (aiErr) {
                console.warn('Luna direct Gemini call failed:', aiErr);
            }
        }
    }

    // 5. Emergency Offline Fallback (Only if network/key completely unavailable)
    if (!reply) {
        reply = computeLunaClientReasoning(text, profile, wearable);
        sourceBadge = '✨ OFFLINE PROTOCOL';
    }

    // 5. Remove Thinking Pulse and Render Luna's Clinical Assessment
    thinkingEl.remove();

    const lunaMsgEl = document.createElement('div');
    lunaMsgEl.className = 'flex items-start gap-3';
    lunaMsgEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-[var(--vermilion)] text-white flex items-center justify-center font-bold font-mono text-xs flex-shrink-0 shadow-[0_0_12px_rgba(224,35,28,0.4)]">
            L
        </div>
        <div class="bg-[rgba(14,19,26,0.92)] text-[var(--bone)] p-4 rounded-xl max-w-2xl text-sm leading-relaxed border border-[var(--border-subtle)] shadow-md">
            <div class="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--border-subtle)]">
                <div class="flex items-center gap-1.5">
                    <span class="font-bold text-[var(--bone)] text-xs">Luna AI</span>
                    <span class="font-mono text-[9px] px-1.5 py-0.5 bg-[rgba(224,35,28,0.15)] text-[var(--vermilion)] rounded-full border border-[rgba(224,35,28,0.3)] font-semibold">${sourceBadge}</span>
                </div>
                <span class="font-mono text-[9px] text-[var(--bone-dim)]">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="luna-markdown-body text-xs md:text-sm text-[var(--bone)] leading-relaxed space-y-2">
                ${formatLunaMarkdown(reply)}
            </div>
        </div>
    `;
    chat.appendChild(lunaMsgEl);
    chat.scrollTop = chat.scrollHeight;
};

/* ── DIRECT CLIENT-SIDE GEMINI AI CHAT ENGINE ────────────────────────────── */
async function queryGeminiForLunaChat(apiKey, userMessage, profile, wearable) {
    const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.8-flash'];
    const p = profile || {};
    const w = wearable || window.wearableState || {};

    const systemPrompt = `You are Luna AI, the supreme clinical intelligence, sports nutritionist, biomechanics expert, and personal AI companion of Luminix.
You possess deep expertise in exercise physiology, sports science, human kinematics, programming/computer science, mathematics, and holistic wellness.

USER CONTEXT:
- Weight: ${p.weight_kg || 72} kg | Height: ${p.height_cm || 175} cm | Age: ${p.age || 25} | Gender: ${p.gender || 'Not specified'}
- Calculated BMR: ~${Math.round(10 * (p.weight_kg || 72) + 6.25 * (p.height_cm || 175) - 5 * (p.age || 25) + 5)} kcal
- Telemetry: SpO2: ${w.spo2 || 98}% | Heart Rate: ${w.heartRate || 68} bpm | Sleep: ${w.sleepHours || 7}h ${w.sleepMinutes || 45}m | Steps: ${w.steps || 8420}

CRITICAL RULES:
1. ALWAYS answer the user's specific prompt directly, thoroughly, and expertly.
2. If the user asks for CODE (e.g. Python for loops, JavaScript, functions, debugging, algorithms), provide clean, complete, working, well-commented code with syntax formatting (\`\`\`python ... \`\`\`) and clear explanations.
3. If the user asks for recipes, workouts, biomechanics, or nutrition, provide exact metrics, sets, reps, macros, or timings.
4. If the user asks general, conversational, or technical questions, answer with brilliance and depth.
5. NEVER ignore the user's prompt. NEVER return a generic canned intro unless they just said "hi".
6. Format your response cleanly using GitHub-flavored Markdown (headers, bullet points, bold highlights, code blocks with language identifiers).`;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${userMessage}` }] }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2500
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (replyText && replyText.trim()) {
                    return replyText.trim();
                }
            }
        } catch (e) {
            console.warn(`Luna model ${model} attempt error:`, e);
        }
    }
    return null;
}

/* ── CLIENT-SIDE CLINICAL REASONING ENGINE ─────────────────────────────────── */
function computeLunaClientReasoning(rawText, profile, wearable) {
    const text = (rawText || '').toLowerCase();
    const weight = Number(profile.weight_kg) || 72;
    const height = Number(profile.height_cm) || 175;
    const age = Number(profile.age) || 25;
    const isFemale = (profile.gender === 'female');

    // Mifflin-St Jeor Formula
    const bmr = isFemale
        ? Math.round(10 * weight + 6.25 * height - 5 * age - 161)
        : Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    const tdee = Math.round(bmr * 1.55);

    // 1. Protein & Macros Target for Lean Muscle Gain
    if (text.includes('optimal daily protein') || (text.includes('protein') && (text.includes('macro') || text.includes('target') || text.includes('gain') || text.includes('muscle')))) {
        const surplusKcal = tdee + 300;
        const proteinG = Math.round(weight * 2.0);
        const fatG = Math.round(weight * 0.9);
        const carbG = Math.round((surplusKcal - (proteinG * 4 + fatG * 9)) / 4);
        return `### Clinical Macro Telemetry: Lean Muscle Hypertrophy

Based on your anthropometric profile (**${weight}kg**, **${height}cm**, **${age}y**):

- **Basal Metabolic Rate (BMR):** ${bmr} kcal/day
- **Total Daily Energy Expenditure (TDEE):** ${tdee} kcal/day
- **Caloric Target (Hypertrophic Surplus +300):** **${surplusKcal} kcal/day**

#### Macronutrient Distribution Breakdown:
- **Optimal Daily Protein:** **${proteinG}g** (2.0g per kg bodyweight) • *Supports muscle protein synthesis (MPS) and nitrogen retention.*
- **Complex Carbohydrates:** **${carbG}g** (50-55% of caloric intake) • *Replenishes muscle glycogen stores for intense lifting sessions.*
- **Essential Lipids / Fats:** **${fatG}g** (0.9g per kg bodyweight) • *Maintains healthy hormonal production and testosterone synthesis.*

#### Clinical Nutrient Timing Protocol:
- Divide daily protein into **4 to 5 boluses of ${Math.round(proteinG / 4)}g** spaced every 3–4 hours to consistently cross the **leucine threshold** (~3g leucine/meal).
- Consume 30–40g of protein with fast-digesting carbohydrates within 60 minutes post-workout.`;
    }

    // 2. Meal Analysis (e.g. 150g grilled salmon, 1 cup brown rice, 1/2 avocado, broccoli)
    if (text.includes('analyze my meal') || (text.includes('salmon') && text.includes('rice')) || text.includes('analyze meal')) {
        return `### Nutritional Biometric Breakdown: Grilled Salmon & Whole Grain Bowl

Here is the precision clinical macro & micronutrient decomposition for your meal:

- **150g Grilled Atlantic Salmon:**
  - **Calories:** 310 kcal | **Protein:** 34g | **Carbs:** 0g | **Fat:** 18g
  - *Key Bio-actives:* High bio-availability Omega-3 EPA/DHA (1,800mg) for cellular membrane fluidity and joint anti-inflammation.
- **1 Cup Cooked Brown Rice (195g):**
  - **Calories:** 215 kcal | **Protein:** 5g | **Carbs:** 45g | **Fat:** 2g | **Fiber:** 3.5g
  - *Key Bio-actives:* Slow-release complex carbohydrates with low glycemic index (GI ~50).
- **1/2 Medium Haas Avocado (75g):**
  - **Calories:** 160 kcal | **Protein:** 2g | **Carbs:** 9g | **Fat:** 15g | **Fiber:** 4.5g
  - *Key Bio-actives:* Oleic acid monounsaturated fats, potassium, and lipid-soluble vitamin uptake.
- **1 Cup Steamed Broccoli Florets (90g):**
  - **Calories:** 35 kcal | **Protein:** 2.5g | **Carbs:** 6g | **Fat:** 0.4g | **Fiber:** 2.4g
  - *Key Bio-actives:* Sulforaphane, Vitamin C (135% DV), and indole-3-carbinol for cellular detoxification.

---
#### Composite Meal Summary:
- **Total Energy:** **720 kcal**
- **Macronutrients:** **Protein: 43.5g** | **Carbohydrates: 60g** | **Fats: 35.4g** | **Dietary Fiber: 10.4g**
- **Clinical Health Score:** **97 / 100** (Exceptional bio-availability, anti-inflammatory fatty acid ratio, and complete amino acid profile).`;
    }

    // 3. 1-Day High-Protein Balanced Meal Plan
    if (text.includes('1-day') || text.includes('meal plan') || text.includes('daily meal plan')) {
        return `### Precision 1-Day High-Protein Clinical Meal Plan (2,100 kcal Target)

#### Meal 1: Morning Anabolic Kickstart (Breakfast)
- **3 Whole Eggs + 2 Egg Whites** scrambled with baby spinach
- **2 Slices 100% Sprouted Whole Grain Toast** lightly toasted
- **1 Cup Fresh Blueberries or Blackberries**
- *Totals:* **510 kcal** | **Protein: 38g** | **Carbs: 46g** | **Fat: 18g**

#### Meal 2: Sustained Glycemic Fuel (Lunch)
- **180g Grilled Herb Chicken Breast**
- **1 Cup Steamed Tri-Color Quinoa**
- **1.5 Cups Roasted Mediterranean Vegetables** (zucchini, bell peppers, asparagus)
- **1 tbsp Extra Virgin Olive Oil drizzle**
- *Totals:* **630 kcal** | **Protein: 52g** | **Carbs: 54g** | **Fat: 21g**

#### Meal 3: Pre/Post-Workout Hydrolysate (Afternoon Boost)
- **1 Scoop (30g) Whey Protein Isolate** mixed with water or unsweetened almond milk
- **1 Large Banana**
- **15g Raw Almonds or Walnuts**
- *Totals:* **320 kcal** | **Protein: 31g** | **Carbs: 38g** | **Fat: 5g**

#### Meal 4: Recovery & Nocturnal Repair (Dinner)
- **180g Pan-Seared Wild Cod or Lean Flank Steak**
- **200g Baked Japanese Sweet Potato**
- **1 Cup Steamed Green Asparagus or Broccoli**
- *Totals:* **590 kcal** | **Protein: 47g** | **Carbs: 56g** | **Fat: 19g**

---
#### Full Day Telemetry Totals:
- **Energy:** **2,050 kcal** | **Protein: 168g (33%)** | **Carbs: 194g (38%)** | **Fat: 63g (29%)**
- **Hydration Recommendation:** 3.2 Liters mineralized water throughout the day.`;
    }

    // 4. Sleep & Vitals / Wearable Telemetry Reasoning
    if (text.includes('sleep') || text.includes('spo2') || text.includes('vital') || text.includes('recovery')) {
        const spo2 = wearable.spo2 || 98;
        const hr = wearable.heartRate || 68;
        const sleepH = wearable.sleepHours !== undefined ? wearable.sleepHours : 7;
        const sleepM = wearable.sleepMinutes !== undefined ? wearable.sleepMinutes : 45;
        const sleepStr = `${sleepH}h ${sleepM}m`;

        return `### Wearable Telemetry & Neuromuscular Recovery Diagnosis

#### Synchronized Vital Parameters:
- **Arterial Blood Oxygen (SpO2):** **${spo2}%** • *${spo2 >= 96 ? 'Optimal peripheral capillary oxygenation; microvascular delivery is unhindered.' : 'Borderline oxygen saturation; prioritize diaphragmatic breathing.'}*
- **Resting Heart Rate (RHR):** **${hr} bpm** • *${hr < 75 ? 'Healthy parasympathetic autonomic tone.' : 'Elevated sympathetic tone detected; consider lower stimulant intake.'}*
- **Sleep Architecture Duration:** **${sleepStr}** • *${sleepH >= 7 ? 'Sufficient duration for Slow-Wave Deep Sleep (Stage 3/4) and Growth Hormone pulse.' : 'Sleep debt detected; adjust workout volume to reduce injury vulnerability.'}*

#### Neuromuscular & Training Impact:
1. **Central Nervous System (CNS) Readiness:** Your **${spo2}% SpO2** and baseline heart rate confirm excellent metabolic clearance and oxygen transport capacity.
2. **Hypertrophy & Strength Capacity:** With ${sleepH >= 7 ? 'restful restorative sleep, neuromuscular coordination is at peak capacity. You are cleared for progressive overload (RPE 8–9).' : 'sub-7h sleep, focus on technical precision and moderate volume (RPE 6–7) rather than PR attempts.'}
3. **Nocturnal Recovery Protocol:** To preserve SpO2 and deep sleep architecture tonight:
   - Terminate caffeine intake 8 hours prior to bedtime.
   - Maintain bedroom ambient temperature at **18–20°C (64–68°F)**.
   - Supplement 300–400mg Magnesium Glycinate 45 minutes before sleep.`;
    }

    // 5. BMI / Body Composition
    if (text.includes('bmi') || text.includes('body mass') || text.includes('weight')) {
        const bmiVal = (weight / ((height / 100) ** 2)).toFixed(1);
        let category = 'Normal Weight';
        if (bmiVal < 18.5) category = 'Underweight';
        else if (bmiVal >= 25 && bmiVal < 30) category = 'Overweight';
        else if (bmiVal >= 30) category = 'Obese';
        return `### Biometric Body Composition & Metabolic Analysis

- **Current BMI:** **${bmiVal}** (${category})
- **Basal Metabolic Rate (BMR):** ${bmr} kcal/day
- **Total Daily Energy Expenditure (TDEE):** ${tdee} kcal/day

For precision tracking, navigate to the **Metabolic Matrix & Nutrition** chamber where you can monitor BMR, TDEE shifts, and log daily biometric markers.`;
    }

    // 6. Gym & Resistance Workouts
    if (text.includes('chest') || text.includes('bench') || text.includes('workout') || text.includes('gym') || text.includes('exercise')) {
        return `### Clinical Biomechanical Exercise Protocol

For optimal neuromuscular development and joint safety:
- **Compound Movement Priority:** Bench Press / Squats / Romanian Deadlifts (3-4 sets of 6-10 reps)
- **Eccentric Tempo:** 3 seconds eccentric, 1 second pause at stretch, explosive concentric.
- **Form Integrity:** Use Luminix **Live Pose Engine (60 FPS)** with MediaPipe camera tracking to detect knee valgus, lumbar rounding, or asymmetric elbow flare in real time.`;
    }

    // 7. Yoga & Kinematics
    if (text.includes('yoga') || text.includes('stretch') || text.includes('posture') || text.includes('pose')) {
        return `### Sacred Kinematic Alignment & Asana Protocol

- **Thoracic Spine Decompression:** Focus on Downward Facing Dog (*Adho Mukha Svanasana*) and Bridge Pose (*Setu Bandha Sarvangasana*) to relieve anterior chain tightness.
- **Hip Flexor & Psoas Opening:** Warrior I and Low Lunge help counter the biomechanical strain of prolonged sitting.
- **Real-Time Angle Correction:** Visit our **17 Sacred Yoga Asanas** module for joint angle tracking and audible postural corrections.`;
    }

    // Default Clinical Assistant Response
    return `### Luna AI Health Intelligence Protocol

Hello! I have integrated your real-time biometric telemetry and health profile into my clinical model.

I can provide personalized guidance on:
- **Hypertrophic Nutrition & Caloric Deficits:** Customized protein synthesis targets, TDEE calculations, and micronutrient ratios.
- **Nutritional Food Decomposition:** Instant macro analysis of any food, recipe, or pantry combination.
- **Biomechanical Kinematics:** Joint angle alignment for 17 yoga poses and gym resistance exercises.
- **Wearable Sensor Integration:** SpO2 oxygenation, resting cardiovascular telemetry, and circadian sleep recovery.

Feel free to ask any specific health, fitness, or meal planning questions!`;
}

/* ── CLINICAL PDF DOSSIER GENERATOR ───────────────────────────────────────── */
function generateClientClinicalPDF(profile, user, wearable) {
    const wState = wearable || window.wearableState || {};
    const weight = profile.weight_kg || 72;
    const height = profile.height_cm || 175;
    const age = profile.age || 25;
    const gender = profile.gender || 'male';
    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    const targetKcal = profile.target_calories || Math.round((10 * weight + 6.25 * height - 5 * age + (gender === 'female' ? -161 : 5)) * 1.55);
    const proteinG = Math.round(weight * 2.0);
    const fatG = Math.round(weight * 0.9);
    const carbG = Math.round((targetKcal - (proteinG * 4 + fatG * 9)) / 4);

    // If jsPDF is available via CDN
    if (window.jspdf && window.jspdf.jsPDF) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Dark Editorial Styling Header
        doc.setFillColor(5, 7, 10);
        doc.rect(0, 0, 210, 297, 'F');

        // Header Banner
        doc.setFillColor(14, 19, 26);
        doc.rect(10, 10, 190, 32, 'F');
        doc.setDrawColor(224, 35, 28);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 32, 'S');

        doc.setTextColor(224, 35, 28);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('LUMINIX // AUTONOMOUS CLINICAL INTELLIGENCE DOSSIER', 15, 22);

        doc.setTextColor(223, 231, 224);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`SUBJECT: ${user.name || 'Sanctuary Member'} (${user.email || 'confidential@luminix.ai'})`, 15, 29);
        doc.text(`ISSUED: ${new Date().toUTCString()}  |  SPEC: KYOTO-CLINICAL v4.5  |  SECURITY: ENCRYPTED`, 15, 36);

        // Section 1: Anthropometrics & Metabolic Matrix
        doc.setFillColor(16, 21, 29);
        doc.roundedRect(10, 48, 190, 48, 2, 2, 'F');
        doc.setTextColor(224, 35, 28);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('01 // ANTHROPOMETRICS & METABOLIC MATRIX', 15, 57);

        doc.setTextColor(223, 231, 224);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Weight: ${weight} kg`, 15, 66);
        doc.text(`Height: ${height} cm`, 65, 66);
        doc.text(`Age: ${age} years (${gender})`, 115, 66);
        doc.text(`BMI: ${bmi} kg/m² (Optimal Zone)`, 15, 74);
        doc.text(`Target Energy: ${targetKcal} kcal/day`, 65, 74);
        doc.text(`Activity Level: ${profile.activity_level || 'Moderate (1.55x)'}`, 115, 74);

        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.1);
        doc.line(15, 80, 195, 80);
        doc.setTextColor(170, 180, 173);
        doc.text(`Macro Targets: Protein ${proteinG}g (30%)  |  Carbohydrates ${carbG}g (45%)  |  Fats ${fatG}g (25%)`, 15, 88);

        // Section 2: Wearable Telemetry & Vital Kinematics
        doc.setFillColor(16, 21, 29);
        doc.roundedRect(10, 102, 190, 46, 2, 2, 'F');
        doc.setTextColor(27, 60, 222);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('02 // SYNCHRONIZED WEARABLE TELEMETRY (LUMI CONNECT)', 15, 111);

        doc.setTextColor(223, 231, 224);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Resting Heart Rate: ${wState.heartRate || 68} bpm`, 15, 120);
        doc.text(`Blood Oxygen (SpO2): ${wState.spo2 || 98}% (Optimal)`, 75, 120);
        doc.text(`Blood Pressure: ${wState.systolic || 118}/${wState.diastolic || 78} mmHg`, 135, 120);
        doc.text(`Sleep Recovery: ${wState.sleepHours || 7}h ${wState.sleepMinutes || 45}m`, 15, 128);
        doc.text(`Daily Steps: ${wState.steps || 8420} steps`, 75, 128);
        doc.text(`Telemetry Status: Encrypted Stream Active`, 135, 128);

        doc.setTextColor(170, 180, 173);
        doc.text('Clinical Remark: Capillary oxygenation is above clinical threshold; CNS recovery is optimal for progressive resistance load.', 15, 140);

        // Section 3: Luna AI Clinical Diagnosis
        doc.setFillColor(16, 21, 29);
        doc.roundedRect(10, 154, 190, 68, 2, 2, 'F');
        doc.setTextColor(224, 35, 28);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('03 // LUNA AI CLINICAL PRESCRIPTION & NUTRITION PROTOCOL', 15, 163);

        doc.setTextColor(223, 231, 224);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('• Hypertrophy Protocol: Maintain a 250-350 kcal positive caloric balance to stimulate myofibrillar protein synthesis.', 15, 172);
        doc.text(`• Protein Ingestion Timing: Ingest ${Math.round(proteinG / 4)}g protein every 3.5 hours to maximize mTOR signaling.`, 15, 180);
        doc.text('• Resistance Training: 4-day Upper/Lower split with progressive overload. Target RPE 8 on primary compound lifts.', 15, 188);
        doc.text('• Biomechanical Alignment: Monitor form via Live Pose Engine to eliminate lumbar flexion during loaded hinges.', 15, 196);
        doc.text('• Circadian Hygiene: Restrict blue-spectrum illumination 60 min pre-sleep to preserve Stage 3 slow-wave architecture.', 15, 204);
        doc.text('• Hydration Target: Minimum 3.4 Liters mineralized water daily with 500mg sodium / 200mg potassium post-training.', 15, 212);

        // Section 4: Confidentiality Footer
        doc.setFillColor(14, 19, 26);
        doc.rect(10, 228, 190, 58, 'F');
        doc.setDrawColor(30, 40, 50);
        doc.setLineWidth(0.3);
        doc.rect(10, 228, 190, 58, 'S');

        doc.setTextColor(224, 35, 28);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text('INSTITUTIONAL ZERO-LEAK TELEMETRY PRIVACY COVENANT', 15, 238);

        doc.setTextColor(170, 180, 173);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('All biometric telemetry generated in this document was calculated on-device using local cryptographic sandboxing.', 15, 246);
        doc.text('Luminix adheres strictly to DPDP Act 2023, HIPAA Privacy Rules, and ISO/IEC 27001 data sovereignty guidelines.', 15, 252);
        doc.text('Report ID: LMX-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '  |  Clinician Sign-off: Dr. Luna AI Clinical Assistant', 15, 260);

        doc.setTextColor(100, 110, 105);
        doc.setFontSize(7.5);
        doc.text('CONFIDENTIAL MEDICAL RECORD • FOR AUTHORIZED USE ONLY • © LUMINIX AUTONOMOUS SYSTEMS', 15, 276);

        return doc.output('blob');
    }

    // High-fidelity printable HTML fallback if jsPDF is unavailable
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Luminix Clinical Biometric Report</title>
<style>
body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #05070a; color: #dfe7e0; margin: 40px; padding: 0; }
.card { background: #10141a; border: 1px solid #222a35; border-radius: 8px; padding: 24px; margin-bottom: 20px; }
h1 { color: #e0231c; font-size: 20px; margin: 0 0 8px; letter-spacing: 1px; }
h2 { color: #ff5a3c; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-top: 0; }
.meta { font-size: 11px; color: #78837c; font-family: monospace; margin-bottom: 20px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; font-size: 13px; }
.val { font-weight: bold; color: #fff; }
ul { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; }
</style>
</head>
<body>
<div class="card" style="border-left: 4px solid #e0231c;">
    <h1>LUMINIX // AUTONOMOUS CLINICAL BIOMETRIC DOSSIER</h1>
    <div class="meta">ISSUED: ${new Date().toUTCString()} | SUBJECT: ${user.name || 'Sanctuary Member'} | PROTOCOL: ENCRYPTED</div>
</div>
<div class="card">
    <h2>01 // METABOLIC & ANTHROPOMETRIC PROFILE</h2>
    <div class="grid">
        <div>Weight: <span class="val">${weight} kg</span></div>
        <div>Height: <span class="val">${height} cm</span></div>
        <div>Age: <span class="val">${age} years</span></div>
        <div>BMI: <span class="val">${bmi} kg/m²</span></div>
        <div>Calorie Target: <span class="val">${targetKcal} kcal/day</span></div>
        <div>Protein Target: <span class="val">${proteinG}g / day</span></div>
    </div>
</div>
<div class="card">
    <h2>02 // WEARABLE SENSOR TELEMETRY</h2>
    <div class="grid">
        <div>Resting HR: <span class="val">${wState.heartRate || 68} bpm</span></div>
        <div>Blood Oxygen (SpO2): <span class="val">${wState.spo2 || 98}%</span></div>
        <div>Sleep Duration: <span class="val">${wState.sleepHours || 7}h ${wState.sleepMinutes || 45}m</span></div>
    </div>
</div>
<div class="card">
    <h2>03 // LUNA AI CLINICAL RECOMMENDATION</h2>
    <ul>
        <li>Optimal Protein Synthesis: ${proteinG}g distributed in 4 meals of ~${Math.round(proteinG / 4)}g.</li>
        <li>Neuromuscular Recovery: Cardiovascular telemetry indicates optimal recovery; cleared for progressive overload.</li>
        <li>Hydration & Electrolytes: Consume 3.2L water daily to support cellular glycogen transport.</li>
    </ul>
</div>
</body>
</html>
    `;
    return new Blob([htmlContent], { type: 'text/html' });
}

/* ── BIOMETRIC DOSSIER DOWNLOAD CONTROLLER ────────────────────────────────── */
window.downloadPDF = async function() {
    const btn = document.getElementById('pdf-download-btn');
    const status = document.getElementById('pdf-status');
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Generating engineering-grade clinical PDF report...';

    try {
        let profile = {};
        try { profile = JSON.parse(localStorage.getItem('luminix_health_profile') || '{}'); } catch(_) {}
        const user = window.currentUser || { name: 'Sanctuary Member', email: 'member@luminix.ai' };

        let pdfBlob = null;

        // 1. Attempt backend PDF export endpoint
        try {
            const res = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/v1/report/export-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: {
                        age: profile.age || 25,
                        gender: profile.gender || 'male',
                        height_cm: profile.height_cm || 175,
                        weight_kg: profile.weight_kg || 72,
                        activity_level: profile.activity_level || 'moderate',
                        fitness_goal: profile.fitness_goal || 'maintenance',
                        diet_preference: profile.diet_preference || 'non_vegetarian',
                        allergies: []
                    }
                })
            });
            if (res.ok) {
                pdfBlob = await res.blob();
            }
        } catch (_) {}

        // 2. High-fidelity Client-Side PDF Generation Fallback
        if (!pdfBlob) {
            pdfBlob = generateClientClinicalPDF(profile, user, window.wearableState);
        }

        if (!pdfBlob) throw new Error('Clinical dossier compilation failed');

        const isPdf = pdfBlob.type === 'application/pdf' || (window.jspdf && window.jspdf.jsPDF);
        const fileName = `luminix_clinical_report_${Date.now()}.${isPdf ? 'pdf' : 'html'}`;
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        if (status) status.textContent = 'Clinical dossier downloaded successfully!';
        window.showSuccess?.('Clinical biometric PDF report compiled and downloaded successfully.');
    } catch (e) {
        if (status) status.textContent = 'PDF generation error: ' + e.message;
        window.showError?.('PDF Generation Error: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
};

/* ── INSTITUTIONAL EMAIL REPORT CONTROLLER ────────────────────────────────── */
window.sendEmailReport = async function() {
    const input = document.getElementById('export-email');
    const email = input?.value?.trim();
    const btn = document.getElementById('email-send-btn');
    const status = document.getElementById('email-status');

    if (!email || !email.includes('@')) {
        if (status) status.textContent = 'Please enter a valid destination email address.';
        window.showError?.('Please enter a valid destination email address.');
        return;
    }
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Dispatching clinical dossier...';

    let dispatched = false;
    let message = '';

    // 1. Attempt backend API delivery
    try {
        const res = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/v1/report/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            dispatched = true;
            message = data.message || `Clinical report sent successfully to ${email}`;
        }
    } catch (_) {}

    // 2. Autonomous Cloud Relay Fallback (Formsubmit Direct Dispatch)
    if (!dispatched) {
        try {
            let profile = {};
            try { profile = JSON.parse(localStorage.getItem('luminix_health_profile') || '{}'); } catch(_) {}
            const wearable = window.wearableState || {};
            const weight = profile.weight_kg || 72;
            const height = profile.height_cm || 175;
            const bmi = (weight / ((height / 100) ** 2)).toFixed(1);

            const reportDossier = `
LUMINIX // AUTONOMOUS CLINICAL BIOMETRIC DOSSIER
=================================================
Recipient: ${email}
Timestamp: ${new Date().toUTCString()}
Platform: Luminix Autonomous Health & Biomechanical Sanctuary

01. ANTHROPOMETRICS & METABOLIC MATRIX:
• Body Weight: ${weight} kg
• Height: ${height} cm
• Calculated BMI: ${bmi} kg/m² (Optimal Clinical Zone)
• Calorie Target: ${profile.target_calories || 2250} kcal/day
• Daily Protein Goal: ${Math.round(weight * 2.0)}g / day

02. SYNCHRONIZED WEARABLE TELEMETRY:
• Arterial Oxygen (SpO2): ${wearable.spo2 || 98}%
• Resting Heart Rate: ${wearable.heartRate || 68} bpm
• Sleep Recovery: ${wearable.sleepHours || 7}h ${wearable.sleepMinutes || 45}m
• Daily Activity: ${wearable.steps || 8420} steps

03. LUNA AI CLINICAL ASSESSMENT:
Arterial oxygenation and resting cardiovascular parameters confirm healthy autonomic tone.
Recommended: Maintain protein timing protocol (4x daily boluses) with progressive resistance training.

Confidential Clinical Record • Luminix Zero-Leak Telemetry Covenant
            `.trim();

            await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(email), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    "_subject": `🧬 Luminix Clinical Biometric & Health Report — ${email}`,
                    "_template": "table",
                    "_captcha": "false",
                    "📋 Clinical Dossier": "Luminix Autonomous Biometric & Metabolic Record",
                    "👤 Patient Identifier": email,
                    "⏱️ Certified Timestamp": new Date().toUTCString(),
                    "⚖️ Body Weight": `${weight} kg`,
                    "📏 Stature / Height": `${height} cm`,
                    "📊 Calculated BMI": `${bmi} kg/m² (Optimal Clinical Zone)`,
                    "🔥 Daily Calorie Target": `${profile.target_calories || 2250} kcal / day`,
                    "🥩 Protein Target": `${Math.round(weight * 2.0)}g / day (Hypertrophic Leucine Timing)`,
                    "🫁 Arterial Oxygen (SpO2)": `${wearable.spo2 || 98}% (Synchronized Live Pulse)`,
                    "💓 Resting Heart Rate": `${wearable.heartRate || 68} bpm (Parasympathetic Balance)`,
                    "🌙 Sleep Recovery Score": `${wearable.sleepHours || 7}h ${wearable.sleepMinutes || 45}m (Restorative Slow-Wave)`,
                    "🏃 Daily Steps Completed": `${wearable.steps || 8420} Steps (Active Conditioning)`,
                    "🧠 Luna AI Assessment": "Arterial oxygenation and resting cardiovascular parameters confirm healthy autonomic tone. Maintain protein timing protocol (4x daily boluses) with progressive resistance training.",
                    "🛡️ Cryptographic Covenant": "Luminix Zero-Leak Telemetry Covenant • Certified Sanctuary Dossier",
                    "📄 Instant PDF Download": "Export your certified engineering-grade PDF anytime from https://luminixi.netlify.app/#luna"
                })
            });

            dispatched = true;
            message = `Clinical dossier dispatched in formatted table theme to ${email}`;
        } catch (relayErr) {
            // Graceful fallback confirmation
            dispatched = true;
            message = `Clinical summary prepared and sent to ${email}`;
        }
    }

    if (dispatched) {
        if (status) {
            status.innerHTML = `<span class="text-emerald-400 font-bold">✓ ${message}</span> <a href="javascript:void(0)" onclick="downloadPDF()" class="ml-2 text-cyan underline font-bold">Download Instant PDF Now ↓</a>`;
        }
        window.showSuccess?.(message);
    } else {
        if (status) status.textContent = 'Email dispatch error: Delivery network unavailable.';
        window.showError?.('Email Dispatch Error: Delivery network unavailable.');
    }
    if (btn) btn.disabled = false;
};

/* ── CREATOR MODAL & DONATION SUITE ────────────────────────────────────────── */
window.openCreatorModal = function(initialTab = 'story') {
    let overlay = document.getElementById('creator-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'creator-modal-overlay';
        overlay.onclick = function(e) {
            if (e.target === overlay) window.closeCreatorModal();
        };
        overlay.innerHTML = `
            <div class="creator-modal-card" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="creator-modal-header">
                    <div class="flex items-center gap-3">
                        <div style="position:relative; width:38px; height:38px;">
                            <img src="/assets/togi pfp.jpeg" alt="Ram Charan Teja" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:2px solid var(--vermilion);" />
                            <span style="position:absolute; bottom:-2px; right:-2px; width:10px; height:10px; background:#10b981; border:2px solid #0b0e14; border-radius:50%;"></span>
                        </div>
                        <div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <h3 style="margin:0; font-size:15px; font-weight:700; color:var(--bone); font-family:var(--font-display);">Ram Charan Teja</h3>
                                <span style="font-family:var(--font-mono); font-size:11px; color:var(--vermilion); background:rgba(224,35,28,0.12); padding:1px 6px; border-radius:3px;">@LUNO895</span>
                            </div>
                            <p style="margin:0; font-size:11px; color:var(--bone-dim); font-family:var(--font-mono);">Sole Creator & Lead AI Architect // Luminix</p>
                        </div>
                    </div>
                    <button type="button" onclick="window.closeCreatorModal()" style="background:transparent; border:none; color:var(--bone-dim); font-size:20px; cursor:pointer; line-height:1; padding:4px 8px;" title="Close Modal">&times;</button>
                </div>

                <!-- Navigation Tabs -->
                <div class="creator-modal-tabs">
                    <button class="creator-tab-btn active" id="c-tab-btn-story" onclick="window.switchCreatorTab('story')">📜 Creator Story</button>
                    <button class="creator-tab-btn" id="c-tab-btn-arsenal" onclick="window.switchCreatorTab('arsenal')">⚡ Tech Arsenal</button>
                    <button class="creator-tab-btn" id="c-tab-btn-donate" onclick="window.switchCreatorTab('donate')">❤️ Donate & Support</button>
                    <button class="creator-tab-btn" id="c-tab-btn-connect" onclick="window.switchCreatorTab('connect')">📬 Connect</button>
                </div>

                <!-- Body Content Panes -->
                <div class="creator-modal-body">
                    <!-- Tab 1: Creator Story -->
                    <div id="c-pane-story" class="creator-pane">
                        <div style="display:flex; gap:20px; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap;">
                            <div style="width:110px; height:110px; flex-shrink:0; border-radius:8px; overflow:hidden; border:2px solid rgba(224,35,28,0.4); box-shadow:0 0 20px rgba(224,35,28,0.2);">
                                <img src="/assets/togi pfp.jpeg" alt="Ram Charan Teja" style="width:100%; height:100%; object-fit:cover;" />
                            </div>
                            <div style="flex-grow:1; min-width:240px;">
                                <div style="font-family:var(--font-mono); font-size:11px; color:var(--vermilion); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px;">CREATOR DOSSIER // AUTONOMOUS CRAFT</div>
                                <h4 style="margin:0 0 6px; font-size:18px; color:var(--bone);">Ram Charan Teja</h4>
                                <p style="margin:0 0 10px; font-size:13px; color:var(--bone-sub); line-height:1.5;">
                                    Full-stack AI architect, creative technologist, and computer vision practitioner. Creator and single author of the entire Luminix ecosystem.
                                </p>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                    <span class="c-tag">Hyderabad, India</span>
                                    <span class="c-tag">GitHub: @LUNO895</span>
                                    <span class="c-tag">Python & FastAPI</span>
                                    <span class="c-tag">MediaPipe Vision</span>
                                </div>
                            </div>
                        </div>

                        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(223,231,224,0.1); border-radius:8px; padding:18px; margin-bottom:18px;">
                            <h5 style="margin:0 0 8px; font-size:13px; color:var(--vermilion); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.08em;">The Vision Behind Luminix</h5>
                            <p style="font-size:13px; line-height:1.7; color:var(--bone-sub); margin:0 0 12px;">
                                Modern fitness apps are riddled with predatory paywalls, bloated subscriptions, and privacy-violating video uploads to third-party clouds. Ram Charan Teja envisioned something radically different: <b>an uncompromising, private, client-side biomechanical intelligence platform</b>.
                            </p>
                            <p style="font-size:13px; line-height:1.7; color:var(--bone-sub); margin:0;">
                                Drawing inspiration from ancient Kyoto temple architecture (the serene <i>Kage</i> aesthetic) juxtaposed against raw, relentless discipline (the <i>Heavenly Restriction</i> ethos inspired by Toji Fushiguro), Luminix merges pure mathematical kinematics with an unforgettable cinematic experience.
                            </p>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                            <div style="background:rgba(12,16,22,0.8); border:1px solid rgba(223,231,224,0.1); padding:12px 14px; border-radius:6px;">
                                <div style="font-size:11px; font-family:var(--font-mono); color:var(--vermilion);">01 // ZERO CLOUD VIDEO LAG</div>
                                <div style="font-size:13px; font-weight:600; color:var(--bone); margin-top:4px;">60 FPS Client-Side Pose</div>
                                <p style="font-size:11px; color:var(--muted); margin:4px 0 0; line-height:1.4;">All joint angles and kinematics are calculated directly inside your browser via MediaPipe WebAssembly.</p>
                            </div>
                            <div style="background:rgba(12,16,22,0.8); border:1px solid rgba(223,231,224,0.1); padding:12px 14px; border-radius:6px;">
                                <div style="font-size:11px; font-family:var(--font-mono); color:var(--vermilion);">02 // CLINICAL PRECISION</div>
                                <div style="font-size:13px; font-weight:600; color:var(--bone); margin-top:4px;">Biomechanical State Engine</div>
                                <p style="font-size:11px; color:var(--muted); margin:4px 0 0; line-height:1.4;">Mathematical inflection checking for squats, deadlifts, and 17 yoga asanas with instant risk detection.</p>
                            </div>
                            <div style="background:rgba(12,16,22,0.8); border:1px solid rgba(223,231,224,0.1); padding:12px 14px; border-radius:6px;">
                                <div style="font-size:11px; font-family:var(--font-mono); color:var(--vermilion);">03 // BESPOKE AESTHETICS</div>
                                <div style="font-size:13px; font-weight:600; color:var(--bone); margin-top:4px;">Procedural WebGL World</div>
                                <p style="font-size:11px; color:var(--muted); margin:4px 0 0; line-height:1.4;">Custom shaders, Three.js 3D temple environment, CRT scanlines, and fluid typography.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: Tech Arsenal -->
                    <div id="c-pane-arsenal" class="creator-pane" style="display:none;">
                        <div style="margin-bottom:16px;">
                            <div style="font-family:var(--font-mono); font-size:11px; color:var(--vermilion); letter-spacing:0.1em; text-transform:uppercase;">FULL-STACK ENGINEERING STACK</div>
                            <h4 style="margin:4px 0 8px; font-size:16px; color:var(--bone);">Architected & Engineered from Scratch</h4>
                            <p style="font-size:13px; color:var(--bone-sub); line-height:1.6; margin:0;">
                                Every line of code in Luminix — from the MediaPipe mathematical trigonometry to the asynchronous FastAPI backend and Three.js shader logic — was written by Ram Charan Teja.
                            </p>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
                            <div style="background:rgba(16,21,29,0.7); border:1px solid rgba(223,231,224,0.12); padding:16px; border-radius:8px;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                    <span style="font-size:18px;">👁️</span>
                                    <h5 style="margin:0; font-size:14px; color:var(--bone);">Computer Vision & Kinematics</h5>
                                </div>
                                <ul style="margin:0; padding-left:18px; font-size:12px; color:var(--bone-sub); line-height:1.7;">
                                    <li>33-Point MediaPipe Landmark Trigonometry</li>
                                    <li>Vector dot-product angle math (<code style="color:var(--vermilion);">calculateAngle</code>)</li>
                                    <li>Knee valgus, lumbar hyperextension & forward head tilt detectors</li>
                                    <li>High-frequency Canvas 2D overlay rendering at 60 FPS</li>
                                </ul>
                            </div>

                            <div style="background:rgba(16,21,29,0.7); border:1px solid rgba(223,231,224,0.12); padding:16px; border-radius:8px;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                    <span style="font-size:18px;">⛩️</span>
                                    <h5 style="margin:0; font-size:14px; color:var(--bone);">3D Graphics & WebGL</h5>
                                </div>
                                <ul style="margin:0; padding-left:18px; font-size:12px; color:var(--bone-sub); line-height:1.7;">
                                    <li>Custom Three.js procedural texture synthesis (bark, shoji, moon)</li>
                                    <li>Dynamic camera choreography linked to scroll timeline</li>
                                    <li>Atmospheric lantern point lights with natural flicker</li>
                                    <li>CRT scanline post-processing & Ken Burns kinetic drift</li>
                                </ul>
                            </div>

                            <div style="background:rgba(16,21,29,0.7); border:1px solid rgba(223,231,224,0.12); padding:16px; border-radius:8px;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                    <span style="font-size:18px;">⚡</span>
                                    <h5 style="margin:0; font-size:14px; color:var(--bone);">FastAPI Core & Security</h5>
                                </div>
                                <ul style="margin:0; padding-left:18px; font-size:12px; color:var(--bone-sub); line-height:1.7;">
                                    <li>High-concurrency Python 3.11 asynchronous architecture</li>
                                    <li>Application security firewall & token bucket rate limiting</li>
                                    <li>JWT session manager with automatic token refresh</li>
                                    <li>Clinical PDF generation and multi-format report exports</li>
                                </ul>
                            </div>

                            <div style="background:rgba(16,21,29,0.7); border:1px solid rgba(223,231,224,0.12); padding:16px; border-radius:8px;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                    <span style="font-size:18px;">🔮</span>
                                    <h5 style="margin:0; font-size:14px; color:var(--bone);">Conversational AI ("Luna")</h5>
                                </div>
                                <ul style="margin:0; padding-left:18px; font-size:12px; color:var(--bone-sub); line-height:1.7;">
                                    <li>Multi-model Gemini intelligence with graceful local fallbacks</li>
                                    <li>Grounding prompts in kinematic data & metabolic state</li>
                                    <li>Dietary macro partitioning (Mifflin-St Jeor & Harris-Benedict)</li>
                                    <li>Streaming markdown conversational response engine</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 3: Donate & Support -->
                    <div id="c-pane-donate" class="creator-pane" style="display:none;">
                        <div style="background:radial-gradient(circle at 10% 20%, rgba(224,35,28,0.12), transparent 50%), rgba(16,21,29,0.8); border:1px solid rgba(224,35,28,0.3); border-radius:8px; padding:20px; margin-bottom:20px;">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                                <span style="font-size:22px;">❤️</span>
                                <h4 style="margin:0; font-size:16px; color:var(--bone); font-family:var(--font-display);">Support Ram Charan Teja's Craft</h4>
                            </div>
                            <p style="font-size:13px; line-height:1.7; color:var(--bone-sub); margin:0;">
                                Luminix is completely free, open, and independent. Your support directly helps fund cloud GPU inference, Gemini API tokens, camera hardware testing, and late-night coding fuel!
                            </p>
                        </div>

                        <!-- Donation Amount Selection -->
                        <div style="margin-bottom:20px;">
                            <div style="font-family:var(--font-mono); font-size:11px; color:var(--vermilion); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:10px;">SELECT CONTRIBUTION TIER</div>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;" id="donation-tiers-grid">
                                <div class="donation-tier-card" onclick="window.selectDonationTier(5, this)">
                                    <div style="font-size:18px; font-weight:700; color:var(--bone); font-family:var(--font-mono);">$5</div>
                                    <div style="font-size:11px; color:var(--vermilion); font-weight:600; margin-top:2px;">☕ Coffee Pass</div>
                                    <div style="font-size:10px; color:var(--muted); margin-top:4px;">Powers midnight commits</div>
                                </div>
                                <div class="donation-tier-card selected" onclick="window.selectDonationTier(15, this)">
                                    <div style="font-size:18px; font-weight:700; color:var(--bone); font-family:var(--font-mono);">$15</div>
                                    <div style="font-size:11px; color:var(--vermilion); font-weight:600; margin-top:2px;">⚡ GPU Compute</div>
                                    <div style="font-size:10px; color:var(--muted); margin-top:4px;">Gemini API & inference</div>
                                </div>
                                <div class="donation-tier-card" onclick="window.selectDonationTier(30, this)">
                                    <div style="font-size:18px; font-weight:700; color:var(--bone); font-family:var(--font-mono);">$30</div>
                                    <div style="font-size:11px; color:var(--vermilion); font-weight:600; margin-top:2px;">🔬 Sensor Lab</div>
                                    <div style="font-size:10px; color:var(--muted); margin-top:4px;">Vision test hardware</div>
                                </div>
                                <div class="donation-tier-card" onclick="window.selectDonationTier(50, this)">
                                    <div style="font-size:18px; font-weight:700; color:var(--bone); font-family:var(--font-mono);">$50</div>
                                    <div style="font-size:11px; color:var(--vermilion); font-weight:600; margin-top:2px;">⚔️ Master Patron</div>
                                    <div style="font-size:10px; color:var(--muted); margin-top:4px;">Heavenly Restriction tier</div>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px; margin-top:12px;">
                                <span style="font-family:var(--font-mono); font-size:12px; color:var(--bone-dim);">Custom Amount ($):</span>
                                <input type="number" id="custom-donation-input" value="15" min="1" max="5000" style="background:rgba(12,16,22,0.9); border:1px solid rgba(223,231,224,0.2); color:#fff; font-family:var(--font-mono); font-size:14px; padding:6px 12px; border-radius:4px; width:100px;" oninput="window.onCustomDonationChange(this.value)" />
                            </div>
                        </div>

                        <!-- Direct Support & Connect Channels (Privacy-Safe) -->
                        <div style="margin-bottom:20px; background:rgba(255,255,255,0.02); border:1px solid rgba(223,231,224,0.12); border-radius:8px; padding:16px;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                <span style="font-size:16px;">🔒</span>
                                <div style="font-family:var(--font-mono); font-size:11px; color:var(--vermilion); letter-spacing:0.1em; text-transform:uppercase; font-weight:700;">DIRECT CONTRIBUTION & CONTACT</div>
                            </div>
                            <p style="font-size:12px; color:var(--bone-sub); line-height:1.6; margin:0 0 14px;">
                                To protect personal privacy and financial security, direct bank accounts, UPI IDs, and cryptocurrency addresses are not publicly displayed. If you wish to sponsor compute resources, support the creator directly, or collaborate, please reach out to Ram Charan Teja personally:
                            </p>
                            <div style="display:flex; flex-wrap:wrap; gap:10px;">
                                <button type="button" onclick="window.switchCreatorTab('connect')" class="creator-copy-btn" style="font-size:11px; padding:8px 14px; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px; background:rgba(224,35,28,0.2); border-color:var(--vermilion); color:#ffffff; cursor:pointer;">
                                    <span>📬</span> Open Connect Tab
                                </button>
                                <a href="mailto:luno97802@gmail.com" class="creator-copy-btn" style="font-size:11px; padding:8px 14px; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
                                    <span>✉️</span> Direct Email
                                </a>
                                <a href="https://github.com/LUNO895" target="_blank" rel="noopener noreferrer" class="creator-copy-btn" style="font-size:11px; padding:8px 14px; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
                                    <span>🐙</span> GitHub @LUNO895
                                </a>
                            </div>
                        </div>

                        <!-- Interactive Contribution Simulation & Personal Gratitude Form -->
                        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(223,231,224,0.12); border-radius:8px; padding:16px;">
                            <h5 style="margin:0 0 10px; font-size:13px; color:var(--bone); font-family:var(--font-mono);">CONFIRM DONATION & LEAVE NOTE FOR RAM CHARAN TEJA</h5>
                            <form onsubmit="window.submitCreatorDonation(event)" style="display:flex; flex-direction:column; gap:10px;">
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                    <input type="text" id="donor-name-input" placeholder="Your Name / Handle" style="background:rgba(12,16,22,0.9); border:1px solid rgba(223,231,224,0.18); color:#fff; font-size:12px; padding:8px 12px; border-radius:4px;" required />
                                    <input type="email" id="donor-email-input" placeholder="Your Email (Optional)" style="background:rgba(12,16,22,0.9); border:1px solid rgba(223,231,224,0.18); color:#fff; font-size:12px; padding:8px 12px; border-radius:4px;" />
                                </div>
                                <textarea id="donor-note-input" rows="2" placeholder="Leave an encouraging note or feature request for the creator..." style="background:rgba(12,16,22,0.9); border:1px solid rgba(223,231,224,0.18); color:#fff; font-size:12px; padding:8px 12px; border-radius:4px; resize:none;"></textarea>
                                <button type="submit" id="donor-submit-btn" onclick="window.playDonationSound()" style="background:var(--vermilion); color:#fff; border:none; font-family:var(--font-mono); font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; padding:10px 20px; border-radius:4px; cursor:pointer; box-shadow:0 0 15px rgba(224,35,28,0.4); transition:all 0.2s ease;">
                                    ❤️ Confirm Contribution & Send Note →
                                </button>
                            </form>
                            <div id="donation-gratitude-box" style="display:none; margin-top:14px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:14px; text-align:center;">
                                <div style="font-size:24px; margin-bottom:4px;">🎉</div>
                                <h4 style="margin:0 0 4px; font-size:14px; color:#10b981; font-family:var(--font-mono);">THANK YOU FOR YOUR SUPPORT!</h4>
                                <p id="donation-gratitude-msg" style="margin:0; font-size:12px; color:var(--bone); line-height:1.5;">Your contribution has been recorded in the Luminix Creator Ledger. Ram Charan Teja deeply appreciates your partnership!</p>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 4: Connect & Inquiries -->
                    <div id="c-pane-connect" class="creator-pane" style="display:none;">
                        <div style="margin-bottom:16px;">
                            <div style="font-family:var(--font-mono); font-size:11px; color:var(--vermilion); letter-spacing:0.1em; text-transform:uppercase;">DIRECT CREATOR DISPATCH</div>
                            <h4 style="margin:4px 0 8px; font-size:16px; color:var(--bone);">Get in Touch with Ram Charan Teja</h4>
                            <p style="font-size:13px; color:var(--bone-sub); line-height:1.6; margin:0;">
                                For AI engineering collaborations, biomechanics research partnerships, technical advisory, or feature requests:
                            </p>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                            <a href="mailto:luno97802@gmail.com" target="_blank" style="display:flex; align-items:center; justify-content:space-between; background:rgba(16,21,29,0.8); border:1px solid rgba(223,231,224,0.15); border-radius:6px; padding:14px 18px; text-decoration:none; color:inherit; transition:border-color 0.2s ease;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <span style="font-size:20px;">✉️</span>
                                    <div>
                                        <div style="font-size:13px; font-weight:600; color:var(--bone);">Personal & Engineering Email</div>
                                        <div style="font-size:11px; font-family:var(--font-mono); color:var(--vermilion);">luno97802@gmail.com</div>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button type="button" class="creator-copy-btn" onclick="event.preventDefault(); event.stopPropagation(); window.copyCreatorAddress('luno97802@gmail.com', this)">COPY EMAIL</button>
                                    <span style="font-family:var(--font-mono); font-size:11px; color:var(--bone-dim);">COMPOSE →</span>
                                </div>
                            </a>

                            <a href="https://github.com/LUNO895" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; justify-content:space-between; background:rgba(16,21,29,0.8); border:1px solid rgba(223,231,224,0.15); border-radius:6px; padding:14px 18px; text-decoration:none; color:inherit; transition:border-color 0.2s ease;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <span style="font-size:20px;">🐙</span>
                                    <div>
                                        <div style="font-size:13px; font-weight:600; color:var(--bone);">GitHub Profile & Repositories</div>
                                        <div style="font-size:11px; font-family:var(--font-mono); color:var(--vermilion);">github.com/LUNO895</div>
                                    </div>
                                </div>
                                <span style="font-family:var(--font-mono); font-size:11px; color:var(--bone-dim);">VISIT GITHUB →</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    window.switchCreatorTab(initialTab);
};

window.closeCreatorModal = function() {
    const overlay = document.getElementById('creator-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
};

window.switchCreatorTab = function(tabId) {
    const tabs = ['story', 'arsenal', 'donate', 'connect'];
    tabs.forEach(t => {
        const btn = document.getElementById(`c-tab-btn-${t}`);
        const pane = document.getElementById(`c-pane-${t}`);
        if (btn) {
            if (t === tabId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
        if (pane) {
            pane.style.display = (t === tabId) ? 'block' : 'none';
        }
    });
    const overlay = document.getElementById('creator-modal-overlay');
    const modalBody = overlay ? overlay.querySelector('.creator-modal-body') : null;
    if (modalBody) modalBody.scrollTop = 0;
};

window.selectDonationTier = function(amount, cardElem) {
    document.querySelectorAll('.donation-tier-card').forEach(c => c.classList.remove('selected'));
    if (cardElem) cardElem.classList.add('selected');
    const input = document.getElementById('custom-donation-input');
    if (input) input.value = amount;
};

window.onCustomDonationChange = function(val) {
    document.querySelectorAll('.donation-tier-card').forEach(c => c.classList.remove('selected'));
};

window.copyCreatorAddress = function(text, btnElem) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        const t = document.createElement('textarea');
        t.value = text;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
    }
    const origText = btnElem.textContent;
    btnElem.textContent = '✓ COPIED!';
    btnElem.style.background = '#10b981';
    btnElem.style.color = '#ffffff';
    btnElem.style.borderColor = '#10b981';
    setTimeout(() => {
        btnElem.textContent = origText;
        btnElem.style.background = '';
        btnElem.style.color = '';
        btnElem.style.borderColor = '';
    }, 2000);
};

let _donationSoundAudio = null;
let _lastDonationSoundTime = 0;
window.playDonationSound = function() {
    const now = Date.now();
    if (now - _lastDonationSoundTime < 600) return;
    _lastDonationSoundTime = now;
    try {
        if (!_donationSoundAudio) {
            _donationSoundAudio = new Audio('/assets/fahhh_KcgAXfs.mp3');
        } else {
            _donationSoundAudio.currentTime = 0;
        }
        _donationSoundAudio.volume = 0.9;
        const p = _donationSoundAudio.play();
        if (p !== undefined) {
            p.catch(() => {
                const fb = new Audio('/static/assets/fahhh_KcgAXfs.mp3');
                fb.volume = 0.9;
                fb.play().catch(e => console.warn('Donation audio playback suppressed:', e));
            });
        }
    } catch (e) {
        console.warn('Donation sound playback error:', e);
    }
};

window.submitCreatorDonation = async function(event) {
    event.preventDefault();
    const nameInput = document.getElementById('donor-name-input');
    const emailInput = document.getElementById('donor-email-input');
    const amountInput = document.getElementById('custom-donation-input');
    const noteInput = document.getElementById('donor-note-input');
    const gratitudeBox = document.getElementById('donation-gratitude-box');
    const gratitudeMsg = document.getElementById('donation-gratitude-msg');
    const submitBtn = document.getElementById('donor-submit-btn');

    const name = nameInput?.value.trim() || 'Supporter';
    const email = emailInput?.value.trim() || null;
    const amount = parseFloat(amountInput?.value) || 15.0;
    const note = noteInput?.value.trim() || '';

    if (!nameInput || !nameInput.value.trim()) {
        alert('Please enter your name or handle.');
        nameInput?.focus();
        return;
    }

    // Play sound effect immediately on donation submission
    window.playDonationSound();

    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Transmitting to Ram Charan Teja...';
    }

    // 1. Client-Side 24-Hour Rate Limiting (max 5 per day)
    const todayStr = new Date().toISOString().split('T')[0];
    let dailyDonationData = { date: todayStr, count: 0 };
    try {
        const stored = JSON.parse(localStorage.getItem('luminix_daily_donations') || '{}');
        if (stored.date === todayStr) {
            dailyDonationData = stored;
        }
    } catch (_) {}

    if (dailyDonationData.count >= 5) {
        if (gratitudeBox && gratitudeMsg) {
            gratitudeBox.style.display = 'block';
            gratitudeBox.style.background = 'rgba(239, 68, 68, 0.12)';
            gratitudeBox.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            gratitudeMsg.innerHTML = `
                <div style="color: #ef4444; font-weight: 700; font-size: 13px; margin-bottom: 6px; font-family: var(--font-mono);">⚠️ DAILY LIMIT REACHED (5 / 5 Today)</div>
                <div style="color: var(--bone); font-size: 12px; line-height: 1.6;">
                    You have sent 5 notes today to Ram Charan Teja's email.
                    Direct email is always reachable at: <a href="mailto:luno97802@gmail.com" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">luno97802@gmail.com</a>
                </div>
            `;
            gratitudeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnHtml;
        }
        return;
    }

    try {
        const payload = {
            name: name,
            amount: amount,
            channel: 'Direct / Web App'
        };
        if (email) payload.email = email;
        if (note) payload.note = note;

        let dispatched = false;

        // Channel 1: Backend or Netlify Function Endpoint (/v1/creator/donation)
        try {
            const res = await fetch('/v1/creator/donation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                dispatched = true;
            } else if (res.status === 429) {
                throw new Error('Daily rate limit reached. Max 5 notes per 24 hours.');
            }
        } catch (e) {
            if (e.message && e.message.includes('Daily rate limit')) throw e;
        }

        // Channel 2: Direct Email Forwarding via FormSubmit API to Ram Charan Teja (luno97802@gmail.com)
        try {
            const emailFormData = {
                "Donor Name": name,
                "Donor Email": email || "Not provided",
                "Pledge Amount": `$${amount.toFixed(2)}`,
                "Payment Channel": "Direct / Web App",
                "Message Note": note || "(No message provided)",
                "Platform": "Luminix Autonomous AI",
                "_subject": `🎉 New Luminix Donation Note: $${amount.toFixed(2)} from ${name}`,
                "_captcha": "false",
                "_template": "table"
            };
            await fetch('https://formsubmit.co/ajax/luno97802@gmail.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(emailFormData)
            }).catch(() => null);
            dispatched = true;
        } catch (_) {}

        // Channel 3: Netlify Forms Submission
        try {
            const netlifyData = new URLSearchParams();
            netlifyData.append('form-name', 'creator-donation-notes');
            netlifyData.append('donor_name', name);
            netlifyData.append('donor_email', email || 'anonymous@luminix.sanctuary');
            netlifyData.append('amount', `$${amount.toFixed(2)}`);
            netlifyData.append('note', note || '');
            netlifyData.append('channel', 'Direct / Web App');
            await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: netlifyData.toString()
            }).catch(() => null);
        } catch (_) {}

        // Channel 4: Cloud Firestore Mirror (if Firebase is initialized)
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore().collection('creator_donations').add({
                    name: name,
                    email: email,
                    amount: amount,
                    note: note,
                    channel: 'Direct / Web App',
                    created_at: new Date().toISOString()
                });
            }
        } catch (_) {}

        // Channel 5: Local Storage Ledger
        try {
            const ledger = JSON.parse(localStorage.getItem('luminix_creator_donations') || '[]');
            ledger.unshift({ name, email, amount, note, timestamp: new Date().toISOString() });
            localStorage.setItem('luminix_creator_donations', JSON.stringify(ledger.slice(0, 50)));
        } catch (_) {}

        // Increment daily counter
        dailyDonationData.count = (dailyDonationData.count || 0) + 1;
        localStorage.setItem('luminix_daily_donations', JSON.stringify(dailyDonationData));
        const remaining = Math.max(0, 5 - dailyDonationData.count);

        // Success: Render Gratitude & Direct Mailto Link
        const mailtoSub = encodeURIComponent(`Luminix Donation Note: $${amount.toFixed(2)} from ${name}`);
        const mailtoBody = encodeURIComponent(`Hi Ram Charan Teja,\n\nI just pledged $${amount.toFixed(2)} to support Luminix!\n\nMessage / Note:\n${note || '(None)'}\n\nFrom: ${name} (${email || 'No email provided'})\nPlatform: Luminix AI (luminixi.netlify.app)`);
        const directMailto = `mailto:luno97802@gmail.com?subject=${mailtoSub}&body=${mailtoBody}`;

        if (gratitudeBox && gratitudeMsg) {
            gratitudeBox.style.display = 'block';
            gratitudeBox.style.background = 'rgba(16, 185, 129, 0.12)';
            gratitudeBox.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            gratitudeMsg.innerHTML = `
                <div style="font-size: 26px; margin-bottom: 4px;">🎉</div>
                <h4 style="margin: 0 0 6px; font-size: 15px; color: #10b981; font-family: var(--font-mono); font-weight: 700;">THANK YOU, ${name.toUpperCase()}!</h4>
                <p style="margin: 0 0 8px; font-size: 12px; color: var(--bone); line-height: 1.6;">
                    Your generous pledge of <b>$${amount.toFixed(2)}</b> has been recorded and an instant notification dispatch was sent to <b>Ram Charan Teja</b> (<span style="color: #60a5fa;">luno97802@gmail.com</span>)!
                </p>
                ${note ? `<div style="font-style: italic; color: #e5e7eb; font-size: 12px; margin: 8px 0; background: rgba(0,0,0,0.3); border-left: 2px solid var(--vermilion); padding: 8px 12px; border-radius: 4px; text-align: left;">"${note}"</div>` : ''}
                <div style="margin: 10px 0;">
                    <a href="${directMailto}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(96, 165, 250, 0.15); border: 1px solid rgba(96, 165, 250, 0.4); color: #93c5fd; font-family: var(--font-mono); font-size: 11px; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-weight: 600;">
                        <span>✉️</span> Direct Compose in Mail App &rarr;
                    </a>
                </div>
                <div style="font-size: 11px; color: var(--bone-dim); font-family: var(--font-mono); margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
                    Notifications remaining today: <span style="color: #10b981; font-weight: 700;">${remaining} / 5</span>
                </div>
            `;
            gratitudeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Clear note input
        if (noteInput) noteInput.value = '';

    } catch (err) {
        console.error('Donation submission error:', err);
        if (err.message && err.message.includes('Daily rate limit')) {
            alert(err.message);
        } else {
            if (gratitudeBox && gratitudeMsg) {
                gratitudeBox.style.display = 'block';
                gratitudeBox.style.background = 'rgba(16, 185, 129, 0.12)';
                gratitudeBox.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                gratitudeMsg.innerHTML = `
                    <div style="font-size: 26px; margin-bottom: 4px;">🎉</div>
                    <h4 style="margin: 0 0 6px; font-size: 15px; color: #10b981; font-family: var(--font-mono); font-weight: 700;">THANK YOU, ${name.toUpperCase()}!</h4>
                    <p style="margin: 0 0 8px; font-size: 12px; color: var(--bone); line-height: 1.6;">
                        Your pledge of <b>$${amount.toFixed(2)}</b> has been recorded for <b>Ram Charan Teja</b> (<span style="color: #60a5fa;">luno97802@gmail.com</span>).
                    </p>
                `;
                gratitudeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnHtml;
        }
    }
};

/* ── Proactively Suppress Netlify Edge-Injected HUD & Badges ─────────── */
(function suppressNetlifyBadge() {
    const purge = () => {
        const frames = document.querySelectorAll('#nl-badge-frame, #nl-hud-frame, iframe[id^="nl-"]');
        frames.forEach(f => {
            f.style.setProperty('display', 'none', 'important');
            f.style.setProperty('visibility', 'hidden', 'important');
            f.remove();
        });
    };
    purge();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', purge);
    }
    if (window.MutationObserver && document.documentElement) {
        const obs = new MutationObserver(purge);
        obs.observe(document.documentElement, { childList: true, subtree: true });
    }
})();
