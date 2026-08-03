import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { parseVoiceCommand, listMyVoiceCommands } from "@/lib/voice-trader.functions";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/voice-trader")({
  head: () => ({ meta: [
    { title: "التداول الصوتي | IDEA BUSINESS" },
    { name: "description", content: "نفّذ صفقاتك بأمر صوتي عربي — يفهمك الذكاء الصناعي." },
  ]}),
  component: VoicePage,
});

function VoicePage() {
  const parse = useServerFn(parseVoiceCommand);
  const list = useServerFn(listMyVoiceCommands);
  const { data, refetch } = useQuery({ queryKey: ["voice-log"], queryFn: () => list() });
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR: any = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return;
    const r = new SR();
    r.lang = "ar-SA"; r.continuous = false; r.interimResults = false;
    r.onresult = (e: any) => { setTranscript(e.results[0][0].transcript); setListening(false); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
  }, []);

  const toggleMic = () => {
    if (!recRef.current) { toast.error("متصفحك لا يدعم التعرف الصوتي"); return; }
    if (listening) { recRef.current.stop(); setListening(false); }
    else { setTranscript(""); recRef.current.start(); setListening(true); }
  };

  const m = useMutation({
    mutationFn: () => parse({ data: { transcript } as any }),
    onSuccess: () => { toast.success("تمّ الفهم"); refetch(); setTranscript(""); },
    onError: (e: any) => toast.error(e?.message || "خطأ"),
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Mic className="h-6 w-6" />} title="التداول الصوتي" subtitle='قل مثلاً: "اشتري 50 سهم من مشروع الغاز بسعر السوق"' />
        <Card className="p-5 space-y-3">
          <div className="flex gap-2">
            <Button onClick={toggleMic} variant={listening ? "destructive" : "default"} size="lg">
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <input
              className="flex-1 rounded border px-3 py-2 bg-background"
              placeholder="أو اكتب الأمر يدوياً..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <Button onClick={() => m.mutate()} disabled={!transcript || m.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {listening && <p className="text-sm text-primary animate-pulse">🎤 استمع لك الآن...</p>}
        </Card>

        <h3 className="font-bold mt-6 mb-2">أوامرك الأخيرة</h3>
        <div className="space-y-2">
          {(data ?? []).map((r: any) => (
            <Card key={r.id} className="p-3 text-sm">
              <div className="font-medium">"{r.transcript}"</div>
              {r.parsed && (
                <div className="text-xs text-muted-foreground mt-1">
                  الفعل: <b>{r.parsed.action}</b> — {r.parsed.query} — كمية {r.parsed.quantity ?? "—"} — سعر {r.parsed.price ?? "السوق"}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("ar-SA")}</div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
