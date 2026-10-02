#!/usr/bin/env python3
"""
Comprehensive Localization Compiler for Luminix
Builds complete 617-key native dictionaries for Hindi, Arabic, Urdu, Spanish,
French, German, Russian, Portuguese, Japanese, Korean, Italian, Filipino.
"""

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
LANGUAGES_DIR = ROOT_DIR / "languages"
LOCALES_DIR = ROOT_DIR / "frontend" / "locales"

# Load en.json
with open(LANGUAGES_DIR / "en.json", "r", encoding="utf-8") as f:
    master_en = json.load(f)

print(f"Loaded master en with {sum(len(v) for v in master_en.values() if isinstance(v, dict))} keys.")
