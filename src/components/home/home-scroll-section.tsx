"use client";

import { DiscordJoinButton } from "@/components/discord-join-button";
import type { HomeSection } from "@/lib/home/types";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type HomeScrollSectionProps = {
  section: HomeSection;
  className?: string;
};

export function HomeScrollSection({ section, className }: HomeScrollSectionProps) {
  return (
    <motion.article
      id={section.id}
      initial={{ opacity: 0, x: -32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "scroll-mt-24 rounded-r-md border border-border/60 border-l-4 border-l-secondary bg-card/50 p-6 backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      <header>
        <h2 className="home-section-title">{section.title}</h2>
        {section.subtitle ? (
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {section.subtitle}
          </p>
        ) : null}
      </header>

      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="mt-4 text-base leading-relaxed text-muted-foreground">
          {paragraph}
        </p>
      ))}

      {section.departments ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {section.departments.map((department) => (
            <li
              key={department.name}
              className="rounded-md border border-border/50 bg-background/40 p-4"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                {department.name}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {department.role}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {department.description}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {section.bullets ? (
        <ul className="mt-4 space-y-3">
          {section.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-3 text-base leading-relaxed text-muted-foreground"
            >
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {section.showDiscordCta ? (
        <div className="mt-8">
          <DiscordJoinButton />
        </div>
      ) : null}
    </motion.article>
  );
}
