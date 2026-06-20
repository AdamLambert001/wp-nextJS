"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  loadHomePageContentAction,
  saveHomePageContentAction,
} from "@/app/admin/actions/home-content";
import { ImageUrlOrUpload } from "@/components/edgestore/image-url-or-upload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type {
  HomeDepartment,
  HomePageContent,
  HomeSection,
  HomeSlideshowImage,
} from "@/lib/home/types";
import { slugifyInput } from "@/lib/sr-settings/slug";
import { toast } from "@/lib/toast";

type HomePageEditorDialogProps = {
  open: boolean;
  onClose: () => void;
};

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}

function createEmptySection(): HomeSection {
  const title = "New section";
  return {
    id: slugifyInput(title),
    title,
    paragraphs: [""],
  };
}

function createEmptyDepartment(): HomeDepartment {
  return { name: "", role: "", description: "" };
}

export function HomePageEditorDialog({ open, onClose }: HomePageEditorDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<HomePageContent | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const result = await loadHomePageContentAction();
        if (!result.ok) {
          throw new Error(result.message);
        }
        if (!cancelled) {
          setContent(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load home page content");
          onClose();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onClose, open]);

  function updateHero(patch: Partial<HomePageContent["hero"]>) {
    setContent((current) =>
      current ? { ...current, hero: { ...current.hero, ...patch } } : current,
    );
  }

  function updateSlideshow(index: number, patch: Partial<HomeSlideshowImage>) {
    setContent((current) => {
      if (!current) return current;
      const slideshowImages = current.slideshowImages.map((image, imageIndex) =>
        imageIndex === index ? { ...image, ...patch } : image,
      );
      return { ...current, slideshowImages };
    });
  }

  function addSlideshowImage() {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        slideshowImages: [
          ...current.slideshowImages,
          { src: "", alt: "Zeta Company" },
        ],
      };
    });
  }

  function removeSlideshowImage(index: number) {
    setContent((current) => {
      if (!current || current.slideshowImages.length <= 1) {
        return current;
      }
      return {
        ...current,
        slideshowImages: current.slideshowImages.filter((_, imageIndex) => imageIndex !== index),
      };
    });
  }

  function moveSlideshowImage(index: number, direction: -1 | 1) {
    setContent((current) => {
      if (!current) return current;
      return {
        ...current,
        slideshowImages: moveItem(current.slideshowImages, index, direction),
      };
    });
  }

  function updateSection(index: number, patch: Partial<HomeSection>) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, sectionIndex) => {
        if (sectionIndex !== index) {
          return section;
        }

        const next = { ...section, ...patch };
        if (patch.title && !patch.id) {
          next.id = slugifyInput(patch.title) || next.id;
        }
        return next;
      });
      return { ...current, sections };
    });
  }

  function updateSectionList(
    index: number,
    key: "paragraphs" | "bullets",
    listIndex: number,
    value: string,
  ) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, sectionIndex) => {
        if (sectionIndex !== index) {
          return section;
        }

        const list = [...(section[key] ?? [])];
        list[listIndex] = value;
        return { ...section, [key]: list };
      });
      return { ...current, sections };
    });
  }

  function addSectionListItem(index: number, key: "paragraphs" | "bullets") {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, sectionIndex) => {
        if (sectionIndex !== index) {
          return section;
        }
        return { ...section, [key]: [...(section[key] ?? []), ""] };
      });
      return { ...current, sections };
    });
  }

  function removeSectionListItem(index: number, key: "paragraphs" | "bullets", listIndex: number) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, sectionIndex) => {
        if (sectionIndex !== index) {
          return section;
        }
        const list = (section[key] ?? []).filter((_, itemIndex) => itemIndex !== listIndex);
        return { ...section, [key]: list.length ? list : undefined };
      });
      return { ...current, sections };
    });
  }

  function updateDepartment(
    sectionIndex: number,
    departmentIndex: number,
    patch: Partial<HomeDepartment>,
  ) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const departments = (section.departments ?? []).map((department, deptIndex) =>
          deptIndex === departmentIndex ? { ...department, ...patch } : department,
        );
        return { ...section, departments };
      });
      return { ...current, sections };
    });
  }

  function addDepartment(sectionIndex: number) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }
        return {
          ...section,
          departments: [...(section.departments ?? []), createEmptyDepartment()],
        };
      });
      return { ...current, sections };
    });
  }

  function removeDepartment(sectionIndex: number, departmentIndex: number) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }
        const departments = (section.departments ?? []).filter(
          (_, deptIndex) => deptIndex !== departmentIndex,
        );
        return {
          ...section,
          departments: departments.length ? departments : undefined,
        };
      });
      return { ...current, sections };
    });
  }

  function addSection() {
    setContent((current) => {
      if (!current) return current;
      return { ...current, sections: [...current.sections, createEmptySection()] };
    });
  }

  function removeSection(index: number) {
    setContent((current) => {
      if (!current || current.sections.length <= 1) {
        return current;
      }
      return {
        ...current,
        sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index),
      };
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    setContent((current) => {
      if (!current) return current;
      return { ...current, sections: moveItem(current.sections, index, direction) };
    });
  }

  async function handleSave() {
    if (!content) {
      return;
    }

    setSaving(true);
    try {
      const result = await saveHomePageContentAction(content);
      if (!result.ok) {
        throw new Error(result.message);
      }
      toast.success("Home page content saved.");
      router.refresh();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save home page content");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit home page</DialogTitle>
          <DialogDescription>
            Update the hero copy, slideshow images, and scroll sections shown on the public home
            page. Slideshow images can be uploaded via EdgeStore or linked by URL.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-4">
          {loading || !content ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="size-6" />
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                  Hero
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="home-hero-motto">Motto</Label>
                  <Input
                    id="home-hero-motto"
                    value={content.hero.motto}
                    onChange={(event) => updateHero({ motto: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="home-hero-lead">Lead paragraph</Label>
                  <Textarea
                    id="home-hero-lead"
                    value={content.hero.lead}
                    onChange={(event) => updateHero({ lead: event.target.value })}
                    rows={4}
                  />
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    Slideshow images
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addSlideshowImage}>
                    <Plus className="size-4" />
                    Add image
                  </Button>
                </div>

                {content.slideshowImages.map((image, index) => (
                  <div
                    key={`slideshow-${index}`}
                    className="space-y-3 rounded-lg border border-border/70 bg-card/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Slide {index + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          onClick={() => moveSlideshowImage(index, -1)}
                          aria-label="Move slide up"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === content.slideshowImages.length - 1}
                          onClick={() => moveSlideshowImage(index, 1)}
                          aria-label="Move slide down"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={content.slideshowImages.length <= 1}
                          onClick={() => removeSlideshowImage(index)}
                          aria-label="Remove slide"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <ImageUrlOrUpload
                      label="Image"
                      folder="home"
                      value={image.src}
                      onChange={(src) => updateSlideshow(index, { src })}
                    />
                    <div className="space-y-2">
                      <Label htmlFor={`slideshow-alt-${index}`}>Alt text</Label>
                      <Input
                        id={`slideshow-alt-${index}`}
                        value={image.alt}
                        onChange={(event) => updateSlideshow(index, { alt: event.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </section>

              <Separator />

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    Scroll sections
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addSection}>
                    <Plus className="size-4" />
                    Add section
                  </Button>
                </div>

                {content.sections.map((section, sectionIndex) => (
                  <div
                    key={`${section.id}-${sectionIndex}`}
                    className="space-y-4 rounded-lg border border-border/70 bg-card/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{section.title || "Untitled section"}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={sectionIndex === 0}
                          onClick={() => moveSection(sectionIndex, -1)}
                          aria-label="Move section up"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={sectionIndex === content.sections.length - 1}
                          onClick={() => moveSection(sectionIndex, 1)}
                          aria-label="Move section down"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={content.sections.length <= 1}
                          onClick={() => removeSection(sectionIndex)}
                          aria-label="Remove section"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`section-title-${sectionIndex}`}>Title</Label>
                        <Input
                          id={`section-title-${sectionIndex}`}
                          value={section.title}
                          onChange={(event) =>
                            updateSection(sectionIndex, { title: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`section-id-${sectionIndex}`}>Anchor ID</Label>
                        <Input
                          id={`section-id-${sectionIndex}`}
                          value={section.id}
                          onChange={(event) =>
                            updateSection(sectionIndex, { id: slugifyInput(event.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`section-subtitle-${sectionIndex}`}>Subtitle (optional)</Label>
                      <Input
                        id={`section-subtitle-${sectionIndex}`}
                        value={section.subtitle ?? ""}
                        onChange={(event) =>
                          updateSection(sectionIndex, {
                            subtitle: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Paragraphs</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addSectionListItem(sectionIndex, "paragraphs")}
                        >
                          <Plus className="size-4" />
                          Add paragraph
                        </Button>
                      </div>
                      {(section.paragraphs ?? []).map((paragraph, paragraphIndex) => (
                        <div key={`paragraph-${sectionIndex}-${paragraphIndex}`} className="flex gap-2">
                          <Textarea
                            value={paragraph}
                            onChange={(event) =>
                              updateSectionList(
                                sectionIndex,
                                "paragraphs",
                                paragraphIndex,
                                event.target.value,
                              )
                            }
                            rows={3}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              removeSectionListItem(sectionIndex, "paragraphs", paragraphIndex)
                            }
                            aria-label="Remove paragraph"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Bullet points</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addSectionListItem(sectionIndex, "bullets")}
                        >
                          <Plus className="size-4" />
                          Add bullet
                        </Button>
                      </div>
                      {(section.bullets ?? []).map((bullet, bulletIndex) => (
                        <div key={`bullet-${sectionIndex}-${bulletIndex}`} className="flex gap-2">
                          <Input
                            value={bullet}
                            onChange={(event) =>
                              updateSectionList(
                                sectionIndex,
                                "bullets",
                                bulletIndex,
                                event.target.value,
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              removeSectionListItem(sectionIndex, "bullets", bulletIndex)
                            }
                            aria-label="Remove bullet"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Departments</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addDepartment(sectionIndex)}
                        >
                          <Plus className="size-4" />
                          Add department
                        </Button>
                      </div>
                      {(section.departments ?? []).map((department, departmentIndex) => (
                        <div
                          key={`department-${sectionIndex}-${departmentIndex}`}
                          className="space-y-2 rounded-md border border-border/60 p-3"
                        >
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeDepartment(sectionIndex, departmentIndex)}
                              aria-label="Remove department"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              placeholder="Name"
                              value={department.name}
                              onChange={(event) =>
                                updateDepartment(sectionIndex, departmentIndex, {
                                  name: event.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Role"
                              value={department.role}
                              onChange={(event) =>
                                updateDepartment(sectionIndex, departmentIndex, {
                                  role: event.target.value,
                                })
                              }
                            />
                          </div>
                          <Textarea
                            placeholder="Description"
                            value={department.description}
                            onChange={(event) =>
                              updateDepartment(sectionIndex, departmentIndex, {
                                description: event.target.value,
                              })
                            }
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={section.showDiscordCta ?? false}
                        onCheckedChange={(checked) =>
                          updateSection(sectionIndex, { showDiscordCta: checked === true })
                        }
                      />
                      Show Join the Discord button in this section
                    </label>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading || !content}>
            {saving ? "Saving..." : "Save home page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
