// Intent detection for bot messages
// Returns the intent type so the webhook can route accordingly

export type Intent =
  | "case_status"
  | "documents"
  | "lawyer_contact"
  | "hearing_date"
  | "upload" // user is sending a media file
  | "fallback_ai";

const STATUS_KEYWORDS = [
  "status",
  "case status",
  "my case",
  "what is my",
  "update",
  "progress",
  "current status",
  "स्थिति", // Hindi: sthiti
  "केस",
  "मामला",
];

const DOCUMENT_KEYWORDS = [
  "document",
  "documents",
  "doc",
  "file",
  "files",
  "papers",
  "my documents",
  "दस्तावेज़", // Hindi
  "कागज़",
];

const LAWYER_KEYWORDS = [
  "lawyer",
  "advocate",
  "attorney",
  "contact",
  "phone",
  "number",
  "call",
  "वकील", // Hindi
  "अधिवक्ता",
];

const HEARING_KEYWORDS = [
  "hearing",
  "next hearing",
  "court date",
  "date",
  "when",
  "schedule",
  "तारीख", // Hindi
  "सुनवाई",
  "अगली तारीख",
];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function detectIntent(messageText: string, hasMedia = false): Intent {
  if (hasMedia) return "upload";

  if (containsAny(messageText, HEARING_KEYWORDS)) return "hearing_date";
  if (containsAny(messageText, STATUS_KEYWORDS)) return "case_status";
  if (containsAny(messageText, DOCUMENT_KEYWORDS)) return "documents";
  if (containsAny(messageText, LAWYER_KEYWORDS)) return "lawyer_contact";

  return "fallback_ai";
}
