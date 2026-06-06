import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserOrgId } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { whatsapp_phone_id, whatsapp_access_token, ai_provider, ai_api_key, ai_model } = await request.json();

    const results = {
      aiConnected: false,
      waConnected: false,
      errors: [] as string[],
      logs: [] as string[]
    };

    // 1. Test AI Credentials if provided
    if (ai_api_key) {
      try {
        let baseURL = "https://api.openai.com/v1";
        if (ai_provider === "openrouter") {
          baseURL = "https://openrouter.ai/api/v1";
        }

        const openaiClient = new OpenAI({
          baseURL,
          apiKey: ai_api_key,
          dangerouslyAllowBrowser: false
        });

        // Try a tiny completion call
        const completion = await openaiClient.chat.completions.create({
          model: ai_model || "openai/gpt-4o-mini",
          messages: [{ role: "user", content: "Say ok" }],
          max_tokens: 5,
        });

        if (completion.choices[0]?.message) {
          results.aiConnected = true;
          results.logs.push(`AI Provider connection verified successfully: model ${ai_model} responded.`);
        }
      } catch (err: any) {
        results.errors.push(`AI Testing Failed: ${err.message || err}`);
      }
    } else {
      results.logs.push("AI Key empty. Skipping AI connection test.");
    }

    // 2. Test Twilio credentials if provided
    if (whatsapp_phone_id && whatsapp_access_token) {
      try {
        const auth = Buffer.from(`${whatsapp_phone_id}:${whatsapp_access_token}`).toString("base64");
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${whatsapp_phone_id}.json`, {
          headers: {
            "Authorization": `Basic ${auth}`
          }
        });
        
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          results.waConnected = true;
          results.logs.push(`Twilio credentials verified: Account "${data.friendly_name || "Twilio Project"}" is ${data.status}.`);
        } else {
          results.errors.push(`Twilio Verification Failed: ${data.message || "Invalid Account SID or Auth Token"}`);
        }
      } catch (err: any) {
        results.errors.push(`Twilio Testing Network error: ${err.message || err}`);
      }
    } else {
      results.logs.push("Twilio settings incomplete. Skipping credentials test.");
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      aiConnected: results.aiConnected,
      waConnected: results.waConnected,
      errors: results.errors,
      logs: results.logs
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || err }, { status: 500 });
  }
}
