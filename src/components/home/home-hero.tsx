import Image from "next/image";
import { DiscordJoinButton } from "@/components/discord-join-button";
import { HomeLearnMoreButton } from "@/components/home/home-learn-more-button";
import type { HomePageContent, HomeSlideshowImage } from "@/lib/home/types";
import { siteConfig } from "@/lib/site-config";

type HomeHeroProps = {
  hero: HomePageContent["hero"];
  slideshowImages: readonly HomeSlideshowImage[];
};

export function HomeHero({ hero, slideshowImages }: HomeHeroProps) {
  return (
    <section className="home-hero">
      <div className="home-hero__slideshow" aria-hidden="true">
        {slideshowImages.map((image, index) => (
          <div key={`${image.src}-${index}`} className="home-hero__slide">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="home-hero__scrim" aria-hidden="true" />
      <div className="home-hero__accent" aria-hidden="true" />
      <div className="home-hero__grid" aria-hidden="true" />
      <div className="home-hero__fade-bottom" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl items-center px-4 py-16 sm:px-6 sm:py-24">
        <div className="home-hero__copy max-w-3xl">
          <p className="home-section-title mb-4">{hero.motto}</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {siteConfig.siteTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/90">
            {hero.lead}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <DiscordJoinButton />
            <HomeLearnMoreButton />
          </div>
        </div>
      </div>
    </section>
  );
}
