import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { saveFutureLabResult } from '@/lib/future-lab-history.functions';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props {
  tool: 'oracle' | 'time_machine' | 'twin' | 'voice_trader' | 'trust_chain';
  title: string;
  summary?: string;
  payload: Record<string, unknown>;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'secondary';
}

export function SaveToHistoryButton({ tool, title, summary, payload, size = 'sm', variant = 'outline' }: Props) {
  const save = useServerFn(saveFutureLabResult);
  const [saved, setSaved] = useState(false);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={saved}
      onClick={async () => {
        try {
          await save({ data: { tool, title, summary, payload } });
          setSaved(true);
          toast.success('تم حفظ النتيجة في سجلّك');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
        }
      }}
    >
      <Bookmark className="w-4 h-4 ml-2" />
      {saved ? 'محفوظ' : 'حفظ في السجل'}
    </Button>
  );
}
