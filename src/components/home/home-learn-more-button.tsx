"use client";

import { Button } from "@/components/ui/button";

type HomeLearnMoreButtonProps = {
  targetId?: string;
};

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function HomeLearnMoreButton({ targetId = "about" }: HomeLearnMoreButtonProps) {
  function handleClick() {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      target.scrollIntoView({ block: "start" });
      return;
    }

    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY;
    const distance = targetY - startY;
    const duration = 900;
    let startTime: number | null = null;

    function step(currentTime: number) {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  return (
    <Button type="button" variant="secondary" size="lg" onClick={handleClick}>
      Learn more
    </Button>
  );
}
