// Client-side loyalty engine — points, streak, tier, daily quests
// Stored in localStorage so it works offline without DB changes.
const PTS_KEY = "fb_loyalty_pts_v1";
const STREAK_KEY = "fb_streak_v1";
const QUESTS_KEY = "fb_quests_v1";
const BIRTHDAY_KEY = "fb_birthday_v1";

export type Tier = {
  id: "bronze" | "silver" | "gold" | "platinum";
  name: string;
  min: number;
  color: string;
  perks: string[];
};

export const TIERS: Tier[] = [
  { id: "bronze",   name: "برونزي",  min: 0,    color: "from-orange-400 to-amber-700",
    perks: ["رابط دعوة شخصي", "وصول للسوق الأساسي"] },
  { id: "silver",   name: "فضي",     min: 500,  color: "from-slate-300 to-slate-500",
    perks: ["+ ٥٪ خصم على رسوم المنصة", "أولوية دعم"] },
  { id: "gold",     name: "ذهبي",    min: 2000, color: "from-amber-400 to-yellow-600",
    perks: ["+ ١٠٪ كاش باك", "وصول مبكر للمشاريع المميزة", "شارة ذهبية"] },
  { id: "platinum", name: "بلاتيني", min: 6000, color: "from-cyan-300 to-blue-600",
    perks: ["+ ١٥٪ كاش باك", "دعوات للفعاليات الحصرية", "مستشار شخصي"] },
];

export function getPoints(): number {
  try { return Number(localStorage.getItem(PTS_KEY) ?? 0); } catch { return 0; }
}
export function addPoints(n: number): number {
  const next = Math.max(0, getPoints() + n);
  try { localStorage.setItem(PTS_KEY, String(next)); } catch {}
  return next;
}
export function spendPoints(n: number): boolean {
  const cur = getPoints();
  if (cur < n) return false;
  try { localStorage.setItem(PTS_KEY, String(cur - n)); } catch {}
  return true;
}

export function tierFor(points: number): Tier {
  return [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
}
export function nextTier(points: number): Tier | null {
  return TIERS.find((t) => t.min > points) ?? null;
}

// Streak (daily visits)
export function pingStreak(): { count: number; bumped: boolean } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (!raw) {
      localStorage.setItem(STREAK_KEY, JSON.stringify({ count: 1, last: today }));
      return { count: 1, bumped: true };
    }
    const s = JSON.parse(raw) as { count: number; last: string };
    if (s.last === today) return { count: s.count, bumped: false };
    const next = s.last === yesterday ? s.count + 1 : 1;
    localStorage.setItem(STREAK_KEY, JSON.stringify({ count: next, last: today }));
    return { count: next, bumped: true };
  } catch { return { count: 0, bumped: false }; }
}
export function getStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw).count as number) : 0;
  } catch { return 0; }
}
export function lastVisitDate(): string | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw).last as string) : null;
  } catch { return null; }
}

// Daily quests
export type Quest = { id: string; title: string; reward: number };
export const DAILY_QUESTS: Quest[] = [
  { id: "visit",   title: "افتح المنصة اليوم",            reward: 5  },
  { id: "browse",  title: "تصفّح ٣ مشاريع جديدة",          reward: 10 },
  { id: "follow",  title: "تابع مستثمراً واحداً",            reward: 10 },
  { id: "share",   title: "شارك مشروعاً عبر روابط الدعوة",  reward: 15 },
  { id: "comment", title: "اترك تعليقاً بنّاءً في المجتمع",   reward: 15 },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }

export function getCompletedQuests(): string[] {
  try {
    const raw = localStorage.getItem(QUESTS_KEY);
    if (!raw) return [];
    const o = JSON.parse(raw) as { date: string; ids: string[] };
    return o.date === todayKey() ? o.ids : [];
  } catch { return []; }
}
export function completeQuest(id: string): { newly: boolean; points: number } {
  const ids = getCompletedQuests();
  if (ids.includes(id)) return { newly: false, points: getPoints() };
  const q = DAILY_QUESTS.find((x) => x.id === id);
  if (!q) return { newly: false, points: getPoints() };
  const next = [...ids, id];
  try { localStorage.setItem(QUESTS_KEY, JSON.stringify({ date: todayKey(), ids: next })); } catch {}
  const pts = addPoints(q.reward);
  return { newly: true, points: pts };
}

// Birthday gift
export function setBirthday(mmdd: string) {
  try { localStorage.setItem(BIRTHDAY_KEY, JSON.stringify({ mmdd, claimedYear: 0 })); } catch {}
}
export function getBirthday(): { mmdd: string; claimedYear: number } | null {
  try {
    const raw = localStorage.getItem(BIRTHDAY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function claimBirthdayIfDue(): boolean {
  const b = getBirthday();
  if (!b) return false;
  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (mmdd !== b.mmdd) return false;
  if (b.claimedYear === today.getFullYear()) return false;
  addPoints(200);
  try { localStorage.setItem(BIRTHDAY_KEY, JSON.stringify({ ...b, claimedYear: today.getFullYear() })); } catch {}
  return true;
}

// Missed-you (7 days inactive)
export function shouldShowMissedYou(): boolean {
  const last = lastVisitDate();
  if (!last) return false;
  const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
  return days >= 7;
}
