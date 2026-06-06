// case-sync.ts
// Orchestrates the full case monitoring sync workflow:
//   1. Fetch monitoring record
//   2. Call court provider for updates
//   3. For each new update: insert record, AI summary, timeline event, notification, WhatsApp
//   4. Update monitoring timestamps

import { getAdminSupabase } from "@/lib/supabase";
import { getCourtProvider } from "@/lib/court-provider";
import { summarizeCourtUpdate } from "@/lib/legal-ai";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import type { CaseMonitoring } from "@/lib/types";

export interface SyncResult {
  newUpdates: number;
  errors: string[];
}

export async function syncCase(
  caseId: string,
  monitoringId: string,
): Promise<SyncResult> {
  const supabase = getAdminSupabase();
  const result: SyncResult = { newUpdates: 0, errors: [] };

  // 1. Fetch monitoring record
  const { data: monitoring, error: monErr } = await supabase
    .from("case_monitoring")
    .select("*")
    .eq("id", monitoringId)
    .single<CaseMonitoring>();

  if (monErr || !monitoring) {
    return { newUpdates: 0, errors: ["Monitoring record not found."] };
  }

  if (monitoring.monitoring_status !== "active") {
    return { newUpdates: 0, errors: ["Monitoring is paused."] };
  }

  // 2. Fetch case + client info for WhatsApp
  const { data: caseData } = await supabase
    .from("cases")
    .select("case_number, court_name, org_id, client_id, clients(name, phone)")
    .eq("id", caseId)
    .single();

  if (!caseData) {
    return { newUpdates: 0, errors: ["Case not found."] };
  }

  // 3. Call court provider
  const provider = getCourtProvider();
  let courtUpdates;
  try {
    courtUpdates = await provider.fetchUpdates(
      monitoring.external_case_number,
      monitoring.court_name,
      monitoring.last_known_update_at,
    );
  } catch (err) {
    const msg = (err as Error).message || "Provider fetch failed";
    await supabase
      .from("case_monitoring")
      .update({ monitoring_status: "error", updated_at: new Date().toISOString() })
      .eq("id", monitoringId);
    return { newUpdates: 0, errors: [msg] };
  }

  if (courtUpdates.length === 0) {
    // No new updates — just update the checked timestamp
    await supabase
      .from("case_monitoring")
      .update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", monitoringId);
    return result;
  }

  // 4. Process each update
  let latestUpdateDate = monitoring.last_known_update_at;

  for (const update of courtUpdates) {
    try {
      // a. Generate AI summary
      let aiSummary: string | null = null;
      try {
        aiSummary = await summarizeCourtUpdate(
          update.content,
          caseData.case_number,
          caseData.court_name || undefined,
        );
      } catch {
        aiSummary = null; // Non-blocking — continue without summary
      }

      // b. Insert case_updates record
      const { data: insertedUpdate } = await supabase
        .from("case_updates")
        .insert({
          monitoring_id: monitoringId,
          case_id: caseId,
          update_title: update.title,
          update_date: update.date,
          update_source: update.source,
          update_content: update.content,
          ai_summary: aiSummary,
        })
        .select("id")
        .single();

      // c. Insert case_event for timeline
      await supabase.from("case_events").insert({
        case_id: caseId,
        event_type: "court_update",
        old_value: null,
        new_value: aiSummary || update.title,
        note: update.title,
        created_by: null,
        created_by_name: "Court Monitor",
      });

      // d. Insert notification
      await supabase.from("notifications").insert({
        org_id: caseData.org_id,
        type: "court_update",
        title: `Court Update: ${update.title}`,
        body: aiSummary || update.content?.slice(0, 200) || update.title,
        case_id: caseId,
        metadata: { update_id: insertedUpdate?.id || null },
      });

      // e. Auto-send WhatsApp to client
      const clientArr = caseData.clients as unknown as { name: string; phone: string }[] | null;
      const client = clientArr?.[0] ?? null;
      if (client?.phone) {
        try {
          const whatsappMessage = [
            `📋 *Court Update — ${caseData.case_number}*`,
            ``,
            `*${update.title}*`,
            ``,
            aiSummary || update.content || "",
            ``,
            `For more details, please contact your lawyer.`,
          ].join("\n");
          await sendWhatsAppMessage(client.phone, whatsappMessage, caseData.org_id as string);
        } catch {
          result.errors.push("WhatsApp delivery failed (non-blocking).");
        }
      }

      result.newUpdates++;

      // Track latest date
      if (!latestUpdateDate || new Date(update.date) > new Date(latestUpdateDate)) {
        latestUpdateDate = update.date;
      }
    } catch (err) {
      result.errors.push(`Failed to process update "${update.title}": ${(err as Error).message}`);
    }
  }

  // 5. Update monitoring record timestamps
  await supabase
    .from("case_monitoring")
    .update({
      last_checked_at: new Date().toISOString(),
      last_known_update_at: latestUpdateDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", monitoringId);

  return result;
}
