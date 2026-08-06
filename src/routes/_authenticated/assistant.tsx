import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_LIST, AGENTS, routeAgent, type AgentId } from "@/lib/agents-team";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Wrench, ChevronDown, Trash2, Sparkles, User, FolderPlus, ShieldCheck, Wallet, Rocket, RefreshCw, AlertTriangle } from "lucide-react";
import { reportClientEvent } from "@/lib/client-telemetry";
import { PageState } from "@/components/PageState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
  head: () => ({ meta: [{ title: "المساعد الذكي | IDEA BUSINESS" }] }),
});

type AgentChoice = AgentId | "auto";

const QUICK_PROMPTS: Record<AgentId, string[]> = {
  commander: ["كيف أبدأ نشر مشروع؟", "ما الخدمات المتاحة لي؟", "اعرض ملفي ومشاريعي"],
  developer: ["اشرح لي كيف تعمل المحفظة تقنياً", "ما خطوات ربط حسابي البنكي؟"],
  designer: ["اقترح صورة غلاف لمشروعي", "ما أفضل ألوان لإعلان عقاري؟"],
  researcher: ["ابحث لي عن قطاعات استثمارية رائجة", "قارن بين خيارات الاستثمار"],
  writer: ["اكتب نبذة احترافية لملفي", "اكتب وصف إعلان لمشروع مطعم"],
  analyst: ["حلّل أداء مشاريعي", "ما الخطة المناسبة لزيادة استثماراتي؟"],
};

const ACTION_CARDS: { icon: any; label: string; prompt: string; suggested: AgentId }[] = [
  { icon: User, label: "تحديث ملفي الشخصي", prompt: "حدّث ملفي الشخصي وأخبرني بما يحتاج تعديلاً.", suggested: "commander" },
  { icon: FolderPlus, label: "بدء مشروع جديد", prompt: "أريد نشر مشروع جديد، أرشدني للخطوات وأعطني الرابط.", suggested: "commander" },
  { icon: ShieldCheck, label: "طلب توثيق KYC", prompt: "أريد بدء توثيق هويتي (KYC). ما حالتي الآن والخطوة التالية؟", suggested: "commander" },
  { icon: Wallet, label: "محفظتي", prompt: "أرشدني إلى محفظتي وكيف أشحنها.", suggested: "commander" },
  { icon: Rocket, label: "تحديث ظهور مشروع", prompt: "اعرض مشاريعي ثم حدّث ظهور آخر مشروع لي إن أمكن.", suggested: "commander" },
];

function AssistantPage() {
  const { lang, dir } = useI18n();
  const isEn = lang === "en";
  const [agentChoice, setAgentChoice] = useState<AgentChoice>("auto");
  const [resolvedAgent, setResolvedAgent] = useState<AgentId>("commander");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setToken(data.session?.access_token ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl p-6" dir={dir}>
        <PageState
          kind="loading"
          title={isEn ? "Preparing your assistant session" : "جارٍ تجهيز جلسة المساعد"}
          description={isEn ? "We are checking your secure session before opening the chat." : "نراجع جلستك الآمنة قبل فتح المحادثة."}
        />
      </main>
    );
  }
  return (
    <ChatSurface
      key={resolvedAgent}
      token={token}
      agentChoice={agentChoice}
      setAgentChoice={setAgentChoice}
      resolvedAgent={resolvedAgent}
      setResolvedAgent={setResolvedAgent}
    />
  );
}

