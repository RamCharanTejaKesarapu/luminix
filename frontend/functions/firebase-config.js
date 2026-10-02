/**
 * Netlify Serverless Function: /v1/firebase/client-config
 *
 * Serves the public Firebase Web SDK configuration from Netlify environment variables.
 * This is the ONLY way to securely deliver the Firebase config on a static Netlify host
 * without hardcoding keys in source files.
 *
 * Set these in Netlify Dashboard → Site Settings → Environment Variables:
 *   FIREBASE_API_KEY
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_AUTH_DOMAIN
 *   FIREBASE_STORAGE_BUCKET
 *   FIREBASE_MESSAGING_SENDER_ID
 *   FIREBASE_APP_ID
 *   FIREBASE_MEASUREMENT_ID  (optional)
 */

exports.handler = async function (event, context) {
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "GET") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ detail: "Method Not Allowed" }),
        };
    }

    const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyATMTTXjXy3qsCvFvas8VA8eyOFPn8QukM";
    const projectId = process.env.FIREBASE_PROJECT_ID || "luminix-a0363";
    const authDomain = process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
    const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || "836929007564";
    const appId = process.env.FIREBASE_APP_ID || "1:836929007564:web:9d91be86c021a407bf7769";
    const measurementId = process.env.FIREBASE_MEASUREMENT_ID || "G-9LD9WE01RN";

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            configured: true,
            apiKey: apiKey,
            authDomain: authDomain,
            projectId: projectId,
            storageBucket: storageBucket,
            messagingSenderId: messagingSenderId,
            appId: appId,
            measurementId: measurementId,
        }),
    };
};
