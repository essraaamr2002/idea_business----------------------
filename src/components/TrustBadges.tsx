import { Shield, BadgeCheck, FileCheck, Wallet, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TrustBadges({ project }: { project: any }) {
  const badges: { icon: any; label: string; color: string; active: boolean }[] = [
    { icon: BadgeCheck, label: 'هوية موثّقة', color: 'text-blue-500', active: !!project.owner_kyc_verified },
    { icon: FileCheck, label: 'مستندات مكتملة', color: 'text-emerald-500', active: !!project.documents_verified },
    { icon: Wallet, label: 'ضمان مالي', color: 'text-purple-500', active: !!project.has_guarantee },
    { icon: Shield, label: 'مفحوص قانونياً', color: 'text-amber-500', active: !!project.legal_reviewed },
    { icon: Award, label: `ثقة ${project.trust_score ?? 0}/100`, color: 'text-pink-500', active: (project.trust_score ?? 0) > 0 },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {badges.filter((b) => b.active).map((b, i) => {
        const Icon = b.icon;
        return (
          <Badge key={i} variant="outline" className="gap-1 px-2 py-1">
            <Icon className={`h-3.5 w-3.5 ${b.color}`} />
            <span className="text-xs">{b.label}</span>
          </Badge>
        );
      })}
    </div>
  );
}
