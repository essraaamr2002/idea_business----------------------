import { useState, useEffect, useCallback } from "react";

// ==========================================
// 🔍 أداة فحص الكود والأزرار الشاملة لـ Lovable
// ==========================================

declare global {
  interface Window {
    __inspectorErrors?: InspectorError[];
  }
}

interface InspectorError {
  type: "error" | "warn";
  msg: string;
  time: string;
}

interface ButtonResult {
  id: number;
  tag: string;
  text: string;
  status: string;
  issues: string[];
  visible: boolean;
}

interface BrokenLink {
  url: string;
  issue: string;
}

interface ImageResult {
  src: string;
  issue: string;
}

interface FormResult {
  form: string;
  fields: number;
  issues: string[];
}

interface Summary {
  buttons: number;
  buttonIssues: number;
  errors: number;
  links: number;
  images: number;
  forms: number;
  totalIssues: number;
  health: string;
  healthColor: string;
}

interface ScanResults {
  buttons: ButtonResult[];
  errors: InspectorError[];
  links: BrokenLink[];
  images: ImageResult[];
  forms: FormResult[];
  summary: Summary | null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// فحص الأزرار في الصفحة
function scanButtons(): ButtonResult[] {
  const results: ButtonResult[] = [];
  const buttons = document.querySelectorAll(
    "button, a, [role='button'], input[type='button'], input[type='submit'], [onClick]"
  );

  buttons.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    const tag = htmlEl.tagName.toLowerCase();
    const text =
      (htmlEl as any).innerText?.trim?.() ||
      (htmlEl as HTMLInputElement).value ||
      htmlEl.getAttribute("aria-label") ||
      `عنصر #${i + 1}`;
    const issues: string[] = [];
    let status = "✅";

    if ((htmlEl as any).disabled) {
      issues.push("الزر معطّل (disabled)");
      status = "⚠️";
    }
    if (
      tag === "button" &&
      !htmlEl.getAttribute("type") &&
      htmlEl.closest("form")
    ) {
      issues.push('لا يوجد type="button" داخل form (قد يُرسل النموذج)');
      status = "⚠️";
    }
    const anchor = htmlEl as HTMLAnchorElement;
    if (tag === "a" && !anchor.href && !htmlEl.getAttribute("onClick") && !htmlEl.getAttribute("href")) {
      issues.push("رابط بدون href أو onClick");
      status = "⚠️";
    }
    const style = window.getComputedStyle(htmlEl);
    if (style.display === "none" || style.visibility === "hidden") {
      issues.push("العنصر مخفي بالـ CSS");
      status = "ℹ️";
    }
    if (style.pointerEvents === "none") {
      issues.push("pointer-events: none — لا يستجيب للنقر");
      status = "⚠️";
    }
    const rect = htmlEl.getBoundingClientRect();
    if (rect.width < 24 || rect.height < 24) {
      if (rect.width > 0) {
        issues.push(`حجم صغير جداً (${Math.round(rect.width)}×${Math.round(rect.height)}px) — صعب النقر`);
        status = status === "✅" ? "ℹ️" : status;
      }
    }
    if (!htmlEl.getAttribute("aria-label") && !(htmlEl as any).innerText?.trim?.()) {
      issues.push("لا يوجد نص أو aria-label للوصول");
      status = status === "✅" ? "ℹ️" : status;
    }

    results.push({
      id: i,
      tag,
      text: text.slice(0, 40),
      status,
      issues,
      visible: rect.width > 0 && rect.height > 0,
    });
  });

  return results;
}

// فحص الكونسول والأخطاء
function scanConsoleErrors(): InspectorError[] {
  return window.__inspectorErrors || [];
}

// فحص الروابط المعطوبة
async function scanBrokenLinks(): Promise<BrokenLink[]> {
  const links = document.querySelectorAll("a[href]");
  const broken: BrokenLink[] = [];
  for (const link of links) {
    const anchor = link as HTMLAnchorElement;
    const href = anchor.href;
    if (href.startsWith("javascript:") || href === "#") {
      broken.push({ url: href, issue: "رابط وهمي (javascript: أو #)" });
    } else if (href.startsWith("http") && !href.includes(window.location.hostname)) {
      broken.push({ url: href.slice(0, 60), issue: "رابط خارجي — لم يُفحص" });
    }
  }
  return broken;
}

