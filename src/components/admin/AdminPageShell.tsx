import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AdminPageShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
  badge,
}: {
  title: string;
  description?: string;
  icon?: any;
  actions?: ReactNode;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <div className="space-y-5">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Link to="/admin" className="hover:text-foreground">لوحة الإدارة</Link>
        <ChevronLeft className="h-3 w-3 rotate-180" />
        <span className="text-foreground font-medium">{title}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{title}</h1>
              {badge && <Badge variant="secondary">{badge}</Badge>}
            </div>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ComingSoonNotice({ note }: { note?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start gap-3 p-4 text-sm">
        <Construction className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">واجهة جاهزة — يتم ربط البيانات الحية تباعاً</div>
          {note && <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