function ChatSurface({
  token, agentChoice, setAgentChoice, resolvedAgent, setResolvedAgent,
}: {
  token: string;
  agentChoice: AgentChoice;
  setAgentChoice: (a: AgentChoice) => void;
  resolvedAgent: AgentId;
  setResolvedAgent: (a: AgentId) => void;
}) {
  const [pendingAgent, setPendingAgent] = useState<AgentId | null>(null);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/assistant/chat",
    body: () => ({ agent: resolvedAgent }),
    headers: { Authorization: `Bearer ${token}` },
  }), [resolvedAgent, token]);

  const { messages, setMessages, sendMessage, status, error, regenerate } = useChat({
    id: `assistant:${resolvedAgent}`,
    transport,
  });
  const MAX_AUTO_RETRIES = 3;
  const [retryCount, setRetryCount] = useState(0);
  const [givenUp, setGivenUp] = useState(false);

  // Auto-retry with exponential backoff up to MAX_AUTO_RETRIES, then surface a persistent banner.
  useEffect(() => {
    if (!error) {
      if (retryCount !== 0) setRetryCount(0);
      if (givenUp) setGivenUp(false);
      return;
    }
    const isConfigurationError = /غير مفعّلة|غير مفعلة|GEMINI_API_KEY/i.test(error.message);
    if (isConfigurationError) {
      setGivenUp(true);
      return;
    }
    const isFinal = retryCount >= MAX_AUTO_RETRIES;
    reportClientEvent({
      source: "assistant-chat",
      action: isFinal ? "error-final" : "error",
      ok: false,
      error: error.message,
      context: {
        agent: resolvedAgent,
        retryCount,
        maxRetries: MAX_AUTO_RETRIES,
        final: isFinal,
        errorName: (error as any)?.name ?? null,
      },
    });
    if (isFinal) { setGivenUp(true); return; }
    const delay = Math.min(1000 * 2 ** retryCount, 6000);
    const t = setTimeout(() => {
      setRetryCount((c) => c + 1);
      try { regenerate?.(); } catch {}
    }, delay);
    return () => clearTimeout(t);
  }, [error, regenerate, resolvedAgent, retryCount, givenUp]);

  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history for this agent.
  useEffect(() => {
    let alive = true;
    setLoadingHistory(true);
    fetch(`/api/assistant/history?agent=${resolvedAgent}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { messages: [] })
      .then((d) => { if (alive) setMessages((d.messages ?? []) as UIMessage[]); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (alive) setLoadingHistory(false); });
    return () => { alive = false; };
  }, [resolvedAgent, token, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { inputRef.current?.focus(); }, [resolvedAgent, status]);

  const resolveAgentFor = useCallback(async (text: string): Promise<AgentId> => {
    if (agentChoice !== "auto") return agentChoice;
    // Lightweight client-side keyword routing (mirrors server).
    return routeAgent(text);
  }, [agentChoice]);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    const target = await resolveAgentFor(t);
    if (target !== resolvedAgent) {
      // Show "سيجيب: …" then switch agent + queue message.
      setPendingAgent(target);
      setInput(t);
      setTimeout(() => {
        setResolvedAgent(target);
        // Defer send to next tick after key change remounts useChat.
        setTimeout(async () => {
          setInput("");
          setPendingAgent(null);
          await sendMessage({ text: t });
        }, 50);
      }, 350);
      return;
    }
    setInput("");
    setPendingAgent(null);
    await sendMessage({ text: t });
  }, [isLoading, resolveAgentFor, resolvedAgent, sendMessage, setResolvedAgent]);

  const clearHistory = async () => {
    if (!confirm("حذف كامل سجل المحادثة مع هذا الوكيل؟")) return;
    await fetch(`/api/assistant/history?agent=${resolvedAgent}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    setMessages([]);
  };

  const current = AGENTS[resolvedAgent];

  return (
    <div className="mx-auto max-w-5xl p-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold">المساعد الذكي 🤖</h1>
        <p className="text-sm text-muted-foreground">
          فريق من ٦ وكلاء يساعدك ضمن صلاحيات حسابك. اختر "تلقائي" ليقرّر النظام أنسب وكيل لكل سؤال.
        </p>
      </header>

      {/* Agent selector */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setAgentChoice("auto")}
          className={`rounded-full border px-3 py-1.5 text-sm flex items-center gap-1.5 ${
            agentChoice === "auto" ? "border-primary bg-primary/10 font-bold" : "border-border hover:bg-muted/50"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> تلقائي
        </button>
        {AGENT_LIST.map((a) => (
          <button
            key={a.id}
            onClick={() => { setAgentChoice(a.id); setResolvedAgent(a.id); }}
            className={`rounded-full border px-3 py-1.5 text-sm flex items-center gap-1.5 ${
              agentChoice === a.id ? "border-primary bg-primary/10 font-bold" : "border-border hover:bg-muted/50"
            }`}
          >
            <span>{a.emoji}</span><span>{a.name}</span>
          </button>
        ))}
      </div>

      {/* Routing hint */}
      {agentChoice === "auto" && pendingAgent && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          سيجيب: <b>{AGENTS[pendingAgent].emoji} {AGENTS[pendingAgent].name}</b> — {AGENTS[pendingAgent].role}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-3 flex items-center gap-2">
          <span className="text-xl">{current.emoji}</span>
          <div className="flex-1">
            <div className="font-extrabold">{current.name}</div>
            <div className="text-xs text-muted-foreground">{current.role}</div>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            title="حذف سجل المحادثة"
          >
            <Trash2 className="h-3.5 w-3.5" /> مسح السجل
          </button>
        </div>

        {/* Action cards — quick member actions */}
        <div className="border-b border-border p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {ACTION_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                onClick={() => send(c.prompt)}
                disabled={isLoading}
                className="rounded-xl border border-border bg-background/60 hover:bg-muted/60 p-2 text-xs flex flex-col items-center gap-1 text-center disabled:opacity-50"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        <div ref={scrollRef} className="h-[50vh] overflow-y-auto p-4 space-y-4">
          {loadingHistory && (
            <div className="text-center text-xs text-muted-foreground">جاري تحميل المحادثات السابقة…</div>
          )}
          {!loadingHistory && messages.length === 0 && (
            <div className="space-y-3 pt-6">
              <div className="text-center text-sm text-muted-foreground">ابدأ المحادثة، أو جرّب أحد الاقتراحات:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS[resolvedAgent].map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted/60">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
            const toolParts = m.parts.filter((p: any) => typeof p.type === "string" && p.type.startsWith("tool-"));
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[88%] space-y-2 ${isUser ? "" : "w-full"}`}>
                  {toolParts.map((tp: any, i: number) => <ToolCard key={i} part={tp} />)}
                  {text && (
                    <div className={`rounded-2xl px-4 py-2 text-sm ${
                      isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{text}</div>
                      ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-background prose-a:text-primary">
                          <ReactMarkdown>{text}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {current.name} يفكّر…
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4" />
                {givenUp ? "تعذّر الاتصال بعد عدة محاولات" : "تعذّر الاتصال بالوكيل"}
                {!givenUp && (
                  <span className="font-normal text-[10px] opacity-80">
                    — محاولة {retryCount + 1} من {MAX_AUTO_RETRIES + 1}…
                  </span>
                )}
              </div>
              <div className="opacity-80">{error.message}</div>
              {givenUp && (
                <div className="opacity-70 text-[10px]">
                  تم تسجيل السبب لدى الإدارة. يمكنك المحاولة يدوياً أو تغيير الوكيل.
                </div>
              )}
              <button
                type="button"
                onClick={() => { setGivenUp(false); setRetryCount(0); try { regenerate?.(); } catch {} }}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 hover:bg-destructive/20"
              >
                <RefreshCw className="h-3 w-3" /> إعادة المحاولة الآن
              </button>
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-border p-3 flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={agentChoice === "auto" ? "اكتب سؤالك، وسأختار الوكيل الأنسب…" : `اكتب رسالتك إلى ${current.name}…`}
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="self-end" size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function ToolCard({ part }: { part: any }) {
  const [open, setOpen] = useState(false);
  const name = String(part.type ?? "").replace(/^tool-/, "");
  const state = part.state as string | undefined;
  return (
    <div className="rounded-xl border border-border bg-background/60 text-xs">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 p-2 text-right">
        <Wrench className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold">{name}</span>
        <span className="text-muted-foreground">{state ?? ""}</span>
        <ChevronDown className={`h-3.5 w-3.5 mr-auto transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <pre className="border-t border-border p-2 overflow-x-auto whitespace-pre-wrap text-[11px]">
{JSON.stringify({ input: part.input, output: part.output, errorText: part.errorText }, null, 2)}
        </pre>
      )}
    </div>
  );
}
