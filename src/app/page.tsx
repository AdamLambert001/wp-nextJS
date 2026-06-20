import { HomeHero } from "@/components/home/home-hero";
import { HomeScrollSection } from "@/components/home/home-scroll-section";
import { HomeShell } from "@/components/home/home-shell";
import { loadHomePageContent } from "@/lib/home/load";
import { siteConfig } from "@/lib/site-config";

export default async function HomePage() {
  const content = await loadHomePageContent();

  return (
    <HomeShell>
      <main>
        <HomeHero hero={content.hero} slideshowImages={content.slideshowImages} />

        <section
          aria-label="About Zeta Company"
          className="mx-auto max-w-4xl space-y-12 px-4 py-24 sm:px-6"
        >
          {content.sections.map((section) => (
            <HomeScrollSection key={section.id} section={section} />
          ))}
        </section>

        <footer className="border-t border-border/80 bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
            <p>{siteConfig.siteTitle} — Arma 3 Halosim Unit</p>
          </div>
        </footer>
      </main>
    </HomeShell>
  );
}
