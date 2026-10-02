/**
 * Netlify Serverless Function for Luna AI Chat
 * Connects directly to Google Gemini AI models with robust fallbacks.
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
        const userMessage = body.message || body.prompt || body.text || "Hello";
        const userContext = body.user_context || {};
        const profile = userContext.profile || {};
        const wearable = userContext.wearable || {};

        const apiKey = body.apiKey || body.api_key || process.env.GEMINI_API_KEY || "";

        const systemPrompt = `You are Luna AI, the supreme clinical intelligence, sports nutritionist, biomechanics expert, and personal AI companion of Luminix.
You possess deep expertise in exercise physiology, sports science, human kinematics, programming/computer science, mathematics, coding, and holistic wellness.

USER CONTEXT:
- Weight: ${profile.weight_kg || 72} kg | Height: ${profile.height_cm || 175} cm | Age: ${profile.age || 25} | Gender: ${profile.gender || "Not specified"}
- Telemetry: SpO2: ${wearable.spo2 || 98}% | Heart Rate: ${wearable.heartRate || 68} bpm | Sleep: ${wearable.sleepHours || 7}h | Steps: ${wearable.steps || 8420}

CRITICAL RULES:
1. ALWAYS answer the user's specific prompt directly, thoroughly, and expertly.
2. If the user asks for CODE (e.g. Python for loops, JavaScript, functions, debugging, algorithms), provide clean, complete, working, well-commented code with syntax formatting (\`\`\`python ... \`\`\`) and clear explanations.
3. If the user says "hi" or greets you, greet them warmly and concisely as Luna AI.
4. If the user asks for recipes, workouts, biomechanics, or nutrition, provide exact metrics, sets, reps, macros, or timings.
5. NEVER ignore the user's prompt. NEVER return a canned generic menu or predefined wall of text.
6. Format your response cleanly using GitHub-flavored Markdown.`;

        const models = [
            "gemini-3.8-flash",
            "gemini-3.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ];

        for (const model of models) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 9000);

                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        contents: [
                            { role: "user", parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${userMessage}` }] }
                        ],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2500
                        }
                    })
                });

                clearTimeout(timeoutId);

                if (geminiRes.ok) {
                    const data = await geminiRes.json();
                    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (replyText && replyText.trim()) {
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
                                reply: replyText.trim()
                            })
                        };
                    }
                }
            } catch (err) {
                console.warn(`Model ${model} attempt in serverless chat failed:`, err.message);
            }
        }

        return {
            statusCode: 502,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                status: "error",
                message: "Gemini AI chat service unavailable",
                reply: null
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
                message: err.message
            })
        };
    }
};
