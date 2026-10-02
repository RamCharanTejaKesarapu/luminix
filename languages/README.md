# 🌐 Luminix Global Language & Translation Files

This directory (`/languages/`) contains all localization and internationalization (i18n) translation dictionaries for Luminix.

All 16 supported languages are located directly in this single folder as unified JSON files for easy access, inspection, and editing.

---

## 📁 Directory Overview

```text
languages/
├── ar.json                 # Arabic (العربية) — RTL
├── de.json                 # German (Deutsch)
├── en.json                 # English (Base language)
├── es.json                 # Spanish (Español)
├── fil.json                # Filipino / Tagalog
├── fr.json                 # French (Français)
├── hi.json                 # Hindi (हिन्दी)
├── it.json                 # Italian (Italiano)
├── ja.json                 # Japanese (日本語)
├── ko.json                 # Korean (한국어)
├── pt.json                 # Portuguese (Português)
├── ru.json                 # Russian (Русский)
├── te.json                 # Telugu (తెలుగు)
├── tr.json                 # Turkish (Türkçe)
├── ur.json                 # Urdu (اردو) — RTL
├── zh.json                 # Simplified Chinese (简体中文)
├── sync_translations.py    # Auto-synchronization & validation script
└── README.md               # This documentation
```

> **Direct Access Links:**
> - Root Symlink: [`/locales`](../locales) points directly to this folder.
> - Frontend Symlink: [`/frontend/languages`](../frontend/languages) points directly to this folder.
> - Production UI Bundle: [`/frontend/locales/`](../frontend/locales/) contains optimized runtime bundles.
> - HTTP API Access: `http://localhost:8000/languages/<lang>.json` or `http://localhost:8000/static/locales/<lang>.json`.

---

## 🗺️ Supported Languages Matrix

| # | Language | Code | Native Name | Locale | Text Direction | File |
|---|---|---|---|---|---|---|
| 1 | **English** | `en` | English | `en-US` | LTR | [`en.json`](./en.json) |
| 2 | **Telugu** | `te` | తెలుగు | `te-IN` | LTR | [`te.json`](./te.json) |
| 3 | **Hindi** | `hi` | हिन्दी | `hi-IN` | LTR | [`hi.json`](./hi.json) |
| 4 | **Simplified Chinese** | `zh` | 简体中文 | `zh-CN` | LTR | [`zh.json`](./zh.json) |
| 5 | **Spanish** | `es` | Español | `es-ES` | LTR | [`es.json`](./es.json) |
| 6 | **French** | `fr` | Français | `fr-FR` | LTR | [`fr.json`](./fr.json) |
| 7 | **German** | `de` | Deutsch | `de-DE` | LTR | [`de.json`](./de.json) |
| 8 | **Russian** | `ru` | Русский | `ru-RU` | LTR | [`ru.json`](./ru.json) |
| 9 | **Turkish** | `tr` | Türkçe | `tr-TR` | LTR | [`tr.json`](./tr.json) |
| 10 | **Arabic** | `ar` | العربية | `ar-SA` | **RTL** | [`ar.json`](./ar.json) |
| 11 | **Portuguese** | `pt` | Português | `pt-BR` | LTR | [`pt.json`](./pt.json) |
| 12 | **Japanese** | `ja` | 日本語 | `ja-JP` | LTR | [`ja.json`](./ja.json) |
| 13 | **Korean** | `ko` | 한국어 | `ko-KR` | LTR | [`ko.json`](./ko.json) |
| 14 | **Italian** | `it` | Italiano | `it-IT` | LTR | [`it.json`](./it.json) |
| 15 | **Filipino** | `fil` | Filipino | `fil-PH` | LTR | [`fil.json`](./fil.json) |
| 16 | **Urdu** | `ur` | اردو | `ur-PK` | **RTL** | [`ur.json`](./ur.json) |

---

## 🧩 JSON Structure Within Each File

Each `<lang>.json` file contains top-level namespace keys matching Luminix feature domains:

```json
{
  "common": {
    "appName": "LUMINIX",
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading..."
  },
  "nav": {
    "system": "SYSTEM",
    "livePose": "LIVE POSE",
    "gym": "GYM",
    "yoga": "YOGA",
    "nutrition": "NUTRITION"
  },
  "auth": { ... },
  "dashboard": { ... },
  "gym": { ... },
  "yoga": { ... },
  "nutrition": { ... },
  "pose": { ... },
  "settings": { ... },
  "notifications": { ... },
  "luna": { ... }
}
```

---

## ✏️ How to Edit or Add Translations

### 1. Direct Editing
Open any language file (for example [`te.json`](./te.json) for Telugu or [`es.json`](./es.json) for Spanish), locate the phrase, and edit the translated text.

### 2. Synchronize Automatically
After making edits, run the built-in synchronization script:
```bash
python3 languages/sync_translations.py
```
This script automatically:
1. Validates that the JSON syntax is correct.
2. Updates `languages/<lang>.json`.
3. Copies the bundle to `frontend/locales/<lang>.json` for high-speed single-request browser fetching.
4. Updates the modular namespace files in `frontend/locales/<lang>/`.

---

## ➕ How to Add a New 17th Language

1. Duplicate [`en.json`](./en.json) and rename it to your ISO 639-1 language code (e.g. `nl.json` for Dutch):
   ```bash
   cp languages/en.json languages/nl.json
   ```
2. Translate the values in `languages/nl.json`.
3. Add the language metadata object to `LUMINIX_LANGUAGES` in [`frontend/i18n.js`](../frontend/i18n.js):
   ```javascript
   { code: 'nl', name: 'Dutch', native: 'Nederlands', locale: 'nl-NL', dir: 'ltr', flag: '🇳🇱' }
   ```
4. Run:
   ```bash
   python3 languages/sync_translations.py
   ```
5. Done! The new language will appear in the global language selector and be instantly usable.
