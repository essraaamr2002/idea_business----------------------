import { Link } from "@tanstack/react-router";
import { BrandLogo } from "./BrandLogo";
import { useI18n } from "@/lib/i18n";
import lionAsset from "@/assets/idea-business-logo.asset.json";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-yellow-500/20 bg-gradient-to-b from-muted/30 via-background to-black mt-20">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <BrandLogo size={160} withWordmark />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
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

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-yellow-500/20 pt-10">
          <div className="relative">
            <div aria-hidden className="absolute inset-0 rounded-full bg-cyan-500/25 blur-3xl" />
            <img
              src={lionAsset.url}
              alt="IDEA BUSINESS"
              className="relative h-44 w-44 md:h-60 md:w-60 object-contain drop-shadow-[0_20px_60px_rgba(14,165,233,0.55)]"
            />
          </div>
          <div className="text-center">
            <div
              className="text-3xl md:text-4xl font-black bg-gradient-to-l from-cyan-300 via-sky-500 to-indigo-500 bg-clip-text text-transparent tracking-[0.2em]"
              style={{ fontFamily: '"Poppins","Segoe UI",sans-serif' }}
            >
              IDEA BUSINESS
            </div>
            <div className="text-xs md:text-sm font-semibold text-muted-foreground tracking-[0.3em] mt-2">
              {t("footer.turningIdeas")}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs font-semibold text-muted-foreground">
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
      <div className="mb-3 text-sm font-extrabold">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={`${href}-${label}`}>
            <Link to={href} className="font-semibold text-muted-foreground transition hover:text-primary">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
