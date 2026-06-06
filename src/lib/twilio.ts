import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export async function sendWhatsAppMessage(to: string, body: string) {
  // Ensure the number has the whatsapp: prefix for Twilio
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g. "whatsapp:+14155238886"

  return client.messages.create({
    from,
    to: toFormatted,
    body,
  });
}
