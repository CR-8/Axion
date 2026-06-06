// WhatsApp outbound sending via Twilio REST API
// Per-org credentials are preferred; env-var fallback used for webhook/bot flows
// where the org may not yet be known.

import { getAdminSupabase } from "@/lib/supabase";

interface TwilioSendOptions {
  accountSid: string;
  authToken: string;
  from: string;
}

async function resolveTwilioCredentials(orgId?: string): Promise<TwilioSendOptions> {
  if (orgId) {
    const supabase = getAdminSupabase();
    const { data: settings } = await supabase
      .from("org_settings")
      .select("whatsapp_phone_id, whatsapp_access_token, whatsapp_verify_token")
      .eq("org_id", orgId)
      .single();

    if (settings?.whatsapp_phone_id?.startsWith("AC") && settings?.whatsapp_access_token) {
      return {
        accountSid: settings.whatsapp_phone_id,
        authToken: settings.whatsapp_access_token,
        from: settings.whatsapp_verify_token || process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      };
    }
  }

  // Fall back to environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in env, or configure them in settings.",
    );
  }

  return { accountSid, authToken, from };
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
  orgId?: string,
): Promise<void> {
  const { accountSid, authToken, from } = await resolveTwilioCredentials(orgId);

  // Twilio requires phone numbers in the format "whatsapp:+1234567890" for WhatsApp
  let toNormalized = to.trim();
  if (!toNormalized.startsWith("whatsapp:")) {
    // Strip any leading plus if it already has it, to avoid doubling
    const cleanNum = toNormalized.startsWith("+") ? toNormalized : `+${toNormalized}`;
    toNormalized = `whatsapp:${cleanNum}`;
  }

  let fromNormalized = from.trim();
  if (!fromNormalized.startsWith("whatsapp:")) {
    const cleanFrom = fromNormalized.startsWith("+") ? fromNormalized : `+${fromNormalized}`;
    fromNormalized = `whatsapp:${cleanFrom}`;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const params = new URLSearchParams();
  params.append("From", fromNormalized);
  params.append("To", toNormalized);
  params.append("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error("Twilio WhatsApp send error:", errData);
    throw new Error(
      errData.message || `Twilio API error: ${res.status}`,
    );
  }
}
