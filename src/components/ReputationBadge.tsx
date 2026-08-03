import { Badge } from '@/components/ui/badge';

export type ReputationLevel = 'beginner' | 'member' | 'trusted' | 'pro' | 'expert';

export function reputationLevel(score: number): { level: ReputationLevel; label: string; color: string; emoji: string } {
  if (score >= 800) return { level: 'expert', label: 'خبير', color: 'bg-purple-500/15 text-purple-700 border-purple-300', emoji: '💎' };
  if (score >= 600) return { level: 'pro', label: 'محترف', color: 'bg-blue-500/15 text-blue-700 border-blue-300', emoji: '🔵' };
  if (score >= 400) return { level: 'trusted', label: 'موثوق', color: 'bg-green-500/15 text-green-700 border-green-300', emoji: '🟢' };
  if (score >= 200) return { level: 'member', label: 'عضو', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-300', emoji: '🟡' };
  return { level: 'beginner', label: 'مبتدئ', color: 'bg-red-500/15 text-red-700 border-red-300', emoji: '🔴' };
}

export function ReputationBadge({ score, showScore = true }: { score: number; showScore?: boolean }) {
  const r = reputationLevel(score);
  return (
    <Badge variant="outline" className={r.color}>
      <span className="me-1">{r.emoji}</span>
      {r.label}
      {showScore ? <span className="ms-1 opacity-70">· {score}</span> : null}
    </Badge>
  );
}
