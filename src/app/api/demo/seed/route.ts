import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function POST() {
  const supabase = getAdminSupabase();
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Create demo organization
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: "LexBot Demo Law Firm",
        type: "law_firm",
        city: "Mumbai",
        plan: "trial",
      })
      .select()
      .single();
    if (orgErr) throw new Error(`Org create failed: ${orgErr.message}`);
    results.push("Demo law firm created");

    // 2. Create org settings
    await supabase.from("org_settings").insert({
      org_id: org.id,
      bot_name: "LexAssist",
      ai_model: "openai/gpt-4o-mini",
      notify_hearing: true,
      notify_status: true,
      notify_document: true,
      hearing_reminder_hours: 24,
    });
    results.push("Org settings created");

    // 3. Create demo client
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .insert({
        org_id: org.id,
        name: "Rahul Sharma",
        phone: "+919999988877",
        preferred_language: "hi",
        id_proof_type: "aadhaar",
        notes: "Demo client for hackathon presentation",
      })
      .select()
      .single();
    if (clientErr) throw new Error(`Client create failed: ${clientErr.message}`);
    results.push("Demo client created (Rahul Sharma, +919999988877)");

    // 4. Create demo case
    const { data: caseData, error: caseErr } = await supabase
      .from("cases")
      .insert({
        org_id: org.id,
        client_id: client.id,
        case_number: "CC/2026/0042",
        court_name: "High Court of Bombay",
        court_city: "Mumbai",
        case_type: "civil",
        status: "hearing_scheduled",
        next_hearing_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        assigned_lawyer_name: "Adv. Priya Mehta",
        notes: "Property dispute — both parties agreed for mediation.",
      })
      .select()
      .single();
    if (caseErr) throw new Error(`Case create failed: ${caseErr.message}`);
    results.push("Demo case created (CC/2026/0042, hearing in 7 days)");

    // 5. Create a conversation for the demo client
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({
        org_id: org.id,
        phone: "+919999988877",
        name: "Rahul Sharma",
        client_id: client.id,
        case_id: caseData.id,
        mode: "agent",
        session_state: "verified",
        preferred_language: "hi",
      })
      .select()
      .single();
    if (convoErr) throw new Error(`Conversation create failed: ${convoErr.message}`);
    results.push("Demo WhatsApp conversation linked");

    // 6. Seed some sample messages in the conversation
    const msgTime = new Date();
    const messages = [
      { role: "user", content: "LF-2024-0042", created_at: new Date(msgTime.getTime() - 3600000) },
      { role: "assistant", content: "Thank you! I found your case. To verify your identity, please confirm your full name as registered with us.", created_at: new Date(msgTime.getTime() - 3590000) },
      { role: "user", content: "Rahul Sharma", created_at: new Date(msgTime.getTime() - 3500000) },
      { role: "assistant", content: "✅ Identity verified! Welcome, Rahul Sharma.\n\n*Case:* CC/2026/0042\n*Status:* Hearing Scheduled\n*Next Hearing:* 14 Jun 2026\n*Lawyer:* Adv. Priya Mehta\n\nYou can ask me about your case status, documents, hearing dates, or your lawyer's contact. How can I help you?", created_at: new Date(msgTime.getTime() - 3490000) },
      { role: "user", content: "What is the status of my case?", created_at: new Date(msgTime.getTime() - 3000000) },
      { role: "assistant", content: "📋 *Case Status Update*\n\n*Case:* CC/2026/0042\n*Court:* High Court of Bombay, Mumbai\n*Status:* Hearing Scheduled\n*Next Hearing:* 14 Jun 2026\n*Lawyer:* Adv. Priya Mehta\n\n_⚠️ Not legal advice. Source: case record._", created_at: new Date(msgTime.getTime() - 2990000) },
      { role: "user", content: "Mujhe agli sunvayi kab hai?", created_at: new Date(msgTime.getTime() - 1800000) },
      { role: "assistant", content: "📅 *अगली सुनवाई*\n\n*केस:* CC/2026/0042\n*कोर्ट:* High Court of Bombay\n*तारीख:* 14 Jun 2026\n\nकृपया उपस्थित रहें या अपने वकील को सूचित करें यदि आप उपस्थित नहीं हो सकते।\n\n_⚠️ यह कानूनी सलाह नहीं है। स्रोत: केस रिकॉर्ड।_", created_at: new Date(msgTime.getTime() - 1790000) },
    ];

    for (const msg of messages) {
      await supabase.from("messages").insert({
        conversation_id: convo.id,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
      });
    }
    results.push("7 demo messages seeded");

    // 7. Seed case events for audit timeline
    const events = [
      { event_type: "status_change", old_value: "active", new_value: "hearing_scheduled", note: "Next hearing date fixed", created_by_name: "Adv. Priya Mehta" },
      { event_type: "hearing_updated", old_value: null, new_value: "14 Jun 2026", note: "Hearing scheduled", created_by_name: "Adv. Priya Mehta" },
      { event_type: "lawyer_changed", old_value: null, new_value: "Adv. Priya Mehta", note: "Lawyer assigned", created_by_name: "Admin" },
    ];

    for (const ev of events) {
      await supabase.from("case_events").insert({
        case_id: caseData.id,
        event_type: ev.event_type,
        old_value: ev.old_value,
        new_value: ev.new_value,
        note: ev.note,
        created_by_name: ev.created_by_name,
      });
    }
    results.push("3 audit timeline events seeded");

    // 8. Upload a sample document
    await supabase.from("documents").insert({
      org_id: org.id,
      case_id: caseData.id,
      client_id: client.id,
      name: "Property Deed.pdf",
      doc_type: "other",
      storage_path: "demo/property-deed.pdf",
      mime_type: "application/pdf",
      size_bytes: 245760,
      source: "dashboard",
      uploaded_by_name: "Adv. Priya Mehta",
    });
    results.push("Sample document uploaded (Property Deed.pdf)");

    // 9. Create a court monitoring record
    const { data: monitoring } = await supabase
      .from("case_monitoring")
      .insert({
        case_id: caseData.id,
        org_id: org.id,
        external_case_number: "CC/2026/0042",
        court_name: "High Court of Bombay",
        monitoring_status: "active",
      })
      .select()
      .single();
    if (monitoring) {
      await supabase.from("case_updates").insert({
        monitoring_id: monitoring.id,
        case_id: caseData.id,
        update_title: "Next Hearing Date Fixed",
        update_date: new Date().toISOString(),
        update_source: "mock_provider",
        update_content: "After hearing arguments from both sides, the Hon'ble Court has fixed the next date of hearing. Both parties are directed to file their written submissions before the next hearing date.",
        ai_summary: "Court has scheduled the next hearing for 14 Jun 2026. Both sides must submit written arguments before the hearing.",
      });
      results.push("Court monitoring + mock update seeded");
    }

    return NextResponse.json({
      success: true,
      org_id: org.id,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = (err as Error).message || "Seed failed";
    return NextResponse.json({ success: false, error: message, results, errors }, { status: 500 });
  }
}
