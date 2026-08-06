import { Link } from "@tanstack/react-router";
import { BrandLogo } from "./BrandLogo";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-cyan-400/30 bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <BrandLogo size={160} withWordmark />
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {t("footer.tagline")}
            </p>
          </div>
          <FooterCol
            title={t("footer.platform")}
            links={[
              [t("nav.home"), "/"],
              [t("nav.feed"), "/community"],
              [t("nav.profile"), "/profile"],
              [t("nav.wallet"), "/wallet"],
            ]}
          />
          <FooterCol
            title={t("footer.projects")}
            links={[
              [t("nav.feed"), "/community"],
              [t("nav.market"), "/market"],
              [t("nav.assistant"), "/assistant"],
            ]}
          />
          <FooterCol
            title={t("footer.company")}
            links={[
              [t("nav.about"), "/about"],
              [t("nav.profile"), "/profile"],
              [t("nav.support"), "/support"],
            ]}
          />
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-700 pt-6 md:flex-row">
          <div className="text-xs font-semibold text-slate-300">
            {t("footer.copyright")}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-3 text-sm font-extrabold text-white">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={`${href}-${label}`}>
            <Link
              to={href}
              className="font-semibold text-slate-300 transition hover:text-cyan-300 focus-visible:text-cyan-300"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
