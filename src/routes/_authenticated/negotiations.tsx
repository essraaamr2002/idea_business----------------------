import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { listMyNegotiations } from '@/lib/negotiations.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Handshake } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/negotiations')({ component: Page });

function Page() {
  const fn = useServerFn(listMyNegotiations);
  const { data = [] } = useQuery({ queryKey: ['my-negotiations'], queryFn: () => fn() });
  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Handshake className="h-6 w-6" /> تفاوضاتي</h1>
      {(data as any[]).length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد تفاوضات نشطة بعد.</CardContent></Card>
      )}
      <div className="grid gap-3">
        {(data as any[]).map((n) => (
          <Card key={n.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{n.projects?.name ?? 'مشروع'}</CardTitle>
              <Badge variant={n.status === 'accepted' ? 'default' : n.status === 'rejected' ? 'destructive' : 'secondary'}>{n.status}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>الجولة {n.round_number}/10 · المبلغ: {Number(n.current_offer_amount).toLocaleString('ar')}</p>
              <Link to="/projects/$id" params={{ id: n.project_id }} className="text-primary hover:underline">عرض المشروع →</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
