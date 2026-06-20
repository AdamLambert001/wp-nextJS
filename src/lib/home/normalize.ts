import { DEFAULT_HOME_PAGE_CONTENT } from "@/lib/home/defaults";
import type {
  HomeDepartment,
  HomePageContent,
  HomeSection,
  HomeSlideshowImage,
} from "@/lib/home/types";
import { slugifyInput } from "@/lib/sr-settings/slug";

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => cleanString(entry))
    .filter(Boolean);
}

function normalizeDepartment(value: unknown): HomeDepartment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = cleanString(record.name);
  const role = cleanString(record.role);
  const description = cleanString(record.description);

  if (!name && !role && !description) {
    return null;
  }

  return { name, role, description };
}

function normalizeSection(value: unknown, index: number): HomeSection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = cleanString(record.title);
  if (!title) {
    return null;
  }

  const id =
    slugifyInput(cleanString(record.id) || title) || `section-${index + 1}`;
  const subtitle = cleanString(record.subtitle);
  const paragraphs = cleanStringList(record.paragraphs);
  const bullets = cleanStringList(record.bullets);
  const departments = Array.isArray(record.departments)
    ? record.departments
        .map(normalizeDepartment)
        .filter((entry): entry is HomeDepartment => entry !== null)
    : [];

  const section: HomeSection = { id, title };

  if (subtitle) {
    section.subtitle = subtitle;
  }
  if (paragraphs.length) {
    section.paragraphs = paragraphs;
  }
  if (bullets.length) {
    section.bullets = bullets;
  }
  if (departments.length) {
    section.departments = departments;
  }
  if (record.showDiscordCta === true) {
    section.showDiscordCta = true;
  }

  return section;
}

function normalizeSlideshowImage(value: unknown): HomeSlideshowImage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const src = cleanString(record.src);
  if (!src) {
    return null;
  }

  return {
    src,
    alt: cleanString(record.alt, "Zeta Company"),
  };
}

function dedupeSectionIds(sections: HomeSection[]): HomeSection[] {
  const seen = new Set<string>();

  return sections.map((section, index) => {
    let id = section.id;
    if (seen.has(id)) {
      id = `${id}-${index + 1}`;
    }
    seen.add(id);
    return { ...section, id };
  });
}

export function normalizeHomePageContent(raw: unknown): HomePageContent {
  const fallback = DEFAULT_HOME_PAGE_CONTENT;

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const heroRecord =
    record.hero && typeof record.hero === "object"
      ? (record.hero as Record<string, unknown>)
      : {};

  const slideshowImages = Array.isArray(record.slideshowImages)
    ? record.slideshowImages
        .map(normalizeSlideshowImage)
        .filter((entry): entry is HomeSlideshowImage => entry !== null)
    : [];

  const sections = Array.isArray(record.sections)
    ? dedupeSectionIds(
        record.sections
          .map(normalizeSection)
          .filter((entry): entry is HomeSection => entry !== null),
      )
    : [];

  return {
    hero: {
      motto: cleanString(heroRecord.motto, fallback.hero.motto),
      lead: cleanString(heroRecord.lead, fallback.hero.lead),
    },
    slideshowImages: slideshowImages.length ? slideshowImages : fallback.slideshowImages,
    sections: sections.length ? sections : fallback.sections,
  };
}
