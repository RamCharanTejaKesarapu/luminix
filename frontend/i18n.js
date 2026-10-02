/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Global Multi-Language / i18n Engine
   Supports 16 languages with lazy loading, RTL, fallback, and
   locale-aware formatting. Single source of truth for language state.
   ═══════════════════════════════════════════════════════════════════ */

// ── Supported Language Configuration ──────────────────────────────
const LUMINIX_LANGUAGES = [
    { code: 'en',  locale: 'en-US',  name: 'English',    nativeName: 'English',    direction: 'ltr', flag: '🇺🇸' },
    { code: 'te',  locale: 'te-IN',  name: 'Telugu',     nativeName: 'తెలుగు',      direction: 'ltr', flag: '🇮🇳' },
    { code: 'hi',  locale: 'hi-IN',  name: 'Hindi',      nativeName: 'हिन्दी',      direction: 'ltr', flag: '🇮🇳' },
    { code: 'zh',  locale: 'zh-CN',  name: 'Chinese',    nativeName: '中文',         direction: 'ltr', flag: '🇨🇳' },
    { code: 'es',  locale: 'es-ES',  name: 'Spanish',    nativeName: 'Español',    direction: 'ltr', flag: '🇪🇸' },
    { code: 'fr',  locale: 'fr-FR',  name: 'French',     nativeName: 'Français',   direction: 'ltr', flag: '🇫🇷' },
    { code: 'de',  locale: 'de-DE',  name: 'German',     nativeName: 'Deutsch',    direction: 'ltr', flag: '🇩🇪' },
    { code: 'ru',  locale: 'ru-RU',  name: 'Russian',    nativeName: 'Русский',    direction: 'ltr', flag: '🇷🇺' },
    { code: 'tr',  locale: 'tr-TR',  name: 'Turkish',    nativeName: 'Türkçe',     direction: 'ltr', flag: '🇹🇷' },
    { code: 'ar',  locale: 'ar-SA',  name: 'Arabic',     nativeName: 'العربية',    direction: 'rtl', flag: '🇸🇦' },
    { code: 'pt',  locale: 'pt-PT',  name: 'Portuguese', nativeName: 'Português',  direction: 'ltr', flag: '🇵🇹' },
    { code: 'ja',  locale: 'ja-JP',  name: 'Japanese',   nativeName: '日本語',       direction: 'ltr', flag: '🇯🇵' },
    { code: 'ko',  locale: 'ko-KR',  name: 'Korean',     nativeName: '한국어',       direction: 'ltr', flag: '🇰🇷' },
    { code: 'it',  locale: 'it-IT',  name: 'Italian',    nativeName: 'Italiano',   direction: 'ltr', flag: '🇮🇹' },
    { code: 'fil', locale: 'fil-PH', name: 'Filipino',   nativeName: 'Tagalog',    direction: 'ltr', flag: '🇵🇭' },
    { code: 'ur',  locale: 'ur-PK',  name: 'Urdu',       nativeName: 'اردو',       direction: 'rtl', flag: '🇵🇰' }
];

// ── i18n State ────────────────────────────────────────────────────
const _i18nState = {
    currentLang: 'en',
    currentLocale: 'en-US',
    currentDirection: 'ltr',
    translations: {},       // { langCode: { key: value } }   (flat merged)
    loadingPromises: {},    // prevent duplicate fetches
    listeners: [],          // onChange callbacks
    initialized: false
};

// Translation file namespaces per language
const I18N_NAMESPACES = [
    'common', 'auth', 'dashboard', 'nav', 'pose', 'gym', 'yoga',
    'nutrition', 'luna', 'settings', 'notifications'
];

// ── Utility: Deep object access by dot-path ───────────────────────
function _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result == null || typeof result !== 'object') return undefined;
        result = result[key];
    }
    return result;
}

