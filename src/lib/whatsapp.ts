// WhatsApp message sending — uses Twilio for outbound delivery
// Meta Cloud API is used for receiving (webhook), Twilio for sending

export async function sendWhatsAppMessage(to: string, body: string) {
  // Twilio requires "whatsapp:+XXXXXXXXXX" format
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const from = process.env.TWILIO_WHATSAPP_FROM!;

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: toFormatted,
        Body: body,
      }).toString(),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("Twilio send error:", data);
    throw new Error(data?.message || "Twilio send failed");
  }

  return data;
}
