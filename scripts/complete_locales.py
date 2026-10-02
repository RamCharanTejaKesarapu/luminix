#!/usr/bin/env python3
"""
Luminix Complete 100% Localization Builder
Generates and verifies 100% key completeness across all 16 supported languages.
Strict adherence to Zero English Leftover Policy.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANG_DIR = ROOT / "languages"
LOCALES_DIR = ROOT / "frontend" / "locales"

# Load master English dictionary (617 keys)
with open(LANG_DIR / "en.json", "r", encoding="utf-8") as f:
    master_en = json.load(f)

# Total expected keys
total_expected_keys = sum(len(v) for v in master_en.values() if isinstance(v, dict))
print(f"Master English dictionary loaded with {total_expected_keys} keys across {len(master_en)} namespaces.")

LANGUAGES = ['te', 'hi', 'zh', 'es', 'fr', 'de', 'ru', 'tr', 'ar', 'pt', 'ja', 'ko', 'it', 'fil', 'ur']
