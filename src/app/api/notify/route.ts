import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";

// POST /api/notify — manually trigger a notification for demo
export async function POST(request: NextRequest) {
  const { client_id, case_id, type } = await request.json();

  if (!client_id || !type) {
    return NextResponse.json({ error: "client_id and type required" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("name, phone")
    .eq("id", client_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let message = "";

  if (type === "hearing_reminder" && case_id) {
    const { data: caseData } = await supabase
      .from("cases")
      .select("case_number, court_name, next_hearing_date")
      .eq("id", case_id)
      .single();

    const hearingDate = caseData?.next_hearing_date
      ? new Date(caseData.next_hearing_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "tomorrow";

    message = `⏰ *Hearing Reminder*\n\nDear ${client.name},\n\nThis is a reminder that your case *${caseData?.case_number}* has a hearing on *${hearingDate}* at ${caseData?.court_name || "the court"}.\n\nPlease be present or inform your lawyer if you cannot attend.`;
  } else if (type === "status_change" && case_id) {
    const { data: caseData } = await supabase
      .from("cases")
      .select("case_number, status")
      .eq("id", case_id)
      .single();

    const statusLabels: Record<string, string> = {
      active: "Active",
      hearing_scheduled: "Hearing Scheduled",
      adjourned: "Adjourned",
      judgement_pending: "Judgement Pending",
      closed: "Closed",
    };

    message = `📋 *Case Update*\n\nDear ${client.name},\n\nThe status of your case *${caseData?.case_number}* has been updated to: *${statusLabels[caseData?.status || ""] || caseData?.status}*\n\nReply with your case status or contact your lawyer for more details.`;
  } else {
    message = `📬 Hello ${client.name}, you have a new update from your legal team. Please message us with your Case ID to get started.`;
  }

  try {
    await sendWhatsAppMessage(client.phone, message);
    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
