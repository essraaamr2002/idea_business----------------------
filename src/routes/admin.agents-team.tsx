import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ADMIN_AGENT_LIST, ADMIN_AGENTS, routeAdminAgent, type AdminAgentId } from "@/lib/admin-agents";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, ShieldCheck, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/agents-team")({
  component: AgentsTeamPage,
  head: () => ({ meta: [{ title: "فريق الوكلاء الإداريون | IDEA BUSINESS" }] }),
});

function AgentsTeamPage() {
  const [agent, setAgent] = useState<AdminAgentId>("commander");
  const [autoRoute, setAutoRoute] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setToken(data.session?.access_token ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!token) {
    return <div className="p-6 text-center text-sm text-muted-foreground" dir="rtl">…جاري تجهيز جلسة المدير</div>;
  }

  return <ChatSurface key={agent} agent={agent} setAgent={setAgent} token={token} autoRoute={autoRoute} setAutoRoute={setAutoRoute} />;
}

function ChatSurface({
  agent, setAgent, token, autoRoute, setAutoRoute,
}: {
  agent: AdminAgentId;
  setAgent: (a: AdminAgentId) => void;
  token: string;
  autoRoute: boolean;
  setAutoRoute: (v: boolean) => void;
}) {
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/admin/agents/chat",
    body: { agent },
    headers: { Authorization: `Bearer ${token}` },
  }), [agent, token]);

  const { messages, sendMessage, status, error } = useChat({
    id: `admin-agents:${agent}`,
    transport,
  });
  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    if (autoRoute) {
      const picked = routeAdminAgent(text);
      if (picked !== agent) { setAgent(picked); /* useChat will remount on key change next render */ }
    }
    setInput("");
    await sendMessage({ text });
  };

  const current = ADMIN_AGENTS[agent];

  const quickCmds = [
    { label: "📊 إحصاءات المنصة", text: "اعرض platform_stats للمنصة الآن." },
    { label: "👥 آخر 20 عضو", text: "list_users بحد 20 وأظهرهم في جدول." },
    { label: "📋 سجل التدقيق", text: "audit_log آخر 15 إجراءاً إدارياً." },
    { label: "🗄️ جداول قاعدة البيانات", text: "list_tables ثم اقترح علي الأكثر استخداماً." },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4" dir="rtl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> فريق الوكلاء الإداريون
          </h1>
          <p className="text-sm text-muted-foreground">
            وكلاء بصلاحيات إدارة كاملة — CRUD على قاعدة البيانات، اعتمادات، محافظ، أدوار، تدقيق. منفصلون عن مساعد الأعضاء.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm rounded-xl border border-border px-3 py-2 cursor-pointer">
          <input type="checkbox" checked={autoRoute} onChange={(e) => setAutoRoute(e.target.checked)} />
          <Wand2 className="h-4 w-4" /> توجيه تلقائي للوكيل الأنسب
        </label>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {ADMIN_AGENT_LIST.map((a) => (
          <button
            key={a.id}
            onClick={() => setAgent(a.id)}
            className={`rounded-xl border p-3 text-right transition ${
              a.id === agent ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="text-2xl">{a.emoji}</div>
            <div className="font-bold text-sm mt-1">{a.name}</div>
            <div className="text-[11px] text-muted-foreground line-clamp-2">{a.role}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-3 flex items-center gap-2">
          <span className="text-xl">{current.emoji}</span>
          <div className="flex-1">
            <div className="font-extrabold">{current.name}</div>
            <div className="text-xs text-muted-foreground">{current.role}</div>
          </div>
          <span className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-1">
            {current.allowedTools.length} أداة إدارية
          </span>
        </div>

        <div className="px-3 pt-3 flex flex-wrap gap-2">
          {quickCmds.map((c) => (
            <button key={c.label} onClick={() => setInput(c.text)}
              className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted/50">
              {c.label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="h-[55vh] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground pt-16">
              اكتب أمرك للمدير — مثلاً: "احذف من جدول notifications كل الصفوف لـ user_id كذا"، أو "اعتمد KYC للمستخدم …"
            </div>
          )}
          {messages.map((m: UIMessage) => {
            const text = m.parts.map((p: any) => (p.type === "text" ? p.text : "")).join("");
            const tools = m.parts.filter((p: any) => p.type?.startsWith?.("tool-")) as any[];
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{text}</div>
                  ) : (
                    <>
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-background prose-pre:text-foreground">
                        <ReactMarkdown>{text || "…"}</ReactMarkdown>
                      </div>
                      {tools.length > 0 && (
                        <details className="mt-2 text-[11px] opacity-80">
                          <summary className="cursor-pointer">🔧 {tools.length} أداة منفّذة</summary>
                          <pre className="whitespace-pre-wrap break-all mt-1">{JSON.stringify(tools, null, 2)}</pre>
                        </details>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> يكتب…
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              تعذّر الاتصال بالوكيل: {error.message}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-border p-3 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`اكتب أمرك إلى ${current.name}…`}
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e as any); }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="self-end">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
