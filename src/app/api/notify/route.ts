import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId, isAuthorized } from "@/lib/auth-guard";

// POST /api/notify — trigger a notification for a client
// Requires either:
//   a) An authenticated dashboard user (session cookie), OR
//   b) The x-notify-secret header matching NOTIFY_SECRET env var (for cron/internal jobs)
export async function POST(request: NextRequest) {
  // Check for internal secret first (cron / server-to-server)
  const internalSecret = request.headers.get("x-notify-secret");
  const isInternal =
    internalSecret &&
    process.env.NOTIFY_SECRET &&
    internalSecret === process.env.NOTIFY_SECRET;

  // Otherwise require a user session
  let callerOrgId: string | null = null;
  if (!isInternal) {
    const ctx = await getUserOrgId(request);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    callerOrgId = ctx.orgId;
  }

  const body = await request.json() as {
    client_id?: string;
    case_id?: string;
    type?: string;
  };
  const { client_id, case_id, type } = body;

  if (!client_id || !type) {
    return NextResponse.json({ error: "client_id and type required" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  const { data: client } = await supabase
    .from("clients")
    .select("name, phone, org_id")
    .eq("id", client_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Verify the client belongs to the caller's org (for dashboard users)
  if (callerOrgId && !isAuthorized({ userId: "", orgId: callerOrgId }, client.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let message = "";

  if (type === "hearing_reminder" && case_id) {
    const { data: caseData } = await supabase
      .from("cases")
      .select("case_number, court_name, next_hearing_date, org_id")
      .eq("id", case_id)
      .single();

    if (!caseData || caseData.org_id !== client.org_id) {
      return NextResponse.json({ error: "Case not found or org mismatch" }, { status: 403 });
    }

    const hearingDate = caseData.next_hearing_date
      ? new Date(caseData.next_hearing_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "tomorrow";

    message = `⏰ *Hearing Reminder*\n\nDear ${client.name},\n\nThis is a reminder that your case *${caseData.case_number}* has a hearing on *${hearingDate}* at ${caseData.court_name || "the court"}.\n\nPlease be present or inform your lawyer if you cannot attend.`;
  } else if (type === "status_change" && case_id) {
    const { data: caseData } = await supabase
      .from("cases")
      .select("case_number, status, org_id")
      .eq("id", case_id)
      .single();

    if (!caseData || caseData.org_id !== client.org_id) {
      return NextResponse.json({ error: "Case not found or org mismatch" }, { status: 403 });
    }

    const statusLabels: Record<string, string> = {
      active: "Active",
      hearing_scheduled: "Hearing Scheduled",
      adjourned: "Adjourned",
      judgement_pending: "Judgement Pending",
      closed: "Closed",
    };

    message = `📋 *Case Update*\n\nDear ${client.name},\n\nThe status of your case *${caseData.case_number}* has been updated to: *${statusLabels[caseData.status as string] || caseData.status}*\n\nReply with your case number or contact your lawyer for more details.`;
  } else {
    message = `📬 Hello ${client.name}, you have a new update from your legal team. Please message us with your Case ID to get started.`;
  }

  try {
    await sendWhatsAppMessage(client.phone as string, message, client.org_id as string);
    return NextResponse.json({ success: true, message });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
