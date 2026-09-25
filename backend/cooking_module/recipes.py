"""Rule-first recipe suggestion with multi-cuisine continental database and optional Gemini AI upgrade."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set


@dataclass(frozen=True)
class Recipe:
    name: str
    cuisine: str
    spice_level: str
    prep_time_mins: int
    cook_time_mins: int
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    must_have: Set[str]
    optional: Set[str]
    ingredients_needed: List[str]
    steps: List[str]
    chef_tips: str
    difficulty: str = "Easy"
    servings: int = 2
    summary: str = ""

    @property
    def total_time_mins(self) -> int:
        return self.prep_time_mins + self.cook_time_mins

    def score(self, available: Set[str], target_cuisine: Optional[str] = None) -> float:
        if not self.must_have.issubset(available):
            return -1.0
        opt_hits = len(self.optional.intersection(available))
        base_score = float(len(self.must_have) * 2 + opt_hits)
        if target_cuisine and target_cuisine.lower() not in ("all", "global"):
            if self.cuisine.lower() == target_cuisine.lower():
                base_score += 10.0
        return base_score

    def to_dict(self, available: Set[str]) -> Dict[str, Any]:
        used = sorted(self.must_have.union(self.optional).intersection(available).union(self.must_have))
        return {
            "name": self.name,
            "recipe_name": self.name,
            "cuisine": self.cuisine,
            "spice_level": self.spice_level,
            "prep_time_mins": self.prep_time_mins,
            "cook_time_mins": self.cook_time_mins,
            "total_time_mins": self.total_time_mins,
            "difficulty": self.difficulty,
            "servings": self.servings,
            "calories": self.calories,
            "calories_per_serving": self.calories,
            "protein_g": self.protein_g,
            "protein_per_serving_g": self.protein_g,
            "carbs_g": self.carbs_g,
            "carbs_per_serving_g": self.carbs_g,
            "fat_g": self.fat_g,
            "fat_per_serving_g": self.fat_g,
            "ingredients_used": used,
            "ingredients_needed": self.ingredients_needed,
            "steps": self.steps,
            "cooking_steps": self.steps,
            "chef_tips": self.chef_tips,
            "summary": self.summary,
        }


_RECIPES: List[Recipe] = [
    # ── INDIAN CONTINENTAL CUISINE ──────────────────────────────────────────────
    Recipe(
        name="Spiced Indian Egg Curry with Steamed Basmati",
        cuisine="Indian",
        spice_level="Spicy",
        prep_time_mins=10,
        cook_time_mins=15,
        calories=440,
        protein_g=21.0,
        carbs_g=52.0,
        fat_g=14.5,
        must_have={"egg", "rice"},
        optional={"onion", "tomato", "garlic", "oil", "pepper", "lemon"},
        ingredients_needed=[
            "1 cup Basmati Rice (cooked or raw)",
            "3 Hard-boiled Eggs (halved)",
            "1 large Onion (finely diced)",
            "2 ripe Tomatoes (puréed or minced)",
            "3 cloves Garlic (minced)",
            "1 tbsp Olive/Mustard Oil",
            "1/2 tsp Turmeric, 1 tsp Cumin, 1 tsp Chili/Garam Masala",
        ],
        steps=[
            "Cook or reheat 1 cup of fragrant basmati rice until fluffy (10 mins).",
            "Hard-boil 3 eggs, peel, and lightly slit or fry in 1/2 tsp oil until golden (6 mins).",
            "In a skillet, heat 1 tbsp oil over medium heat. Sauté minced garlic and diced onions until golden brown (4 mins).",
            "Add tomato purée, turmeric, cumin, chili powder, and salt. Cook down until oil starts separating (5 mins).",
            "Gently nestle the eggs into the thick aromatic gravy and simmer on low for 3 mins.",
            "Serve hot over the steaming basmati rice with a squeeze of fresh lemon.",
        ],
        chef_tips="Lightly pan-searing the boiled eggs in a pinch of turmeric and oil creates a crispy outer skin that absorbs the gravy beautifully.",
        difficulty="Easy",
        summary="A comforting protein-packed Indian classic featuring whole spices and rich onion-tomato masala reduction.",
    ),
    Recipe(
        name="Aromatic Tomato Onion Chicken Pulao",
        cuisine="Indian",
        spice_level="Medium",
        prep_time_mins=12,
        cook_time_mins=18,
        calories=510,
        protein_g=38.0,
        carbs_g=58.0,
        fat_g=12.0,
        must_have={"chicken", "rice"},
        optional={"onion", "tomato", "garlic", "oil", "pepper"},
        ingredients_needed=[
            "200g Chicken breast or thigh (bite-sized cubes)",
            "1 cup Basmati Rice",
            "1 medium Onion (thinly sliced)",
            "2 medium Tomatoes (chopped)",
            "3 cloves Garlic (minced)",
            "1 tbsp Ghee or Cooking Oil",
            "Cumin seeds, cracked pepper, and salt",
        ],
        steps=[
            "Wash and soak basmati rice for 10 minutes, then drain.",
            "Heat oil in a deep pot over medium-high heat. Add sliced onions and garlic; caramelize until deep golden (5 mins).",
            "Add chicken cubes with salt and cracked pepper; sear on high heat until lightly browned on all sides (4 mins).",
            "Toss in chopped tomatoes and cook until soft and fragrant (3 mins).",
            "Add the soaked rice, 1.8 cups water, cover with lid, and cook on low heat for 12 mins until liquid is absorbed.",
            "Rest covered for 5 minutes before gently fluffing with a fork.",
        ],
        chef_tips="Let the rice rest covered off the heat for 5 minutes before fluffing to ensure perfectly separated grains.",
        difficulty="Moderate",
        summary="One-pot North Indian pulao loaded with tender lean chicken, caramelized onions, and fragrant cumin aromatics.",
    ),
    Recipe(
        name="Dhaba-Style Spiced Egg Bhurji",
        cuisine="Indian",
        spice_level="Spicy",
        prep_time_mins=8,
        cook_time_mins=8,
        calories=320,
        protein_g=24.0,
        carbs_g=8.0,
        fat_g=20.0,
        must_have={"egg"},
        optional={"onion", "tomato", "garlic", "pepper", "oil", "lemon", "cheese"},
        ingredients_needed=[
            "3 large Farm Eggs",
            "1 medium Red Onion (finely chopped)",
            "1 large Tomato (diced)",
            "2 cloves Garlic & ginger (grated)",
            "1 tbsp Butter or Olive Oil",
            "1/2 tsp Cumin, crushed black pepper, and salt",
            "Fresh cilantro and lemon wedge for finishing",
        ],
        steps=[
            "Crack eggs into a bowl, season with salt and pepper, and whisk vigorously.",
            "Melt butter/oil in a skillet on medium heat. Sauté garlic and onions until soft and translucent (3 mins).",
            "Add diced tomatoes and sauté on medium-high until the tomatoes break down into a soft jammy texture (2 mins).",
            "Pour in the beaten eggs. Stir continuously with a spatula over medium-low heat to create soft, pillowy curds (2-3 mins).",
            "Remove while still moist. Finish with a squeeze of fresh lemon and enjoy immediately.",
        ],
        chef_tips="Remove the eggs from heat slightly before they look completely done; carryover heat will keep them moist rather than dry.",
        difficulty="Easy",
        summary="Rustic Indian street-style scrambled eggs infused with sizzling onions, garlic, and tangy tomatoes.",
    ),

    # ── CHINESE CONTINENTAL CUISINE ─────────────────────────────────────────────
    Recipe(
        name="Wok-Tossed Garlic Egg & Chicken Fried Rice",
        cuisine="Chinese",
        spice_level="Medium",
        prep_time_mins=8,
        cook_time_mins=10,
        calories=530,
        protein_g=36.0,
        carbs_g=62.0,
        fat_g=14.0,
        must_have={"rice", "egg"},
        optional={"chicken", "garlic", "onion", "carrot", "peas", "soy", "oil", "pepper"},
        ingredients_needed=[
            "2 cups Cooked Jasmine or Long-grain Rice (preferably day-old or chilled)",
            "2 large Eggs (lightly beaten)",
            "120g Chicken (diced small, optional)",
            "3 cloves Garlic (finely minced)",
            "2 Scallions or 1/2 Onion (diced)",
            "1.5 tbsp Soy Sauce (or Tamari)",
            "1 tbsp Sesame/Vegetable Oil",
            "White pepper to taste",
        ],
        steps=[
            "Ensure cooked rice is cold and grains are gently separated with clean hands.",
            "Heat 1 tsp oil in a wok or large skillet over high heat. Add beaten eggs and soft-scramble for 45 seconds. Remove to a bowl.",
            "Add remaining oil to the smoking hot wok. Sauté minced garlic, onion, and chicken until cooked through (3 mins).",
            "Add cold rice. Toss vigorously on maximum heat for 3 minutes, breaking up clumps.",
            "Drizzle soy sauce along the outer edge of the wok so it caramelizes immediately.",
            "Fold in scrambled eggs and ground white pepper. Toss for 1 more minute and serve sizzling hot.",
        ],
        chef_tips="Drizzling the soy sauce around the perimeter of the hot wok instead of directly on the rice produces authentic 'wok hei' smokiness.",
        difficulty="Easy",
        summary="High-heat Cantonese diner fried rice with crispy garlic, tender chicken bites, and ribboned eggs.",
    ),
    Recipe(
        name="Xi Hong Shi Chao Ji Dan (Authentic Tomato & Egg Stir-Fry)",
        cuisine="Chinese",
        spice_level="Mild",
        prep_time_mins=5,
        cook_time_mins=7,
        calories=290,
        protein_g=16.0,
        carbs_g=14.0,
        fat_g=18.0,
        must_have={"egg", "tomato"},
        optional={"garlic", "onion", "soy", "oil", "pepper"},
        ingredients_needed=[
            "3 large Eggs",
            "2 large Ripe Vine Tomatoes (cut into wedges)",
            "2 cloves Garlic (sliced)",
            "1 tbsp Cooking Oil",
            "1 tsp Soy sauce or pinch of sugar",
            "Pinch of sea salt and scallions",
        ],
        steps=[
            "Whisk eggs with a pinch of salt until frothy.",
            "Heat 1 tbsp oil in a skillet over medium-high heat. Pour in eggs, gently folding for 60 seconds until fluffy curds form. Set aside.",
            "In the same skillet, add sliced garlic and tomato wedges. Cook on medium heat for 3 minutes until tomatoes release rich sweet juices.",
            "Season the tomato reduction with a splash of soy sauce and pinch of salt.",
            "Return the fluffy eggs to the pan. Gently toss together for 30 seconds so eggs soak in the natural tomato sauce.",
            "Plate warm with chopped scallions.",
        ],
        chef_tips="Use very ripe tomatoes so their natural pectin and sugars melt into a silky glaze without needing cornstarch.",
        difficulty="Easy",
        summary="The definitive Chinese home-style comfort dish featuring juicy ripe tomatoes and velvety scrambled eggs.",
    ),

    # ── ITALIAN CONTINENTAL CUISINE ─────────────────────────────────────────────
    Recipe(
        name="Rustic Tuscan Tomato Garlic Chicken Skillet",
        cuisine="Italian",
        spice_level="Mild",
        prep_time_mins=10,
        cook_time_mins=16,
        calories=460,
        protein_g=44.0,
        carbs_g=18.0,
        fat_g=22.0,
        must_have={"chicken", "tomato"},
        optional={"garlic", "onion", "cheese", "oil", "pepper"},
        ingredients_needed=[
            "220g Chicken breast fillets (seasoned with salt & cracked black pepper)",
            "2 large Ripe Tomatoes (diced) or Cherry Tomatoes",
            "4 cloves Fresh Garlic (thinly sliced)",
            "1 tbsp Extra Virgin Olive Oil",
            "1/2 Onion (diced)",
            "20g Parmesan or Mozzarella (grated, optional)",
            "Dried oregano, basil, and black pepper",
        ],
        steps=[
            "Heat extra virgin olive oil in a heavy skillet over medium-high heat.",
            "Place seasoned chicken breasts in skillet. Sear for 5 minutes per side until golden brown and cooked through. Remove to a plate.",
            "Lower heat to medium. Add sliced garlic and onions to pan drippings; sauté 2 minutes until sweet and golden.",
            "Add diced tomatoes, oregano, and black pepper. Simmer for 4 minutes until a rustic marinara forms.",
            "Return chicken to the skillet, spoon rich garlic-tomato sauce over top, and sprinkle cheese if desired.",
            "Cover for 2 minutes to melt cheese and let chicken juices marry into the sauce.",
        ],
        chef_tips="Searing the chicken first and building the tomato sauce directly in the browned pan drippings (fond) yields rich Umami depth.",
        difficulty="Easy",
        summary="Heart-healthy Mediterranean-Italian pan skillet showcasing tender seared chicken in a rustic sweet garlic marinara.",
    ),
    Recipe(
        name="One-Pan Cheesy Garlic Rice Risotto",
        cuisine="Italian",
        spice_level="Mild",
        prep_time_mins=6,
        cook_time_mins=18,
        calories=410,
        protein_g=14.0,
        carbs_g=64.0,
        fat_g=11.0,
        must_have={"rice"},
        optional={"garlic", "onion", "cheese", "oil", "pepper", "lemon"},
        ingredients_needed=[
            "1 cup Rice (Arborio or long-grain)",
            "3 cloves Garlic (minced)",
            "1/2 Onion (finely chopped)",
            "1 tbsp Olive Oil or Butter",
            "30g Grated Cheese (Parmesan, Cheddar, or Mozzarella)",
            "2.2 cups Warm Water or Broth",
            "Black pepper and fresh lemon zest",
        ],
        steps=[
            "Heat olive oil in a saucepan over medium heat. Add finely chopped onion and garlic; cook gently until translucent (3 mins).",
            "Add dry rice to the pan and toast for 2 minutes until the edges turn slightly translucent.",
            "Pour in 1 cup warm water/broth and stir frequently until mostly absorbed (5 mins).",
            "Gradually add remaining water in batches, stirring constantly until rice is tender and creamy (10 mins).",
            "Stir in grated cheese, cracked black pepper, and a squeeze of lemon juice until luscious and glossy.",
            "Serve immediately in warm bowls.",
        ],
        chef_tips="Toasting the raw rice grains in olive oil before adding liquid seals the starch structure and creates that authentic velvety risotto emulsion.",
        difficulty="Moderate",
        summary="Creamy Italian-style stovetop risotto perfumed with sweet sautéed garlic, parmesan richness, and black pepper.",
    ),

    # ── MEXICAN CONTINENTAL CUISINE ─────────────────────────────────────────────
    Recipe(
        name="Sizzling Mexican Chicken & Salsa Rice Bowl",
        cuisine="Mexican",
        spice_level="Spicy",
        prep_time_mins=10,
        cook_time_mins=14,
        calories=520,
        protein_g=42.0,
        carbs_g=54.0,
        fat_g=14.0,
        must_have={"chicken", "rice"},
        optional={"tomato", "onion", "garlic", "pepper", "cheese", "lemon"},
        ingredients_needed=[
            "200g Chicken breast (sliced into strips)",
            "1 cup Cooked Rice",
            "2 ripe Tomatoes (diced)",
            "1/2 Red Onion (chopped)",
            "2 cloves Garlic (minced)",
            "1 tbsp Olive Oil",
            "Chili powder, ground cumin, and cracked black pepper",
            "Lime juice and grated cheese to garnish",
        ],
        steps=[
            "Toss chicken strips with olive oil, cumin, chili powder, and salt.",
            "Heat skillet over high heat. Sear seasoned chicken for 4-5 minutes until caramelized and thoroughly cooked. Set aside.",
            "In the same hot pan, toss onions, garlic, and diced tomatoes for 2 minutes to create a charred pico de gallo base.",
            "Toss in the cooked rice to absorb the spicy pan pan-drippings and tomato salsa (2 mins).",
            "Layer the spiced rice into a bowl, arrange sliced chicken on top, and dress with fresh lime juice and cheese.",
        ],
        chef_tips="High heat is key: getting a light char on the onions and tomatoes mirrors an authentic Mexican street comal flavor.",
        difficulty="Easy",
        summary="Vibrant, zesty Mexican burrito-style bowl packed with lean chicken fajita strips and charred salsa rice.",
    ),
    Recipe(
        name="Huevos Rancheros Quick Scramble Skillet",
        cuisine="Mexican",
        spice_level="Spicy",
        prep_time_mins=6,
        cook_time_mins=8,
        calories=340,
        protein_g=20.0,
        carbs_g=12.0,
        fat_g=22.0,
        must_have={"egg"},
        optional={"tomato", "onion", "garlic", "pepper", "cheese", "oil"},
        ingredients_needed=[
            "3 large Eggs",
            "2 Fresh Tomatoes (diced)",
            "1/2 Onion (diced)",
            "1 clove Garlic (minced)",
            "1 tbsp Oil",
            "1 tsp Chili powder & ground cumin",
            "Cheddar or Monterey Jack cheese (optional)",
        ],
        steps=[
            "Heat oil in skillet on medium-high. Sauté diced onions and garlic for 2 minutes.",
            "Add tomatoes, cumin, and chili powder. Simmer vigorously for 3 minutes until thick and zesty.",
            "Crack eggs directly into the bubbling tomato sauce (or whisk and pour in for scramble).",
            "Cover and cook on medium-low for 3-4 minutes until egg whites are set and yolks remain rich and jammy.",
            "Top with cheese, cracked black pepper, and serve hot.",
        ],
        chef_tips="Covering the skillet traps steam, cooking the egg tops quickly while keeping the salsa reduction thick and savory.",
        difficulty="Easy",
        summary="A hearty Mexican breakfast skillet of farm eggs gently poached in spiced tomato salsa and melted cheese.",
    ),

    # ── MEDITERRANEAN CONTINENTAL CUISINE ───────────────────────────────────────
    Recipe(
        name="Mediterranean Lemon Garlic Chicken & Herb Rice",
        cuisine="Mediterranean",
        spice_level="Mild",
        prep_time_mins=10,
        cook_time_mins=15,
        calories=480,
        protein_g=42.0,
        carbs_g=50.0,
        fat_g=12.0,
        must_have={"chicken", "rice"},
        optional={"lemon", "garlic", "onion", "oil", "pepper", "tomato"},
        ingredients_needed=[
            "200g Chicken breast or tenderloins",
            "1 cup Cooked Rice",
            "Juice of 1 fresh Lemon + zest",
            "3 cloves Garlic (crushed)",
            "1 tbsp Extra Virgin Olive Oil",
            "Dried oregano, sea salt, and black pepper",
        ],
        steps=[
            "Marinate chicken with half the lemon juice, minced garlic, olive oil, oregano, and salt for 5 minutes.",
            "Heat skillet over medium-high heat. Sear chicken for 4-5 minutes per side until golden and cooked through. Remove to rest.",
            "Add cooked rice to the warm skillet with remaining lemon juice and pan juices; toss for 2 minutes until infused with citrus aromatics.",
            "Slice chicken into medallions, serve over the lemon-herb rice bed, and finish with freshly cracked black pepper.",
        ],
        chef_tips="Finishing with both fresh lemon juice and zest provides bright acidity plus aromatic essential citrus oils.",
        difficulty="Easy",
        summary="Clean, vibrant Mediterranean dish powered by high-polyphenol olive oil, zesty lemon, and lean grilled chicken.",
    ),
    Recipe(
        name="Sun-Drenched Tomato Shakshuka",
        cuisine="Mediterranean",
        spice_level="Medium",
        prep_time_mins=8,
        cook_time_mins=12,
        calories=310,
        protein_g=19.0,
        carbs_g=16.0,
        fat_g=18.0,
        must_have={"egg", "tomato"},
        optional={"onion", "garlic", "oil", "pepper", "cheese"},
        ingredients_needed=[
            "3 large Eggs",
            "3 Ripe Tomatoes (diced)",
            "1/2 Onion (thinly sliced)",
            "2 cloves Garlic (sliced)",
            "1 tbsp Cold-Pressed Olive Oil",
            "Ground cumin, smoked paprika, black pepper, and salt",
        ],
        steps=[
            "Heat olive oil in a skillet over medium heat. Sauté sliced onions and garlic until softened (3 mins).",
            "Add diced tomatoes, paprika, cumin, and salt. Simmer over medium heat for 6 minutes until a rich, thick sauce forms.",
            "Use a spoon to create 3 wells in the sauce. Gently crack an egg into each well.",
            "Cover the skillet and cook on low for 4-5 minutes until whites are firm and yolks remain soft and runny.",
            "Garnish with cracked black pepper and serve directly from the pan.",
        ],
        chef_tips="Keep heat low after cracking eggs into the wells so the tomato sauce doesn't scorch while the egg whites set.",
        difficulty="Easy",
        summary="North African & Levantine skillet favorite: eggs gently poached in a simmering cumin-scented tomato reduction.",
    ),
]


def normalize_ingredients(text: str | List[str]) -> Set[str]:
    if isinstance(text, list):
        items = [str(x) for x in text]
    else:
        items = [t.strip() for t in str(text).replace("\n", ",").split(",")]
    out: Set[str] = set()
    for it in items:
        it = it.strip().lower()
        if not it:
            continue
        # light normalization
        it = it.replace("eggs", "egg").replace("tomatoes", "tomato").replace("onions", "onion")
        out.add(it)
    return out


def suggest_recipes(
    ingredients: str | List[str],
    cuisine: Optional[str] = None,
    spice_level: Optional[str] = None,
    limit: int = 6,
) -> Dict[str, Any]:
    available = normalize_ingredients(ingredients)
    scored: List[tuple[float, Recipe]] = []

    target_cuisine = cuisine if (cuisine and cuisine.lower() not in ("all", "global")) else None

    for r in _RECIPES:
        s = r.score(available, target_cuisine=target_cuisine)
        if s >= 0:
            # Bonus for matching spice level if provided
            if spice_level and r.spice_level.lower() == spice_level.lower():
                s += 2.0
            scored.append((s, r))

    scored.sort(key=lambda x: -x[0])
    picks = [r for _, r in scored[:limit]]

    # If no strict matches with must_have, fall back to cuisine matches without unselected meats
    if not picks:
        # Strictly forbid suggesting chicken or meats if they are not in the user's available ingredients
        forbidden_proteins = {"chicken", "salmon", "beef", "tuna", "pork", "meat"} - available
        allowed_catalog = [
            r for r in _RECIPES
            if not r.must_have.intersection(forbidden_proteins)
        ]
        if target_cuisine:
            picks = [r for r in allowed_catalog if r.cuisine.lower() == target_cuisine.lower()][:limit]
        else:
            picks = allowed_catalog[:limit]

    formatted_recipes = [r.to_dict(available) for r in picks]
    best_recipe = formatted_recipes[0] if formatted_recipes else None

    return {
        "available": sorted(available),
        "cuisine": cuisine or "Global",
        "spice_level": spice_level or "Medium",
        "best": best_recipe,
        "recipes": formatted_recipes,
        "note": f"Matched {len(formatted_recipes)} regional recipes for {cuisine or 'Global'} cuisine.",
    }
