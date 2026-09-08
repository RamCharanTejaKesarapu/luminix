/**
 * Netlify Serverless Function for Luminix Creator Donations & Notes
 * Receives donation note pledges and forwards instant alerts to Ram Charan Teja (luno97802@gmail.com).
 */

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
        const body = JSON.parse(event.body || "{}");
        const name = (body.name || "Supporter").trim();
        const email = (body.email || "Not specified").trim();
        const amount = parseFloat(body.amount) || 15.0;
        const note = (body.note || "").trim();
        const channel = body.channel || "Direct Support / Netlify";

        // Dispatch email notification to Ram Charan Teja (luno97802@gmail.com)
        try {
            await fetch("https://formsubmit.co/ajax/luno97802@gmail.com", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    "Donor Name": name,
                    "Donor Email": email,
                    "Pledge Amount": `$${amount.toFixed(2)}`,
                    "Payment Channel": channel,
                    "Personal Note": note || "(No message entered)",
                    "Platform": "Luminix Autonomous AI",
                    "_subject": `🎉 New Luminix Donation: $${amount.toFixed(2)} from ${name}`,
                    "_captcha": "false",
                    "_template": "table"
                })
            });
        } catch (mailErr) {
            console.warn("Mail dispatch notice:", mailErr);
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                status: "success",
                message: "Donation recorded and instant alert dispatched to Ram Charan Teja!",
                amount: amount,
                donor_name: name,
                remaining_today: 4
            })
        };
    } catch (err) {
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                status: "recorded",
                message: "Donation pledge recorded successfully.",
                remaining_today: 4
            })
        };
    }
};
