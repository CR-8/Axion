// ─────────────────────────────────────────────────────────────
// All TypeScript types for LexBot CRM
// ─────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  type: "law_firm" | "legal_aid" | "court_agency" | "other";
  city: string | null;
  plan: "trial" | "paid";
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: "admin" | "lawyer" | "staff";
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface OrgSettings {
  id: string;
  org_id: string;
  whatsapp_phone_id: string | null;
  whatsapp_access_token: string | null;
  whatsapp_verify_token: string | null;
  ai_provider: string;
  ai_api_key: string | null;
  ai_model: string;
  bot_name: string;
  default_language: string;
  system_prompt: string | null;
  notify_hearing: boolean;
  notify_status: boolean;
  notify_document: boolean;
  hearing_reminder_hours: number;
  updated_at: string;
}

export interface Client {
  id: string;
  org_id: string;
  name: string;
  phone: string;
  preferred_language: string;
  address: string | null;
  id_proof_type:
    | "aadhaar"
    | "pan"
    | "passport"
    | "voter_id"
    | "driving_license"
    | "other"
    | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CaseStatus =
  | "active"
  | "hearing_scheduled"
  | "adjourned"
  | "judgement_pending"
  | "closed";

export type CaseType = "civil" | "criminal" | "family" | "property" | "other";

export interface Case {
  id: string;
  org_id: string;
  client_id: string;
  case_number: string;
  court_name: string | null;
  court_city: string | null;
  case_type: CaseType;
  status: CaseStatus;
  next_hearing_date: string | null;
  assigned_lawyer_id: string | null;
  assigned_lawyer_name: string | null;
  ecourts_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseWithClient extends Case {
  clients: Pick<Client, "name" | "phone" | "preferred_language">;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  event_type:
    | "status_change"
    | "hearing_updated"
    | "lawyer_changed"
    | "note_added"
    | "document_uploaded";
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export type DocType =
  | "fir"
  | "affidavit"
  | "pan"
  | "aadhaar"
  | "court_order"
  | "petition"
  | "other";

export interface Document {
  id: string;
  org_id: string;
  case_id: string;
  client_id: string;
  name: string;
  doc_type: DocType;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  source: "dashboard" | "bot";
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  org_id: string | null;
  phone: string;
  name: string | null;
  client_id: string | null;
  case_id: string | null;
  mode: "agent" | "human";
  session_state: "new" | "awaiting_case_id" | "awaiting_name" | "verified";
  session_expires_at: string | null;
  preferred_language: string;
  updated_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  whatsapp_msg_id: string | null;
  created_at: string;
}

export interface ConversationWithLastMessage extends Conversation {
  last_message: string | null;
  client?: Pick<Client, "name" | "phone"> | null;
  case?: Pick<Case, "case_number" | "status"> | null;
}

// ─── UI helpers ───────────────────────────────────────────────

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  active: "Active",
  hearing_scheduled: "Hearing Scheduled",
  adjourned: "Adjourned",
  judgement_pending: "Judgement Pending",
  closed: "Closed",
};

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  active: "text-white bg-white/10 border-white/20",
  hearing_scheduled: "text-zinc-200 bg-zinc-200/10 border-zinc-200/20",
  adjourned: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  judgement_pending: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  closed: "text-white/30 bg-white/5 border-white/10",
};

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  civil: "Civil",
  criminal: "Criminal",
  family: "Family",
  property: "Property",
  other: "Other",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  fir: "FIR",
  affidavit: "Affidavit",
  pan: "PAN Card",
  aadhaar: "Aadhaar",
  court_order: "Court Order",
  petition: "Petition",
  other: "Other",
};

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "pa", label: "Punjabi" },
];
