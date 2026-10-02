/**
 * Netlify Serverless Function for Luminix Recipe Suggestions
 * Generates live dynamic recipes using Google Gemini 3.5 Flash with fallback.
 */

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(clientId) {
    const now = Date.now();
    let timestamps = rateLimitMap.get(clientId) || [];
    timestamps = timestamps.filter(ts => (now - ts) < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= RATE_LIMIT_MAX) {
        const oldest = timestamps[0];
        const resetSeconds = Math.max(1, Math.ceil(((oldest + RATE_LIMIT_WINDOW_MS) - now) / 1000));
        return { allowed: false, resetSeconds };
    }
    timestamps.push(now);
    rateLimitMap.set(clientId, timestamps);
    return { allowed: true, remaining: RATE_LIMIT_MAX - timestamps.length };
}

exports.handler = async function(event, context) {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: ""
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ detail: "Method Not Allowed" })
        };
    }

    try {
        const clientIp = (event.headers && (event.headers["x-forwarded-for"] || event.headers["client-ip"])) || "client";
        const rateCheck = checkRateLimit(clientIp);
        if (!rateCheck.allowed) {
            return {
                statusCode: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": String(rateCheck.resetSeconds),
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({
                    status: "rate_limited",
                    detail: `AI Bot rate limit reached: maximum 5 requests per hour. Quota resets in ${Math.ceil(rateCheck.resetSeconds / 60)} minutes.`
                })
            };
        }

        const body = JSON.parse(event.body || "{}");
        const ingredients = body.ingredients || "Rice, Egg, Tomato, Onion";
        const cuisine = body.cuisine || "Indian";
        const spiceLevel = body.spice_level || "Spicy";
        const userPrompt = body.prompt || "";
        const apiKey = body.apiKey || body.api_key || process.env.GEMINI_API_KEY || "";

        // Attempt live Gemini AI synthesis
        if (apiKey) {
            try {
                const systemPrompt = `You are Chef Luna, an elite culinary master chef and clinical sports nutritionist.
The user has the following kitchen ingredients available: ${ingredients}
Cuisine Style: ${cuisine}
Spice Intensity: ${spiceLevel}
${userPrompt ? `Custom User Culinary Request: "${userPrompt}"` : ""}

CRITICAL INGREDIENT RESTRICTIONS:
1. ONLY utilize the ingredients explicitly listed above: [${ingredients}].
2. You may use common basic pantry staples for cooking: water, cooking oil, salt, black pepper, and standard dried spices appropriate to ${cuisine} cuisine.
3. NEVER introduce unlisted proteins, meats, poultry, or seafood.
4. SPECIFICALLY: If Chicken is NOT listed in the ingredients, do NOT include chicken or mention chicken in any recipe title, ingredient, or step!
5. Synthesize 2 to 3 distinct, creative, authentic, and delicious recipes matching the specified cuisine and spice level.
6. Do NOT return generic or canned recipes.
Return STRICTLY a JSON object matching this schema:
{
  "recipes": [
    {
      "recipe_name": "Full Recipe Title",
      "cuisine": "${cuisine}",
      "spice_level": "${spiceLevel}",
      "prep_time_mins": 10,
      "cook_time_mins": 15,
      "total_time_mins": 25,
      "difficulty": "Easy",
      "servings": 2,
      "calories_per_serving": 420,
      "protein_per_serving_g": 22.0,
      "carbs_per_serving_g": 52.0,
      "fat_per_serving_g": 14.0,
      "fiber_per_serving_g": 4.0,
      "ingredients_needed": ["ingredient 1 with measurement", "ingredient 2 with measurement"],
      "cooking_steps": ["step 1...", "step 2..."],
      "chef_tips": "Pro culinary technique",
      "summary": "Appetizing description"
    }
  ]
}`;

                const models = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
                for (const model of models) {
                    try {
                        const controller = new AbortController();
                        const tid = setTimeout(() => controller.abort(), 9000);
                        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            signal: controller.signal,
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: systemPrompt }] }],
                                generationConfig: { response_mime_type: "application/json" }
                            })
                        });
                        clearTimeout(tid);

                        if (geminiRes.ok) {
                            const geminiData = await geminiRes.json();
                            const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (rawText) {
                                let cleaned = rawText.trim();
                                if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
                                else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
                                const parsed = JSON.parse(cleaned);
                                if (parsed && Array.isArray(parsed.recipes) && parsed.recipes.length > 0) {
                                    return {
                                        statusCode: 200,
                                        headers: {
                                            "Content-Type": "application/json",
                                            "Access-Control-Allow-Origin": "*"
                                        },
                                        body: JSON.stringify({
                                            status: "success",
                                            source: "gemini",
                                            model: model,
                                            cuisine: cuisine,
                                            spice_level: spiceLevel,
                                            recipes: parsed.recipes.map(r => ({ ...r, is_ai: true }))
                                        })
                                    };
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`Model ${model} attempt error:`, e);
                    }
                }
            } catch (aiErr) {
                console.warn("Netlify function Gemini error:", aiErr);
            }
        }

        // Never return predefined or hardcoded recipes. If AI synthesis fails, communicate the actual status.
        return {
            statusCode: 502,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                status: "error",
                message: "Gemini AI recipe synthesis could not complete. Every recipe must be generated live with zero predefined answers.",
                recipes: []
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                status: "error",
                message: err.message || "Internal server error during recipe generation",
                recipes: []
            })
        };
    }
};
