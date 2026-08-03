import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { Target, Plus, Trash2 } from "lucide-react";

type Goal = { id: string; name: string; target: number; current: number };

export function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([
    { id: "1", name: "صندوق الطوارئ", target: 50000, current: 12000 },
    { id: "2", name: "استثمار سنوي", target: 100000, current: 35000 },
  ]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState(0);

  const add = () => {
    if (!name || !target) return;
    setGoals([...goals, { id: Date.now().toString(), name, target, current: 0 }]);
    setName(""); setTarget(0);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">أهدافي المالية</h3>
      </div>
      <div className="space-y-4">
        {goals.map((g) => (
          <div key={g.id} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{g.name}</span>
              <button onClick={() => setGoals(goals.filter(x => x.id !== g.id))} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <ProgressBar value={g.current} max={g.target} label={`${g.current.toLocaleString()} / ${g.target.toLocaleString()} SAR`} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الهدف" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <input type="number" value={target || ""} onChange={(e) => setTarget(Number(e.target.value))} placeholder="المبلغ" className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={add} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
