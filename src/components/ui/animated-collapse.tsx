"use client";

import { AnimatePresence, motion, type Transition } from "motion/react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type AnimatedCollapseProps = {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  transition?: Transition;
};

export function AnimatedCollapse({
  open,
  children,
  className,
  transition = { type: "spring", stiffness: 280, damping: 28 },
}: AnimatedCollapseProps) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type AnimatedCollapseChevronProps = {
  open: boolean;
  className?: string;
};

export function AnimatedCollapseChevron({ open, className }: AnimatedCollapseChevronProps) {
  return (
    <motion.span
      animate={{ rotate: open ? 90 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn("inline-flex", className)}
    >
      <ChevronRight className="size-4" />
    </motion.span>
  );
}
