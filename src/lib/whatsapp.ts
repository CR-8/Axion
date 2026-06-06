// WhatsApp outbound sending via Meta Cloud API (Graph API v19.0)
// Per-org credentials are preferred; env-var fallback used for webhook/bot flows
// where the org may not yet be known.

import { getAdminSupabase } from "@/lib/supabase";

interface MetaSendOptions {
  phoneNumberId: string;
  accessToken: string;
}

async function resolveMetaCredentials(orgId?: string): Promise<MetaSendOptions> {
  if (orgId) {
    const supabase = getAdminSupabase();
    const { data: settings } = await supabase
      .from("org_settings")
      .select("whatsapp_phone_id, whatsapp_access_token")
      .eq("org_id", orgId)
      .single();

    if (settings?.whatsapp_phone_id && settings?.whatsapp_access_token) {
      return {
        phoneNumberId: settings.whatsapp_phone_id,
        accessToken: settings.whatsapp_access_token,
      };
    }
  }

  // Fall back to environment variables
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN, or configure them in org settings.",
    );
  }

  return { phoneNumberId, accessToken };
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
  orgId?: string,
): Promise<void> {
  const { phoneNumberId, accessToken } = await resolveMetaCredentials(orgId);

  // Normalize: strip any leading "whatsapp:" prefix (Twilio legacy format)
  const toNormalized = to.replace(/^whatsapp:/, "");

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNormalized,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    },
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error("Meta WhatsApp send error:", errData);
    throw new Error(
      (errData as { error?: { message?: string } })?.error?.message ||
        `Meta API error: ${res.status}`,
    );
  }
}
