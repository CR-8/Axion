"use client";

import { useState, useEffect, useCallback } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Settings, Bot, Zap, Bell, MessageSquare, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, ShieldCheck, Check, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export default function SettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form State
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [aiProvider, setAiProvider] = useState("openrouter");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("openai/gpt-4o-mini");
  const [botName, setBotName] = useState("LexAssist");
  const [defaultLang, setDefaultLang] = useState("en");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [notifyHearing, setNotifyHearing] = useState(true);
  const [notifyStatus, setNotifyStatus] = useState(true);
  const [notifyDoc, setNotifyDoc] = useState(true);
  const [reminderHours, setReminderHours] = useState(24);

  // Connection Test State
  const [testing, setTesting] = useState(false);
  const [seedResults, setSeedResults] = useState<string[] | null>(null);
  const [seedErrors, setSeedErrors] = useState<string[] | null>(null);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    aiConnected: boolean;
    waConnected: boolean;
    errors: string[];
    logs: string[];
  } | null>(null);

  const loadSettings = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
    if (!m?.org_id) return;
    setOrgId(m.org_id);

    const res = await fetch(`/api/settings?org_id=${m.org_id}`);
    if (res.ok) {
      const s = await res.json();
      if (s) {
        setPhoneId(s.whatsapp_phone_id || "");
        setAccessToken(s.whatsapp_access_token || "");
        setVerifyToken(s.whatsapp_verify_token || "");
        setAiProvider(s.ai_provider || "openrouter");
        setAiApiKey(s.ai_api_key || "");
        setAiModel(s.ai_model || "openai/gpt-4o-mini");
        setBotName(s.bot_name || "LexAssist");
        setDefaultLang(s.default_language || "en");
        setSystemPrompt(s.system_prompt || "");
        setNotifyHearing(s.notify_hearing ?? true);
        setNotifyStatus(s.notify_status ?? true);
        setNotifyDoc(s.notify_document ?? true);
        setReminderHours(s.hearing_reminder_hours || 24);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          whatsapp_phone_id: phoneId,
          whatsapp_access_token: accessToken,
          whatsapp_verify_token: verifyToken,
          ai_provider: aiProvider,
          ai_api_key: aiApiKey,
          ai_model: aiModel,
          bot_name: botName,
          default_language: defaultLang,
          system_prompt: systemPrompt,
          notify_hearing: notifyHearing,
          notify_status: notifyStatus,
          notify_document: notifyDoc,
          hearing_reminder_hours: reminderHours,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save settings");
        toast.error(d.error || "Failed to save settings");
      } else {
        toast.success("Configuration saved successfully!");
      }
    } catch {
      setError("An unexpected error occurred.");
      toast.error("Failed to connect to server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResults(null);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_phone_id: phoneId,
          whatsapp_access_token: accessToken,
          ai_provider: aiProvider,
          ai_api_key: aiApiKey,
          ai_model: aiModel,
        }),
      });
      const data = await res.json();
      setTestResults(data);
      if (data.success) {
        toast.success("All configured connections passed!");
      } else {
        toast.error("Credential testing failed on some integrations.");
      }
    } catch {
      toast.error("Network error during test execution.");
    } finally {
      setTesting(false);
    }
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Wizard Setup Checklist Helpers
  const stepWebhookCopied = !!verifyToken;
  const stepWaCredentials = !!phoneId && !!accessToken;
  const stepAiCredentials = !!aiApiKey && !!aiModel;
  const stepPersonaConfigured = !!botName && !!systemPrompt;
  const wizardProgressPercent = 
    (Number(stepWebhookCopied) + Number(stepWaCredentials) + Number(stepAiCredentials) + Number(stepPersonaConfigured)) * 25;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 text-text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-2.5">
          <Settings className="size-6 text-text-secondary" strokeWidth={1.5} />
          Bot Configuration
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">Configure WhatsApp, AI, and notification settings</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-red-300 text-sm max-w-4xl">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Split Layout: Left Form, Right Setup Status Wizard */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left Forms */}
        <div className="lg:col-span-2 bg-surface border border-border-default rounded-2xl p-6 space-y-5 shadow-sm">
          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-surface-elevated border border-border-default rounded-xl p-1 mb-6">
              <TabsTrigger value="whatsapp" className="text-xs py-2 cursor-pointer">WhatsApp</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs py-2 cursor-pointer">AI Config</TabsTrigger>
              <TabsTrigger value="persona" className="text-xs py-2 cursor-pointer">Persona</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs py-2 cursor-pointer">Notifications</TabsTrigger>
            </TabsList>

            {/* WHATSAPP CONFIG */}
            <TabsContent value="whatsapp" className="space-y-5 mt-0 focus-visible:outline-none">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
                <MessageSquare className="size-4 text-text-secondary" />
                WhatsApp Configuration (Twilio REST API)
              </div>

              <div className="bg-surface-elevated border border-border-default rounded-xl p-4 space-y-1">
                <p className="text-[12px] font-semibold text-foreground">Your Webhook URL</p>
                <p className="font-mono text-[11px] text-text-secondary break-all select-all bg-background/50 px-2 py-1.5 rounded border border-border-default/40">{appUrl}/api/webhook</p>
                <p className="text-[11px] text-text-secondary/60 mt-1">Copy this URL into your Twilio Console &rarr; Messaging/Sandbox settings &rarr; Webhook URL</p>
              </div>

              {[
                { label: "Twilio Account SID", value: phoneId, set: setPhoneId, id: "wa-phone-id", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", sensitive: false },
                { label: "Twilio Auth Token", value: accessToken, set: setAccessToken, id: "wa-token", placeholder: "••••••••••••••••••••••••••••••••", sensitive: true },
                { label: "Twilio Sender Number", value: verifyToken, set: setVerifyToken, id: "wa-verify-token", placeholder: "whatsapp:+14155238886", datalist: "twilio-numbers", sensitive: false },
              ].map(({ label, value, set, id, placeholder, sensitive, datalist }: { label: string; value: string; set: (v: string) => void; id: string; placeholder: string; sensitive?: boolean; datalist?: string }) => (
                <div key={id} className="space-y-1.5">
                  <label htmlFor={id} className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">{label}</label>
                  <div className="relative">
                    <input
                      id={id}
                      type={sensitive && !showToken ? "password" : "text"}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      list={datalist}
                      className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors font-mono pr-10"
                    />
                    {sensitive && (
                      <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors cursor-pointer">
                        {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <datalist id="twilio-numbers">
                <option value="whatsapp:+14155238886" />
                <option value="whatsapp:+918080808080" />
                <option value="+1234567890" />
              </datalist>
            </TabsContent>

            {/* AI CONFIG */}
            <TabsContent value="ai" className="space-y-5 mt-0 focus-visible:outline-none">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
                <Zap className="size-4 text-text-secondary" />
                AI Engine Setup
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ai-provider" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">AI Provider</label>
                <select 
                  value={aiProvider} 
                  onChange={(e) => setAiProvider(e.target.value)} 
                  id="ai-provider"
                  className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors cursor-pointer"
                >
                  <option value="openrouter" className="bg-surface">OpenRouter (Recommended)</option>
                  <option value="openai" className="bg-surface">OpenAI</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ai-api-key" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">API Key (BYOK)</label>
                <div className="relative">
                  <input 
                    id="ai-api-key" 
                    type={showApiKey ? "text" : "password"} 
                    value={aiApiKey} 
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-or-v1-xxxxx…"
                    className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors font-mono pr-10" 
                  />
                  <button type="button" onClick={() => setShowApiKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors cursor-pointer">
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ai-model" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">Model</label>
                <input 
                  id="ai-model" 
                  type="text" 
                  value={aiModel} 
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="Select or type model name"
                  list={aiProvider === "openrouter" ? "openrouter-models" : "openai-models"}
                  className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors font-mono" 
                />
                <datalist id="openrouter-models">
                  <option value="openai/gpt-4o-mini" />
                  <option value="openai/gpt-4o" />
                  <option value="openai/gpt-4-turbo" />
                  <option value="openai/o3-mini" />
                  <option value="anthropic/claude-3.5-sonnet" />
                  <option value="anthropic/claude-3-haiku" />
                  <option value="anthropic/claude-3-opus" />
                  <option value="google/gemini-2.0-flash-001" />
                  <option value="google/gemini-2.0-pro-exp-02-05" />
                  <option value="meta-llama/llama-3.3-70b-instruct" />
                  <option value="mistralai/mistral-7b-instruct" />
                  <option value="deepseek/deepseek-chat" />
                  <option value="cohere/command-r-plus" />
                </datalist>
                <datalist id="openai-models">
                  <option value="gpt-4o-mini" />
                  <option value="gpt-4o" />
                  <option value="gpt-4-turbo" />
                  <option value="gpt-3.5-turbo" />
                  <option value="o3-mini" />
                  <option value="o1-mini" />
                </datalist>
                <p className="text-text-secondary/60 text-[11px] mt-0.5">OpenRouter format: provider/model-name (e.g. openai/gpt-4o-mini). Changes based on selected provider.</p>
              </div>
            </TabsContent>

            {/* BOT PERSONA */}
            <TabsContent value="persona" className="space-y-5 mt-0 focus-visible:outline-none">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
                <Bot className="size-4 text-text-secondary" />
                Assistant Persona
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="bot-name" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">Bot Name</label>
                  <input 
                    id="bot-name" 
                    type="text" 
                    value={botName} 
                    onChange={(e) => setBotName(e.target.value)} 
                    placeholder="LexAssist"
                    className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="bot-lang" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">Default Language</label>
                  <select 
                    id="bot-lang" 
                    value={defaultLang} 
                    onChange={(e) => setDefaultLang(e.target.value)}
                    className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors cursor-pointer"
                  >
                    {[["en","English"],["hi","Hindi"],["ta","Tamil"],["te","Telugu"],["bn","Bengali"],["mr","Marathi"],["gu","Gujarati"]].map(([code, label]) => (
                      <option key={code} value={code} className="bg-surface">{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="system-prompt" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">System Prompt</label>
                <div className="text-[11px] text-text-secondary/60 mb-2">
                  Allowed replacement tokens: <code className="text-foreground font-bold">{"{{bot_name}} {{org_name}} {{client_name}} {{case_number}} {{case_status}} {{next_hearing}} {{assigned_lawyer}}"}</code>
                </div>
                <textarea 
                  id="system-prompt" 
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6} 
                  placeholder="You are {{bot_name}}, a legal assistant for {{org_name}}…"
                  className="w-full bg-background border border-border-default rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-secondary/35 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors resize-none font-mono leading-relaxed" 
                />
              </div>
            </TabsContent>

            {/* NOTIFICATIONS */}
            <TabsContent value="notifications" className="space-y-5 mt-0 focus-visible:outline-none">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
                <Bell className="size-4 text-text-secondary" />
                Notification Alerts
              </div>

              {[
                { label: "Hearing Reminders", desc: "Send WhatsApp alerts before upcoming hearing dates", value: notifyHearing, set: setNotifyHearing, id: "notify-hearing" },
                { label: "Status Change Alerts", desc: "Notify client automatically when case status changes", value: notifyStatus, set: setNotifyStatus, id: "notify-status" },
                { label: "Document Upload Alerts", desc: "Notify client when lawyer uploads a document", value: notifyDoc, set: setNotifyDoc, id: "notify-doc" },
              ].map(({ label, desc, value, set, id }) => (
                <div key={id} className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border-default">
                  <div>
                    <label htmlFor={id} className="text-foreground text-[13px] font-medium block cursor-pointer">{label}</label>
                    <span className="text-text-secondary text-[11px] mt-0.5 block">{desc}</span>
                  </div>
                  <Switch
                    id={id}
                    checked={value}
                    onCheckedChange={(checked: boolean) => set(checked)}
                  />
                </div>
              ))}

              <div className="space-y-3 pt-2">
                <p className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">Reminder Schedule</p>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Trigger alert warning: <span className="text-foreground font-semibold">{reminderHours} hours</span> before hearing</span>
                  <span>Range: 12 - 96 hrs</span>
                </div>
                <div className="py-2">
                  <Slider
                    value={[reminderHours]}
                    onValueChange={(val: number[]) => setReminderHours(val[0] || 24)}
                    min={12}
                    max={96}
                    step={12}
                    className="w-full"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <button 
              onClick={handleTestConnection}
              disabled={testing || !phoneId || !aiApiKey}
              className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-surface border border-border-default text-foreground font-semibold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Test connection
            </button>
            
            <button 
              id="save-settings" 
              onClick={() => void handleSave()} 
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Right Status Setup Wizard card */}
        <div className="space-y-4">
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[13px] font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
              <CheckCircle2 className="size-4 text-primary" />
              Setup Progress
            </h2>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Wizard completion</span>
                <span className="font-semibold text-foreground">{wizardProgressPercent}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${wizardProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-2">
              {[
                { label: "Twilio Sender Set", desc: "Twilio sender phone number configured", met: stepWebhookCopied },
                { label: "Twilio Credentials", desc: "Account SID and Auth Token entered", met: stepWaCredentials },
                { label: "AI Engine Credentials", desc: "API key and Model selection set", met: stepAiCredentials },
                { label: "Bot Prompt & Identity", desc: "Bot name and custom prompt defined", met: stepPersonaConfigured },
              ].map(({ label, desc, met }, index) => (
                <div key={label} className="flex gap-3 items-start text-xs">
                  <div className={["size-5 rounded-full shrink-0 flex items-center justify-center border text-[10px] font-bold", met ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border-default/80 text-text-secondary/60"].join(" ")}>
                    {met ? <Check className="size-3" /> : index + 1}
                  </div>
                  <div>
                    <p className={["font-semibold", met ? "text-foreground" : "text-text-secondary/70"].join(" ")}>{label}</p>
                    <p className="text-[10px] text-text-secondary/50 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seed Demo Data */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[13px] font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
              <Sparkles className="size-4 text-amber-400" />
              Demo Seed Data
            </h2>
            <p className="text-[11px] text-text-secondary/70 leading-relaxed">
              One-click seed: creates a demo law firm, client (Rahul Sharma), case (CC/2026/0042), conversation, messages, and court updates.
            </p>
            <button
              onClick={async () => {
                setError(null);
                try {
                  const res = await fetch("/api/demo/seed", { method: "POST" });
                  const data = await res.json();
                  if (data.success) {
                    toast.success("Demo data seeded! Org ID: " + data.org_id?.slice(0, 8) + "...");
                    setSeedResults(data.results || []);
                    setSeedErrors(data.errors || []);
                  } else {
                    toast.error(data.error || "Seed failed");
                  }
                } catch {
                  toast.error("Network error seeding demo data.");
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              Seed Demo Data (for judges)
            </button>
            {seedResults && seedResults.length > 0 && (
              <div className="space-y-1">
                {seedResults.map((r: string, i: number) => (
                  <div key={i} className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                    <Check className="size-3" /> {r}
                  </div>
                ))}
              </div>
            )}
            {seedErrors && seedErrors.length > 0 && (
              <div className="space-y-1">
                {seedErrors.map((e: string, i: number) => (
                  <div key={i} className="text-[10px] text-rose-400/80 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {e}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test connection results box */}
          {testResults && (
            <div className={["border rounded-2xl p-5 space-y-3 shadow-sm animate-fade-in-up", testResults.success ? "bg-emerald-500/[0.03] border-emerald-500/15" : "bg-rose-500/[0.03] border-rose-500/15"].join(" ")}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Integration Test Results</h3>
                <span className={["px-2 py-0.5 rounded text-[9px] font-bold uppercase", testResults.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"].join(" ")}>
                  {testResults.success ? "Passed" : "Failed"}
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs">
                {testResults.logs.map((log, i) => (
                  <div key={i} className="flex gap-2 items-start text-[11px] text-text-secondary/80">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{log}</span>
                  </div>
                ))}
                
                {testResults.errors.map((err, i) => (
                  <div key={i} className="flex gap-2 items-start text-[11px] text-rose-400">
                    <span className="font-bold">✗</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
