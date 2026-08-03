import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listUpdates, postUpdate } from '@/lib/project-engagement.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';

export function ProjectUpdates({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const list = useServerFn(listUpdates);
  const post = useServerFn(postUpdate);
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const reload = () => list({ data: { project_id: projectId } }).then(setItems).catch(() => {});
  useEffect(() => { reload(); }, [projectId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Megaphone className="h-5 w-5" /> تحديثات المشروع</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isOwner && (
          <div className="space-y-2 rounded-lg border p-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان التحديث" />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="تفاصيل التحديث..." />
            <Button onClick={async () => {
              try { await post({ data: { project_id: projectId, title, body } }); toast.success('تم النشر'); setTitle(''); setBody(''); reload(); }
              catch (e: any) { toast.error(e.message); }
            }}>نشر التحديث</Button>
          </div>
        )}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد تحديثات بعد.</p>}
        {items.map((u) => (
          <div key={u.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold">{u.title}</h4>
              <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString('ar')}</span>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{u.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
