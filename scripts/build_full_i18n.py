#!/usr/bin/env python3
"""
Luminix Full-Coverage Localization Generator
Generates and completes 100% translations for all 16 supported languages.
Zero English leftovers policy.
"""

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
LANGUAGES_DIR = ROOT_DIR / "languages"
LOCALES_DIR = ROOT_DIR / "frontend" / "locales"

# Load the master English dictionary (617 keys)
with open(LANGUAGES_DIR / "en.json", "r", encoding="utf-8") as f:
    master_en = json.load(f)

print(f"Master English dictionary loaded with {len(master_en)} namespaces.")
