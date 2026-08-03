import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listQuestions, askQuestion, answerQuestion } from '@/lib/project-engagement.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircleQuestion, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProjectQA({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const list = useServerFn(listQuestions);
  const ask = useServerFn(askQuestion);
  const answer = useServerFn(answerQuestion);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  const reload = () => list({ data: { project_id: projectId } }).then(setItems).catch(() => {});
  useEffect(() => { reload(); }, [projectId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircleQuestion className="h-5 w-5" /> أسئلة وأجوبة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOwner && (
          <div className="space-y-2">
            <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="اطرح سؤالاً على صاحب المشروع..." />
            <Button disabled={busy || q.trim().length < 5} onClick={async () => {
              setBusy(true);
              try { await ask({ data: { project_id: projectId, question: q.trim() } }); setQ(''); toast.success('تم إرسال السؤال'); reload(); }
              catch (e: any) { toast.error(e.message); }
              finally { setBusy(false); }
            }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إرسال السؤال'}</Button>
          </div>
        )}
        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">لا توجد أسئلة بعد.</p>}
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium">س: {it.question}</p>
              {it.answer ? (
                <p className="mt-2 text-sm text-muted-foreground">ج: {it.answer}</p>
              ) : isOwner ? (
                <div className="mt-2 space-y-2">
                  <Textarea value={answerDraft[it.id] ?? ''} onChange={(e) => setAnswerDraft({ ...answerDraft, [it.id]: e.target.value })} placeholder="اكتب إجابتك..." />
                  <Button size="sm" onClick={async () => {
                    try { await answer({ data: { question_id: it.id, answer: answerDraft[it.id] ?? '' } }); toast.success('تم الرد'); reload(); }
                    catch (e: any) { toast.error(e.message); }
                  }}>إرسال الإجابة</Button>
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">في انتظار الرد...</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