// فحص الصور المعطوبة
function scanImages(): ImageResult[] {
  const imgs = document.querySelectorAll("img");
  const results: ImageResult[] = [];
  imgs.forEach((img) => {
    if (!img.complete || img.naturalWidth === 0) {
      results.push({ src: img.src?.slice(0, 60) || "بدون مصدر", issue: "الصورة لم تُحمَّل" });
    }
    if (!img.alt) {
      results.push({ src: img.src?.slice(0, 40) || "بدون مصدر", issue: "لا يوجد alt — مشكلة وصول" });
    }
  });
  return results;
}

// فحص النماذج
function scanForms(): FormResult[] {
  const forms = document.querySelectorAll("form");
  const results: FormResult[] = [];
  forms.forEach((form, i) => {
    const inputs = form.querySelectorAll("input, textarea, select");
    const issues: string[] = [];
    inputs.forEach((input) => {
      const inp = input as HTMLInputElement;
      if (!inp.name && !inp.id) issues.push(`حقل بدون name أو id`);
      if (inp.required && !inp.value) issues.push(`حقل مطلوب فارغ (${inp.placeholder || inp.type})`);
    });
    if (!form.querySelector("[type='submit'], button:not([type='button'])")) {
      issues.push("لا يوجد زر إرسال");
    }
    results.push({
      form: `نموذج #${i + 1}`,
      fields: inputs.length,
      issues,
    });
  });
  return results;
}