// ── Core Translation Function ─────────────────────────────────────
/**
 * Translate a key with optional interpolation.
 * @param {string} key — Dot-path translation key, e.g. "gym.startWorkout"
 * @param {Object} [params] — Interpolation params, e.g. { count: 5 }
 * @returns {string}
 */
function t(key, params) {
    const lang = _i18nState.currentLang;
    let value;

    // 1. Try current language
    if (_i18nState.translations[lang]) {
        value = _getNestedValue(_i18nState.translations[lang], key);
    }

    // 2. Fallback to English
    if (value === undefined && lang !== 'en' && _i18nState.translations['en']) {
        value = _getNestedValue(_i18nState.translations['en'], key);
    }

    // 3. Ultimate fallback — return the key itself (never expose undefined)
    if (value === undefined) {
        if (lang !== 'en') {
            console.warn(`[i18n] Missing translation: "${key}" for locale "${lang}"`);
        }
        // Convert "gym.startWorkout" to "Start Workout" as display fallback
        const lastPart = key.split('.').pop() || key;
        return lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }

    // 4. Interpolation: replace {{param}} placeholders
    if (params && typeof value === 'string') {
        return value.replace(/\{\{(\w+)\}\}/g, (_, k) => {
            return params[k] !== undefined ? String(params[k]) : `{{${k}}}`;
        });
    }

    return value;
}

// Make t() globally available
window.t = t;

