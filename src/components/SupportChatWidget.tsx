import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, X, Send, Bot, User as UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

const transport = new DefaultChatTransport({ api: "/api/public/assistant" });

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <>
      <button
        type="button"
        aria-label="خدمة العملاء الذكية"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 left-4 z-[150] grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/20 transition hover:scale-105 md:bottom-6"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div
          dir="rtl"
          className="fixed bottom-36 left-4 z-[150] flex h-[520px] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:bottom-24"
        >
          <header className="flex items-center gap-2 border-b bg-gradient-to-l from-primary/15 to-transparent px-4 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-extrabold">خدمة العملاء الذكية</div>
              <div className="text-[11px] text-muted-foreground">رد فوري 24/7</div>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                <div>
                  <Bot className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2">مرحباً! كيف يمكنني مساعدتك اليوم؟</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {["كيف أنشئ مشروعاً؟", "ما هي عمولة الشراء؟", "كيف أستثمر؟"].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="rounded-full border bg-background px-2.5 py-1 text-[11px] hover:border-primary"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((m) => {
              const isUser = m.role === "user";
              const text = m.parts.map((p: any) => (p.type === "text" ? p.text : "")).join("");
              return (
                <div key={m.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                يكتب…
              </div>
            )}
            {error && !isLoading && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                حدث خطأ في الاتصال بالمساعد. حاول مرة أخرى.
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك..."
              disabled={isLoading}
              className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