// ==========================================
// مكوّن الأداة الرئيسي
// ==========================================
export default function CodeInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("buttons");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResults>({
    buttons: [],
    errors: [],
    links: [],
    images: [],
    forms: [],
    summary: null,
  });
  const [filter, setFilter] = useState("all");
  const [log, setLog] = useState<string[]>([]);

  // اعتراض أخطاء الكونسول
  useEffect(() => {
    if (!window.__inspectorErrors) window.__inspectorErrors = [];
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...args: any[]) => {
      window.__inspectorErrors!.push({ type: "error", msg: args.join(" "), time: new Date().toLocaleTimeString("ar") });
      origError(...args);
    };
    console.warn = (...args: any[]) => {
      window.__inspectorErrors!.push({ type: "warn", msg: args.join(" "), time: new Date().toLocaleTimeString("ar") });
      origWarn(...args);
    };
    const onError = (e: ErrorEvent) => {
      window.__inspectorErrors!.push({ type: "error", msg: e.message + " — " + (e.filename || ""), time: new Date().toLocaleTimeString("ar") });
    };
    window.addEventListener("error", onError);
    return () => {
      console.error = origError;
      console.warn = origWarn;
      window.removeEventListener("error", onError);
    };
  }, []);

  const addLog = (msg: string) => setLog((prev) => [`[${new Date().toLocaleTimeString("ar")}] ${msg}`, ...prev].slice(0, 50));

  const runScan = useCallback(async () => {
    setScanning(true);
    setProgress(0);
    setLog([]);
    addLog("🚀 بدء الفحص الشامل...");

    await sleep(300);
    setProgress(15);
    addLog("🔘 فحص الأزرار والعناصر التفاعلية...");
    const buttons = scanButtons();

    await sleep(400);
    setProgress(35);
    addLog("🐛 جمع أخطاء الكونسول...");
    const errors = scanConsoleErrors();

    await sleep(300);
    setProgress(55);
    addLog("🔗 فحص الروابط...");
    const links = await scanBrokenLinks();

    await sleep(300);
    setProgress(70);
    addLog("🖼️ فحص الصور...");
    const images = scanImages();

    await sleep(300);
    setProgress(85);
    addLog("📋 فحص النماذج...");
    const forms = scanForms();

    await sleep(400);
    setProgress(100);

    const totalIssues =
      buttons.filter((b) => b.issues.length > 0).length +
      errors.length +
      links.length +
      images.length +
      forms.reduce((a, f) => a + f.issues.length, 0);

    const summary: Summary = {
      buttons: buttons.length,
      buttonIssues: buttons.filter((b) => b.issues.length > 0).length,
      errors: errors.length,
      links: links.length,
      images: images.length,
      forms: forms.length,
      totalIssues,
      health: totalIssues === 0 ? "ممتاز" : totalIssues < 5 ? "جيد" : totalIssues < 15 ? "يحتاج مراجعة" : "يحتاج إصلاح",
      healthColor: totalIssues === 0 ? "#22c55e" : totalIssues < 5 ? "#84cc16" : totalIssues < 15 ? "#f59e0b" : "#ef4444",
    };

    setResults({ buttons, errors, links, images, forms, summary });
    addLog(`✅ انتهى الفحص — ${totalIssues} مشكلة تم اكتشافها`);
    setScanning(false);
  }, []);

  const filteredButtons = results.buttons.filter((b) => {
    if (filter === "issues") return b.issues.length > 0;
    if (filter === "ok") return b.issues.length === 0;
    return true;
  });

  // ==========================================
  // الواجهة
  // ==========================================
  return (
    <>
      {/* زر الفتح العائم */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            zIndex: 99999,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 50,
            width: 56,
            height: 56,
            fontSize: 24,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s",
          }}
          title="فتح أداة الفحص"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          🔍
        </button>
      )}

      {/* لوحة الفحص */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            zIndex: 99999,
            width: 420,
            maxHeight: "85vh",
            background: "#0f0f1a",
            border: "1px solid #2d2d5e",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            color: "#e2e8f0",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          {/* الرأس */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e1e3f, #2d2d5e)",
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #3d3d7e",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔍</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#a78bfa" }}>Code Inspector</div>
                <div style={{ fontSize: 11, color: "#6366f1", opacity: 0.8 }}>فاحص الكود والأزرار الشامل</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={runScan}
                disabled={scanning}
                style={{
                  background: scanning ? "#374151" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  cursor: scanning ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {scanning ? "جاري الفحص..." : "🔄 فحص"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  color: "#94a3b8",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* شريط التقدم */}
          {scanning && (
            <div style={{ background: "#1e1e3f", padding: "8px 16px" }}>
              <div style={{ background: "#2d2d5e", borderRadius: 99, height: 6, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #6366f1, #a78bfa)",
                    transition: "width 0.3s",
                    borderRadius: 99,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "#6366f1", marginTop: 4 }}>{progress}% — {log[0] || "..."}</div>
            </div>
          )}

          {/* ملخص النتائج */}
          {results.summary && !scanning && (
            <div
              style={{
                background: "#1a1a2e",
                padding: "10px 16px",
                borderBottom: "1px solid #2d2d5e",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "أزرار", val: results.summary.buttons, color: "#6366f1" },
                  { label: "مشاكل", val: results.summary.totalIssues, color: results.summary.totalIssues > 0 ? "#ef4444" : "#22c55e" },
                  { label: "أخطاء", val: results.summary.errors, color: "#f59e0b" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: results.summary.healthColor + "22",
                  border: `1px solid ${results.summary.healthColor}44`,
                  color: results.summary.healthColor,
                  padding: "4px 10px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {results.summary.health}
              </div>
            </div>
          )}

          {/* التبويبات */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #2d2d5e",
              background: "#0f0f1a",
              overflowX: "auto",
            }}
          >
            {[
              { id: "buttons", label: "🔘 الأزرار", count: results.summary?.buttonIssues },
              { id: "errors", label: "🐛 الأخطاء", count: results.errors.length },
              { id: "links", label: "🔗 الروابط", count: results.links.length },
              { id: "images", label: "🖼️ الصور", count: results.images.length },
              { id: "forms", label: "📋 النماذج", count: results.forms.length },
              { id: "log", label: "📜 السجل" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? "#1e1e3f" : "transparent",
                  color: activeTab === tab.id ? "#a78bfa" : "#64748b",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
                  padding: "8px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  position: "relative",
                }}
              >
                {tab.label}
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      borderRadius: 99,
                      fontSize: 9,
                      padding: "1px 4px",
                      marginLeft: 3,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* المحتوى */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>

            {/* تبويب الأزرار */}
            {activeTab === "buttons" && (
              <>
                {results.buttons.length === 0 ? (
                  <EmptyState scanning={scanning} label="لم يُشغَّل الفحص بعد — اضغط 'فحص'" />
                ) : (
                  <>
                    <FilterBar filter={filter} setFilter={setFilter} />
                    {filteredButtons.map((btn) => (
                      <ItemCard
                        key={btn.id}
                        status={btn.status}
                        title={btn.text || "بدون نص"}
                        subtitle={`<${btn.tag}> — ${btn.visible ? "مرئي" : "مخفي"}`}
                        issues={btn.issues}
                      />
                    ))}
                    {filteredButtons.length === 0 && (
                      <div style={{ color: "#22c55e", textAlign: "center", padding: 20, fontSize: 13 }}>
                        ✅ لا توجد مشاكل في هذا الفلتر
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* تبويب الأخطاء */}
            {activeTab === "errors" && (
              <>
                {results.errors.length === 0 ? (
                  <EmptyState scanning={scanning} label={results.summary ? "✅ لا توجد أخطاء في الكونسول" : "لم يُشغَّل الفحص بعد"} />
                ) : (
                  results.errors.map((e, i) => (
                    <ItemCard
                      key={i}
                      status={e.type === "error" ? "❌" : "⚠️"}
                      title={e.msg?.slice(0, 80)}
                      subtitle={e.time}
                      issues={[]}
                    />
                  ))
                )}
              </>
            )}

            {/* تبويب الروابط */}
            {activeTab === "links" && (
              <>
                {results.links.length === 0 ? (
                  <EmptyState scanning={scanning} label={results.summary ? "✅ لا توجد روابط مشكوك فيها" : "لم يُشغَّل الفحص بعد"} />
                ) : (
                  results.links.map((l, i) => (
                    <ItemCard key={i} status="⚠️" title={l.url} subtitle={l.issue} issues={[]} />
                  ))
                )}
              </>
            )}

            {/* تبويب الصور */}
            {activeTab === "images" && (
              <>
                {results.images.length === 0 ? (
                  <EmptyState scanning={scanning} label={results.summary ? "✅ جميع الصور سليمة" : "لم يُشغَّل الفحص بعد"} />
                ) : (
                  results.images.map((img, i) => (
                    <ItemCard key={i} status="⚠️" title={img.src || "صورة بدون مصدر"} subtitle={img.issue} issues={[]} />
                  ))
                )}
              </>
            )}

            {/* تبويب النماذج */}
            {activeTab === "forms" && (
              <>
                {results.forms.length === 0 ? (
                  <EmptyState scanning={scanning} label={results.summary ? "ℹ️ لا توجد نماذج في الصفحة" : "لم يُشغَّل الفحص بعد"} />
                ) : (
                  results.forms.map((f, i) => (
                    <ItemCard
                      key={i}
                      status={f.issues.length === 0 ? "✅" : "⚠️"}
                      title={f.form}
                      subtitle={`${f.fields} حقل`}
                      issues={f.issues}
                    />
                  ))
                )}
              </>
            )}

            {/* تبويب السجل */}
            {activeTab === "log" && (
              <div>
                {log.length === 0 ? (
                  <EmptyState scanning={false} label="السجل فارغ — شغّل الفحص أولاً" />
                ) : (
                  log.map((entry, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "5px 8px",
                        fontSize: 11,
                        color: i === 0 ? "#a78bfa" : "#64748b",
                        borderBottom: "1px solid #1e1e3f",
                        fontFamily: "monospace",
                      }}
                    >
                      {entry}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* التذييل */}
          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid #2d2d5e",
              fontSize: 10,
              color: "#374151",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Code Inspector v1.0</span>
            <span>فاحص الكود والأزرار الشامل</span>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// مكوّنات مساعدة
// ==========================================
function EmptyState({ scanning, label }: { scanning: boolean; label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: 13 }}>
      {scanning ? (
        <>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          جاري الفحص...
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          {label}
        </>
      )}
    </div>
  );
}

function FilterBar({ filter, setFilter }: { filter: string; setFilter: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      {[
        { id: "all", label: "الكل" },
        { id: "issues", label: "⚠️ مشاكل فقط" },
        { id: "ok", label: "✅ سليم" },
      ].map((f) => (
        <button
          key={f.id}
          onClick={() => setFilter(f.id)}
          style={{
            background: filter === f.id ? "#6366f1" : "#1e1e3f",
            color: filter === f.id ? "#fff" : "#94a3b8",
            border: "1px solid " + (filter === f.id ? "#6366f1" : "#2d2d5e"),
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function ItemCard({ status, title, subtitle, issues }: { status: string; title: string; subtitle?: string; issues: string[] }) {
  return (
    <div
      style={{
        background: "#1a1a2e",
        border: "1px solid " + (issues.length > 0 ? "#7c3aed44" : "#2d2d5e"),
        borderRadius: 8,
        padding: "8px 10px",
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{status}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#e2e8f0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{subtitle}</div>
          )}
          {issues.map((issue, i) => (
            <div
              key={i}
              style={{
                marginTop: 4,
                fontSize: 10,
                color: "#fbbf24",
                background: "#451a0322",
                border: "1px solid #92400e44",
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              ⚠ {issue}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
