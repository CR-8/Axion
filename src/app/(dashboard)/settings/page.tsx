"use client";

import { useState, useEffect, useCallback } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Settings, Bot, Zap, Bell, MessageSquare, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
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

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 text-text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-2.5">
          <Settings className="size-6 text-text-secondary" strokeWidth={1.5} />
          Bot Configuration
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">Configure WhatsApp, AI, and notification settings</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-red-300 text-sm">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-surface-elevated border border-border-default rounded-xl p-1 mb-6">
          <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">AI Config</TabsTrigger>
          <TabsTrigger value="persona" className="text-xs">Persona</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
        </TabsList>

        <div className="bg-surface border border-border-default rounded-2xl p-6 space-y-5 shadow-xl">
          <TabsContent value="whatsapp" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
              <MessageSquare className="size-4 text-text-secondary" />
              WhatsApp Configuration
            </div>

            <div className="bg-surface-elevated border border-border-default rounded-xl p-4 space-y-1">
              <p className="text-[12px] font-semibold text-foreground">Your Webhook URL</p>
              <p className="font-mono text-[12px] text-text-secondary break-all select-all">{appUrl}/api/webhook</p>
              <p className="text-[11px] text-text-secondary/60">Copy this URL into your Meta App Dashboard &rarr; WhatsApp &rarr; Configuration &rarr; Webhook URL</p>
            </div>

            {[
              { label: "Phone Number ID", value: phoneId, set: setPhoneId, id: "wa-phone-id", placeholder: "1234567890", sensitive: false },
              { label: "Access Token", value: accessToken, set: setAccessToken, id: "wa-token", placeholder: "EAAxxxxx…", sensitive: true },
              { label: "Verify Token", value: verifyToken, set: setVerifyToken, id: "wa-verify-token", placeholder: "lexbot_verify_token", sensitive: false },
            ].map(({ label, value, set, id, placeholder, sensitive }) => (
              <div key={id} className="space-y-1.5">
                <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <input
                    id={id}
                    type={sensitive && !showToken ? "password" : "text"}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 outline-none focus:border-white/20 transition-colors font-mono pr-10"
                  />
                  {sensitive && (
                    <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors cursor-pointer">
                      {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="ai" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
              <Zap className="size-4 text-zinc-400 dark:text-zinc-400" />
              AI Configuration
            </div>

            <div className="space-y-1.5">
              <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">AI Provider</label>
              <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} id="ai-provider"
                className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-white/20 transition-colors">
                <option value="openrouter" className="bg-surface">OpenRouter (Recommended)</option>
                <option value="openai" className="bg-surface">OpenAI</option>
                <option value="anthropic" className="bg-surface">Anthropic</option>
                <option value="gemini" className="bg-surface">Google Gemini</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">API Key (BYOK)</label>
              <div className="relative">
                <input id="ai-api-key" type={showApiKey ? "text" : "password"} value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="sk-or-v1-xxxxx…"
                  className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 outline-none focus:border-white/20 transition-colors font-mono pr-10" />
                <button type="button" onClick={() => setShowApiKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors cursor-pointer">
                  {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Model</label>
              <input id="ai-model" type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                placeholder="openai/gpt-4o-mini"
                className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 outline-none focus:border-white/20 transition-colors font-mono" />
              <p className="text-text-secondary/60 text-[11px]">OpenRouter format: provider/model-name (e.g. openai/gpt-4o-mini, anthropic/claude-3-haiku)</p>
            </div>
          </TabsContent>

          <TabsContent value="persona" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
              <Bot className="size-4 text-zinc-400" />
              Bot Persona
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Bot Name</label>
                <input id="bot-name" type="text" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="LexAssist"
                  className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/35 outline-none focus:border-white/20 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Default Language</label>
                <select id="bot-lang" value={defaultLang} onChange={(e) => setDefaultLang(e.target.value)}
                  className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-white/20 transition-colors">
                  {[["en","English"],["hi","Hindi"],["ta","Tamil"],["te","Telugu"],["bn","Bengali"],["mr","Marathi"],["gu","Gujarati"]].map(([code, label]) => (
                    <option key={code} value={code} className="bg-surface">{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">System Prompt</label>
              <div className="text-[11px] text-text-secondary/60 mb-2">
                Variables: <code className="text-foreground font-bold">{"{{bot_name}} {{org_name}} {{client_name}} {{case_number}} {{case_status}} {{next_hearing}} {{assigned_lawyer}}"}</code>
              </div>
              <textarea id="system-prompt" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8} placeholder="You are {{bot_name}}, a legal assistant for {{org_name}}…"
                className="w-full bg-background border border-border-default rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-secondary/35 outline-none focus:border-white/20 transition-colors resize-none font-mono leading-relaxed" />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
              <Bell className="size-4 text-zinc-400" />
              Notification Settings
            </div>

            {[
              { label: "Hearing Reminders", desc: "Send reminder before upcoming hearing dates", value: notifyHearing, set: setNotifyHearing, id: "notify-hearing" },
              { label: "Status Change Alerts", desc: "Notify client when case status changes", value: notifyStatus, set: setNotifyStatus, id: "notify-status" },
              { label: "Document Upload Alerts", desc: "Notify client when lawyer uploads a document", value: notifyDoc, set: setNotifyDoc, id: "notify-doc" },
            ].map(({ label, desc, value, set, id }) => (
              <div key={id} className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border-default">
                <div>
                  <p className="text-foreground text-[13px] font-medium">{label}</p>
                  <p className="text-text-secondary text-[11px] mt-0.5">{desc}</p>
                </div>
                <Switch
                  id={id}
                  checked={value}
                  onCheckedChange={(checked: boolean) => set(checked)}
                />
              </div>
            ))}

            <div className="space-y-3 pt-2">
              <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Reminder Timing</label>
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Trigger warning: <span className="text-foreground font-semibold">{reminderHours} hours</span> before hearing</span>
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

          <div className="flex items-center justify-end pt-4 border-t border-border-default">
            <button id="save-settings" onClick={() => void handleSave()} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 font-bold text-sm rounded-xl transition-colors cursor-pointer">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