// ── Load Translation Files ────────────────────────────────────────
async function _loadLanguageTranslations(langCode) {
    if (_i18nState.translations[langCode] && langCode !== 'en') {
        return; // Already loaded
    }

    // Prevent duplicate parallel loads
    if (_i18nState.loadingPromises[langCode]) {
        return _i18nState.loadingPromises[langCode];
    }

    const loadPromise = (async () => {
        let merged = {};

        // 1. Try single unified language file first (fast single network request)
        try {
            const unifiedUrl = `/static/locales/${langCode}.json?v=${Date.now()}`;
            const unifiedRes = await fetch(unifiedUrl);
            if (unifiedRes.ok) {
                const unifiedData = await unifiedRes.json();
                if (unifiedData && typeof unifiedData === 'object' && Object.keys(unifiedData).length > 0) {
                    merged = unifiedData;
                    _i18nState.translations[langCode] = merged;
                    delete _i18nState.loadingPromises[langCode];
                    return;
                }
            }
        } catch (unifiedErr) {
            // Fallback to namespace files
        }

        // 2. Fallback: load individual namespace files
        const basePath = '/static/locales/' + langCode;
        for (const ns of I18N_NAMESPACES) {
            try {
                const url = `${basePath}/${ns}.json?v=${Date.now()}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    // Merge namespace into flat structure, preserving nesting
                    Object.assign(merged, data);
                }
            } catch (err) {
                // Non-critical: namespace missing for this language
                if (langCode !== 'en') {
                    console.debug(`[i18n] Could not load ${langCode}/${ns}.json`);
                }
            }
        }

        _i18nState.translations[langCode] = merged;
        delete _i18nState.loadingPromises[langCode];
    })();

    _i18nState.loadingPromises[langCode] = loadPromise;
    return loadPromise;
}

// ── Get Language Config ───────────────────────────────────────────
function getLangConfig(code) {
    return LUMINIX_LANGUAGES.find(l => l.code === code) || LUMINIX_LANGUAGES[0];
}

function getCurrentLang() {
    return _i18nState.currentLang;
}

function getCurrentLocale() {
    return _i18nState.currentLocale;
}

function getCurrentDirection() {
    return _i18nState.currentDirection;
}

function getSupportedLanguages() {
    return LUMINIX_LANGUAGES;
}

// ── Apply RTL / LTR Direction ─────────────────────────────────────
function _applyDirection(direction) {
    const html = document.documentElement;
    html.setAttribute('dir', direction);
    html.setAttribute('lang', _i18nState.currentLang);

    // Remove any previous luminix-lang-* classes
    html.className = html.className.replace(/\bluminix-lang-\w+\b/g, '').trim();
    html.classList.add(`luminix-lang-${_i18nState.currentLang}`);

    // Toggle RTL class for CSS styling hooks
    if (direction === 'rtl') {
        document.body.classList.add('luminix-rtl');
        document.body.classList.remove('luminix-ltr');
    } else {
        document.body.classList.add('luminix-ltr');
        document.body.classList.remove('luminix-rtl');
    }
}

// ── Update All Static HTML Elements with data-i18n ────────────────
function _updateStaticTranslations() {
    // Elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        if (key.startsWith('[placeholder]')) {
            el.placeholder = t(key.slice(13));
        } else if (key.startsWith('[title]')) {
            el.title = t(key.slice(7));
        } else if (key.startsWith('[aria]')) {
            el.setAttribute('aria-label', t(key.slice(6)));
        } else {
            el.textContent = t(key);
        }
    });

    // Update user profile pill in header
    try { window.updateUserProfileUI?.(); } catch (_) {}

    // Elements with data-i18n-placeholder get placeholder replaced
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            el.placeholder = t(key);
        }
    });

    // Elements with data-i18n-title get title replaced
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            el.title = t(key);
        }
    });

    // Elements with data-i18n-aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (key) {
            el.setAttribute('aria-label', t(key));
        }
    });

    // Elements with data-i18n-html get innerHTML replaced (use carefully)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
            el.innerHTML = t(key);
        }
    });
}

// ── Language Persistence ──────────────────────────────────────────
const I18N_STORAGE_KEY = 'luminix_language_preference';

function _saveLanguagePreference(langCode, locale) {
    try {
        localStorage.setItem(I18N_STORAGE_KEY, JSON.stringify({
            language: langCode,
            locale: locale,
            timestamp: Date.now()
        }));
    } catch (_) {}

    // For authenticated users, also save to profile in Firebase
    if (window.luminixAuth?.isAuthenticated?.() && window.luminixFirebase?.saveLanguagePreference) {
        window.luminixFirebase.saveLanguagePreference(langCode, locale);
    }
}

function _getSavedLanguagePreference() {
    try {
        const raw = localStorage.getItem(I18N_STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data && data.language) return data;
        }
    } catch (_) {}
    return null;
}

// ── Browser Language Detection ────────────────────────────────────
function _detectBrowserLanguage() {
    try {
        const browserLang = navigator.language || navigator.languages?.[0] || '';
        if (!browserLang) return null;

        const langCode = browserLang.split('-')[0].toLowerCase();

        // Direct match
        const directMatch = LUMINIX_LANGUAGES.find(l => l.code === langCode);
        if (directMatch) return directMatch.code;

        // Locale-based match (e.g. "fil-PH" → "fil")
        const localeMatch = LUMINIX_LANGUAGES.find(l => 
            browserLang.toLowerCase().startsWith(l.code.toLowerCase())
        );
        if (localeMatch) return localeMatch.code;

    } catch (_) {}
    return null;
}

// ── Change Language ───────────────────────────────────────────────
/**
 * Switch the entire application to a new language.
 * @param {string} langCode — Language code (e.g. 'te', 'de', 'ar')
 * @returns {Promise<void>}
 */
async function setLanguage(langCode) {
    const config = getLangConfig(langCode);
    if (!config) {
        console.warn(`[i18n] Unsupported language code: "${langCode}"`);
        return;
    }

    // Load translations for the target language
    await _loadLanguageTranslations(config.code);

    // Update state
    _i18nState.currentLang = config.code;
    _i18nState.currentLocale = config.locale;
    _i18nState.currentDirection = config.direction;

    // Apply RTL/LTR
    _applyDirection(config.direction);

    // Persist preference
    _saveLanguagePreference(config.code, config.locale);

    // Update static translations in DOM
    _updateStaticTranslations();

    // Update language selector display
    _updateLanguageSelectorDisplay();

    // Notify all registered listeners
    _i18nState.listeners.forEach(fn => {
        try { fn(config.code, config.locale, config.direction); } catch (e) {
            console.error('[i18n] Listener error:', e);
        }
    });

    // Also dispatch custom DOM event for decoupled modules
    try {
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: config.code, locale: config.locale, direction: config.direction }
        }));
    } catch (_) {}

    // Re-render current view if nav function exists
    if (window.currentView && window.nav) {
        window.nav(window.currentView);
    }
}

// ── Register Language Change Listener ─────────────────────────────
function onLanguageChange(callback) {
    if (typeof callback === 'function') {
        _i18nState.listeners.push(callback);
    }
}

// ── Locale-Aware Formatting ───────────────────────────────────────
function formatNumber(value, options) {
    try {
        return new Intl.NumberFormat(_i18nState.currentLocale, options).format(value);
    } catch (_) {
        return String(value);
    }
}

function formatDate(date, options) {
    try {
        const d = date instanceof Date ? date : new Date(date);
        return new Intl.DateTimeFormat(_i18nState.currentLocale, options).format(d);
    } catch (_) {
        return String(date);
    }
}

function formatTime(date, options) {
    try {
        const d = date instanceof Date ? date : new Date(date);
        return new Intl.DateTimeFormat(_i18nState.currentLocale, {
            hour: '2-digit',
            minute: '2-digit',
            ...options
        }).format(d);
    } catch (_) {
        return String(date);
    }
}

// ── Luna AI Language Context ──────────────────────────────────────
/**
 * Get language context for Luna AI system prompt injection.
 */
function getLunaLanguageContext() {
    const config = getLangConfig(_i18nState.currentLang);
    return {
        language: config.code,
        locale: config.locale,
        languageName: config.name,
        nativeName: config.nativeName,
        direction: config.direction,
        systemInstruction: _buildLunaLanguageInstruction(config)
    };
}

function _buildLunaLanguageInstruction(config) {
    if (config.code === 'en') {
        return ''; // No special instruction needed for English
    }
    return `
LANGUAGE DIRECTIVE:
The user's current Luminix language is ${config.nativeName} (${config.name}).
The user's locale is ${config.locale}.

Always respond in ${config.nativeName} (${config.name}) unless the user explicitly requests another language.
Use natural, fluent ${config.name} appropriate for native speakers.
Do not unnecessarily mix English with ${config.name}.
Preserve the original meaning and accuracy of the response.
Preserve numerical values, measurements, units, scientific information, exercise terminology, and health information accurately.
When an English technical term is commonly used in ${config.name}, you may include the English term in parentheses when helpful.
Do not ask the user to translate the response.
Do not tell the user that Luna supports multiple languages.
Follow the selected language automatically.`;
}

// ── Language Selector UI ──────────────────────────────────────────
let _langSelectorOpen = false;

function _createLanguageSelector() {
    // Check if it already exists
    if (document.getElementById('luminix-lang-selector')) return;

    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'luminix-lang-selector';
    selectorContainer.className = 'lang-selector-container';
    selectorContainer.innerHTML = `
        <button type="button" id="lang-selector-trigger" class="lang-selector-trigger header-action-btn" 
                onclick="window.toggleLanguageSelector()" 
                title="Change language" 
                aria-label="Select language" 
                aria-expanded="false" 
                aria-haspopup="listbox">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="lang-globe-icon">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span id="lang-selector-current-name" class="lang-selector-name">English</span>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" class="lang-chevron">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
        </button>
        <div id="lang-selector-dropdown" class="lang-selector-dropdown hidden" role="listbox" aria-label="Language selection">
            <div class="lang-dropdown-header">
                <span class="lang-dropdown-title">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:6px;">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Language
                </span>
            </div>
            <div class="lang-search-wrap">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="lang-search-icon">
                    <circle cx="11" cy="11" r="6"/>
                    <line x1="20" y1="20" x2="16" y2="16"/>
                </svg>
                <input type="text" id="lang-search-input" class="lang-search-input" 
                       placeholder="Search language..." 
                       autocomplete="off" spellcheck="false"
                       oninput="window._filterLanguages(this.value)"
                       onkeydown="window._handleLangKeydown(event)" />
            </div>
            <ul id="lang-options-list" class="lang-options-list" role="listbox">
                <!-- Populated dynamically -->
            </ul>
        </div>
    `;

    return selectorContainer;
}

function _renderLanguageOptions(filter) {
    const list = document.getElementById('lang-options-list');
    if (!list) return;

    const filterLower = (filter || '').toLowerCase().trim();
    const currentLang = _i18nState.currentLang;

    let html = '';
    let focusIndex = 0;

    LUMINIX_LANGUAGES.forEach((lang, idx) => {
        const matchesFilter = !filterLower || 
            lang.name.toLowerCase().includes(filterLower) || 
            lang.nativeName.toLowerCase().includes(filterLower) ||
            lang.code.toLowerCase().includes(filterLower);

        if (!matchesFilter) return;

        const isActive = lang.code === currentLang;
        html += `
            <li class="lang-option ${isActive ? 'lang-option-active' : ''}" 
                role="option" 
                aria-selected="${isActive}"
                data-lang-code="${lang.code}"
                data-lang-idx="${idx}"
                tabindex="-1"
                onclick="window._selectLanguage('${lang.code}')">
                <span class="lang-option-flag">${lang.flag}</span>
                <span class="lang-option-names">
                    <span class="lang-option-native">${lang.nativeName}</span>
                    <span class="lang-option-english">${lang.name}</span>
                </span>
                ${isActive ? '<span class="lang-option-check">✓</span>' : ''}
            </li>
        `;
    });

    if (!html) {
        html = '<li class="lang-option-empty">No matching languages</li>';
    }

    list.innerHTML = html;
}

function _updateLanguageSelectorDisplay() {
    const config = getLangConfig(_i18nState.currentLang);
    const nameEl = document.getElementById('lang-selector-current-name');
    if (nameEl) {
        nameEl.textContent = config.nativeName;
    }
    // Re-render options to update checkmark
    if (_langSelectorOpen) {
        _renderLanguageOptions(document.getElementById('lang-search-input')?.value || '');
    }
}

// ── Toggle Dropdown ───────────────────────────────────────────────
window.toggleLanguageSelector = function() {
    const dropdown = document.getElementById('lang-selector-dropdown');
    const trigger = document.getElementById('lang-selector-trigger');
    if (!dropdown) return;

    _langSelectorOpen = !_langSelectorOpen;

    if (_langSelectorOpen) {
        dropdown.classList.remove('hidden');
        dropdown.classList.add('lang-dropdown-open');
        trigger?.setAttribute('aria-expanded', 'true');
        _renderLanguageOptions('');
        // Focus search input
        setTimeout(() => {
            const searchInput = document.getElementById('lang-search-input');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
        }, 50);
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', _closeLangSelectorOnOutsideClick);
            document.addEventListener('keydown', _closeLangSelectorOnEsc);
        }, 10);
    } else {
        _closeLanguageSelector();
    }
};

function _closeLanguageSelector() {
    const dropdown = document.getElementById('lang-selector-dropdown');
    const trigger = document.getElementById('lang-selector-trigger');
    if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('lang-dropdown-open');
    }
    if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
    }
    _langSelectorOpen = false;
    document.removeEventListener('click', _closeLangSelectorOnOutsideClick);
    document.removeEventListener('keydown', _closeLangSelectorOnEsc);
}

function _closeLangSelectorOnOutsideClick(e) {
    const container = document.getElementById('luminix-lang-selector');
    if (container && !container.contains(e.target)) {
        _closeLanguageSelector();
    }
}

function _closeLangSelectorOnEsc(e) {
    if (e.key === 'Escape') {
        _closeLanguageSelector();
    }
}

window._filterLanguages = function(value) {
    _renderLanguageOptions(value);
};

window._handleLangKeydown = function(e) {
    const list = document.getElementById('lang-options-list');
    if (!list) return;
    const items = list.querySelectorAll('.lang-option');
    if (!items.length) return;

    let currentIdx = -1;
    items.forEach((item, idx) => {
        if (item.classList.contains('lang-option-focused')) currentIdx = idx;
    });

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        items.forEach(item => item.classList.remove('lang-option-focused'));
        items[nextIdx].classList.add('lang-option-focused');
        items[nextIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items.forEach(item => item.classList.remove('lang-option-focused'));
        items[prevIdx].classList.add('lang-option-focused');
        items[prevIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const focusedItem = list.querySelector('.lang-option-focused');
        if (focusedItem) {
            const code = focusedItem.dataset.langCode;
            if (code) window._selectLanguage(code);
        }
    }
};

window._selectLanguage = async function(langCode) {
    _closeLanguageSelector();
    if (langCode === _i18nState.currentLang) return;

    // Show a subtle transition overlay
    const overlay = document.createElement('div');
    overlay.className = 'lang-switch-overlay';
    overlay.innerHTML = `<div class="lang-switch-spinner"></div>`;
    document.body.appendChild(overlay);

    try {
        await setLanguage(langCode);
    } catch (err) {
        console.error('[i18n] Language switch failed:', err);
    }

    // Remove overlay after a brief animation
    setTimeout(() => {
        overlay.classList.add('lang-switch-fade-out');
        setTimeout(() => overlay.remove(), 300);
    }, 200);
};

// ── Inject Selector Into Header ───────────────────────────────────
function _injectLanguageSelectorIntoHeader() {
    // Desktop header: insert before theme toggle
    const headerRight = document.querySelector('.header-right');
    const themeBtn = document.getElementById('header-theme-btn');
    
    if (headerRight && themeBtn && !document.getElementById('luminix-lang-selector')) {
        const selectorEl = _createLanguageSelector();
        themeBtn.parentNode.insertBefore(selectorEl, themeBtn);
    }
}

// ── Initialize i18n System ────────────────────────────────────────
async function initI18n() {
    if (_i18nState.initialized) return;

    // 1. Always load English as the fallback base
    await _loadLanguageTranslations('en');

    // 2. Determine language: Saved preference → English (strict default)
    let targetLang = 'en';

    // Check user preference if explicitly saved previously
    const savedPref = _getSavedLanguagePreference();
    if (savedPref && savedPref.language) {
        const config = getLangConfig(savedPref.language);
        if (config) targetLang = config.code;
    }
    // Default is strictly English ('en') unless user explicitly chooses another language

    // 3. Load target language if not English
    if (targetLang !== 'en') {
        await _loadLanguageTranslations(targetLang);
    }

    // 4. Set state
    const config = getLangConfig(targetLang);
    _i18nState.currentLang = config.code;
    _i18nState.currentLocale = config.locale;
    _i18nState.currentDirection = config.direction;

    // 5. Apply direction
    _applyDirection(config.direction);

    // 6. Inject language selector into header
    _injectLanguageSelectorIntoHeader();

    // 7. Update static translations
    _updateStaticTranslations();

    // 8. Update selector display
    _updateLanguageSelectorDisplay();

    _i18nState.initialized = true;

    console.log(`[i18n] Initialized: ${config.name} (${config.code}) — ${config.direction.toUpperCase()}`);
}

// ── Expose API Globally ───────────────────────────────────────────
window.luminixI18n = {
    t,
    setLanguage,
    getCurrentLang,
    getCurrentLocale,
    getCurrentDirection,
    getSupportedLanguages,
    getLangConfig,
    getLunaLanguageContext,
    onLanguageChange,
    formatNumber,
    formatDate,
    formatTime,
    initI18n,
    createLanguageSelector: _createLanguageSelector,
    LUMINIX_LANGUAGES
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure header elements are rendered
        setTimeout(initI18n, 100);
    });
} else {
    setTimeout(initI18n, 100);
}
