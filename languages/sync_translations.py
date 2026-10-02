#!/usr/bin/env python3
"""
Luminix Translation Synchronization Tool
=========================================
Keeps all language files synchronized between:
  - Root `languages/{lang}.json` (Primary, easy to edit)
  - `frontend/locales/{lang}.json` (Fast single-request bundle for UI)
  - `frontend/locales/{lang}/*.json` (Modular namespaces for micro-edits)

Usage:
  python3 languages/sync_translations.py
  python3 languages/sync_translations.py --validate
"""

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LANGUAGES_DIR = PROJECT_ROOT / "languages"
LOCALES_DIR = PROJECT_ROOT / "frontend" / "locales"

NAMESPACES = [
    "common", "auth", "dashboard", "nav", "gym", "luna",
    "notifications", "nutrition", "pose", "settings", "yoga"
]

SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English", "dir": "ltr"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు", "dir": "ltr"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी", "dir": "ltr"},
    {"code": "zh", "name": "Chinese", "native": "简体中文", "dir": "ltr"},
    {"code": "es", "name": "Spanish", "native": "Español", "dir": "ltr"},
    {"code": "fr", "name": "French", "native": "Français", "dir": "ltr"},
    {"code": "de", "name": "German", "native": "Deutsch", "dir": "ltr"},
    {"code": "ru", "name": "Russian", "native": "Русский", "dir": "ltr"},
    {"code": "tr", "name": "Turkish", "native": "Türkçe", "dir": "ltr"},
    {"code": "ar", "name": "Arabic", "native": "العربية", "dir": "rtl"},
    {"code": "pt", "name": "Portuguese", "native": "Português", "dir": "ltr"},
    {"code": "ja", "name": "Japanese", "native": "日本語", "dir": "ltr"},
    {"code": "ko", "name": "Korean", "native": "한국어", "dir": "ltr"},
    {"code": "it", "name": "Italian", "native": "Italiano", "dir": "ltr"},
    {"code": "fil", "name": "Filipino", "native": "Filipino", "dir": "ltr"},
    {"code": "ur", "name": "Urdu", "native": "اردو", "dir": "rtl"},
]


def sync():
    print("=" * 60)
    print("  LUMINIX — LANGUAGE FILES SYNCHRONIZATION")
    print("=" * 60)

    LANGUAGES_DIR.mkdir(parents=True, exist_ok=True)
    LOCALES_DIR.mkdir(parents=True, exist_ok=True)

    synced_count = 0
    errors = 0

    for item in SUPPORTED_LANGUAGES:
        code = item["code"]
        lang_file = LANGUAGES_DIR / f"{code}.json"
        data = {}

        # 1. Read from languages/{code}.json if present
        if lang_file.exists():
            try:
                with open(lang_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception as e:
                print(f"[ERROR] Failed parsing {lang_file}: {e}")
                errors += 1
                continue
        else:
            # Fallback: compile from frontend/locales/{code}/*.json
            lang_dir = LOCALES_DIR / code
            if lang_dir.exists():
                for ns in NAMESPACES:
                    ns_file = lang_dir / f"{ns}.json"
                    if ns_file.exists():
                        try:
                            with open(ns_file, "r", encoding="utf-8") as f:
                                data.update(json.load(f))
                        except Exception as e:
                            print(f"[WARN] Error reading {ns_file}: {e}")

        if not data:
            print(f"[WARN] No translation data found for '{code}'")
            continue

        # Save to languages/{code}.json
        with open(lang_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Save to frontend/locales/{code}.json
        frontend_bundle = LOCALES_DIR / f"{code}.json"
        with open(frontend_bundle, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Decompile back to frontend/locales/{code}/*.json for namespace fidelity
        lang_sub = LOCALES_DIR / code
        lang_sub.mkdir(parents=True, exist_ok=True)
        for ns in NAMESPACES:
            ns_content = {}
            if ns in data:
                ns_content[ns] = data[ns]
            # Special case: nav can live in dashboard.json if not standalone
            if ns == "dashboard" and "nav" in data:
                ns_content["nav"] = data["nav"]

            if ns_content:
                with open(lang_sub / f"{ns}.json", "w", encoding="utf-8") as f:
                    json.dump(ns_content, f, ensure_ascii=False, indent=2)

        synced_count += 1
        file_kb = round(lang_file.stat().st_size / 1024, 1)
        print(f"  ✓ {item['name']:<12} ({code}) -> {len(data)} sections | {file_kb} KB")

    print("=" * 60)
    print(f"Sync complete: {synced_count} languages processed with {errors} errors.")
    return errors == 0


if __name__ == "__main__":
    success = sync()
    sys.exit(0 if success else 1)
