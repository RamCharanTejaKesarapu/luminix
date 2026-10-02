#!/usr/bin/env python3
"""
Master Localization Compiler for Luminix
Merges existing translations, namespace files, and curated native dictionary modules
to guarantee 100% key coverage (617 keys) across all 16 supported languages.

Outputs to:
1. languages/<lang>.json
2. frontend/locales/<lang>.json
3. frontend/locales/<lang>/<namespace>.json (all 11 namespaces)
"""

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
LANGUAGES_DIR = ROOT_DIR / "languages"
LOCALES_DIR = ROOT_DIR / "frontend" / "locales"

# Supported language codes
ALL_LANGS = [
    'en', 'te', 'hi', 'zh', 'es', 'fr', 'de', 'ru',
    'tr', 'ar', 'pt', 'ja', 'ko', 'it', 'fil', 'ur'
]

# Load master English dictionary
with open(LANGUAGES_DIR / "en.json", "r", encoding="utf-8") as f:
    master_en = json.load(f)

print(f"Master EN dictionary loaded with {sum(len(v) for v in master_en.values() if isinstance(v, dict))} keys.")

def get_locale_data(lang_code):
    """Dynamically load translation module from scripts/locales_data/<lang>.py"""
    if lang_code == 'en':
        return master_en
    if lang_code == 'ar':
        from scripts.build_remaining_locales import AR_TRANSLATIONS
        return AR_TRANSLATIONS
    
    var_name = f"{lang_code.upper()}_TRANSLATIONS"
    mod = __import__(f"scripts.locales_data.{lang_code}", fromlist=[var_name])
    return getattr(mod, var_name)

# Process each language
for lang in ALL_LANGS:
    final_dict = {}
    
    # 1. Start with existing languages/<lang>.json if present
    existing_lang_file = LANGUAGES_DIR / f"{lang}.json"
    if existing_lang_file.exists():
        try:
            with open(existing_lang_file, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                for ns, val in existing_data.items():
                    if isinstance(val, dict):
                        final_dict[ns] = dict(val)
        except Exception as e:
            print(f"[{lang}] Error reading {existing_lang_file}: {e}")

    # 2. Merge existing namespace files in frontend/locales/<lang>/
    lang_dir = LOCALES_DIR / lang
    if lang_dir.is_dir():
        for ns_file in lang_dir.glob("*.json"):
            ns = ns_file.stem
            try:
                with open(ns_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if ns in data and isinstance(data[ns], dict):
                        ns_data = data[ns]
                    else:
                        ns_data = data
                    if ns not in final_dict:
                        final_dict[ns] = {}
                    final_dict[ns].update(ns_data)
            except Exception as e:
                print(f"[{lang}] Error reading {ns_file}: {e}")

    # 3. Merge curated native translations from module
    mod_data = get_locale_data(lang)
    mapping = {
        'sanmonHead': 'sanmonHeading',
        'stillGardensApproach': 'cardApproach',
        'stillGardensApproachMeta': 'cardApproachSub',
        'stillGardensApproachDesc': 'cardApproachDesc',
        'stillGardensLanterns': 'cardLanterns',
        'stillGardensLanternsMeta': 'cardLanternsSub',
        'stillGardensLanternsDesc': 'cardLanternsDesc',
        'stillGardensMoonwater': 'cardMoonwater',
        'stillGardensMoonwaterMeta': 'cardMoonwaterSub',
        'stillGardensMoonwaterDesc': 'cardMoonwaterDesc',
        'sacredCraftHead': 'craftHeading',
        'sacredCraftSub': 'craftLead',
        'craftVisionTitle': 'disciplineVision',
        'craftVisionDesc': 'disciplineVisionDesc',
        'craftStrengthTitle': 'disciplineStrength',
        'craftStrengthDesc': 'disciplineStrengthDesc',
        'craftYogaTitle': 'disciplineEquilibrium',
        'craftYogaDesc': 'disciplineEquilibriumDesc',
        'craftBmiTitle': 'disciplineAlchemy',
        'craftBmiDesc': 'disciplineAlchemyDesc',
        'craftFoodTitle': 'disciplineSustenance',
        'craftFoodDesc': 'disciplineSustenanceDesc',
        'craftOracleTitle': 'disciplineOracle',
        'craftOracleDesc': 'disciplineOracleDesc',
        'oracleHead': 'oracleHeading',
        'oracleSub': 'oracleLead',
        'oraclePrompt1Title': 'oraclePrompt1Label',
        'oraclePrompt2Title': 'oraclePrompt2Label',
        'oraclePrompt3Title': 'oraclePrompt3Label',
        'afterlightDesc': 'afterlightLead',
        'faqHead': 'faqHeading',
        'faqSub': 'faqLead',
        'creatorEyebrow': 'architectSubtitle',
        'creatorHead': 'architectHeading',
        'creatorSub': 'architectLead',
        'creatorRole': 'architectRole',
        'creatorBio': 'architectTagline',
        'creatorViewDossier': 'architectViewDossier',
        'creatorSupportSanctuary': 'architectDonate'
    }
    
    for ns, keys in mod_data.items():
        if isinstance(keys, dict):
            if ns not in final_dict:
                final_dict[ns] = {}
            mod_ns = dict(keys)
            if ns == 'dashboard':
                for src, dst in mapping.items():
                    if src in mod_ns and dst not in mod_ns:
                        mod_ns[dst] = mod_ns[src]
            final_dict[ns].update(mod_ns)

    # Ensure heroTitle is populated
    if 'dashboard' in final_dict:
        if 'heroTitle' not in final_dict['dashboard'] or not final_dict['dashboard']['heroTitle']:
            l1 = final_dict['dashboard'].get('heroLine1', '')
            l2 = final_dict['dashboard'].get('heroLine2', '')
            l3 = final_dict['dashboard'].get('heroLine3', '')
            final_dict['dashboard']['heroTitle'] = f"{l1} {l2} {l3}".strip()

    # 4. Verification and fallback against master_en
    missing_count = 0
    for ns, en_keys in master_en.items():
        if not isinstance(en_keys, dict):
            continue
        if ns not in final_dict:
            final_dict[ns] = {}
        for k, v in en_keys.items():
            if k not in final_dict[ns] or not final_dict[ns][k]:
                # If key missing in non-English, use master English as last fallback
                final_dict[ns][k] = v
                missing_count += 1

    total_keys = sum(len(v) for v in final_dict.values() if isinstance(v, dict))
    print(f"[{lang}] Compiled: {total_keys} keys (missing/fallback filled: {missing_count})")

    # 5. Write to languages/<lang>.json
    with open(LANGUAGES_DIR / f"{lang}.json", "w", encoding="utf-8") as f:
        json.dump(final_dict, f, ensure_ascii=False, indent=2)

    # 6. Write to frontend/locales/<lang>.json (unified file for fast single HTTP request)
    with open(LOCALES_DIR / f"{lang}.json", "w", encoding="utf-8") as f:
        json.dump(final_dict, f, ensure_ascii=False, indent=2)

    # 7. Write to individual namespace files frontend/locales/<lang>/<ns>.json
    lang_ns_dir = LOCALES_DIR / lang
    lang_ns_dir.mkdir(parents=True, exist_ok=True)
    for ns, data in final_dict.items():
        if isinstance(data, dict):
            # Save either wrapped or flat. We save standard { ns: data } format
            with open(lang_ns_dir / f"{ns}.json", "w", encoding="utf-8") as f:
                json.dump({ns: data}, f, ensure_ascii=False, indent=2)

print("\n--- ALL 16 LANGUAGES SUCCESSFULLY COMPILED AND VERIFIED ---")
