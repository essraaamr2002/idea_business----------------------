import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listReviews, submitReview } from '@/lib/project-engagement.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export function ProjectReviews({ projectId, canReview }: { projectId: string; canReview: boolean }) {
  const list = useServerFn(listReviews);
  const submit = useServerFn(submitReview);
  const [items, setItems] = useState<any[]>([]);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => { list({ data: { project_id: projectId } }).then(setItems).catch(() => {}); }, [projectId]);

  const avg = items.length ? items.reduce((a, b) => a + (b.stars ?? 0), 0) / items.length : 0;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>التقييمات</span>
          <span className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            {avg.toFixed(1)} ({items.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canReview && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setStars(n)}>
                  <Star className={`h-6 w-6 ${n <= stars ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب تقييمك..." />
            <Button onClick={async () => {
              try { await submit({ data: { project_id: projectId, stars, comment } }); toast.success('شكراً لتقييمك'); setComment(''); list({ data: { project_id: projectId } }).then(setItems); }
              catch (e: any) { toast.error(e.message); }
            }}>إرسال التقييم</Button>
          </div>
        )}
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < r.stars ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                ))}
              </div>
              {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
