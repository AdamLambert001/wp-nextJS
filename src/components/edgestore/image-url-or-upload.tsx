"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Progress,
} from "@/components/ui/progress";
import {
  type ImageUploadFolder,
  useImageUpload,
} from "@/lib/edgestore/use-image-upload";
import { cn } from "@/lib/utils";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";

type ImageUrlOrUploadProps = {
  value: string;
  onChange: (url: string) => void;
  folder: ImageUploadFolder;
  label?: string;
  className?: string;
};

function isEdgeStoreUrl(url: string) {
  return url.includes("files.edgestore.dev");
}

export function ImageUrlOrUpload({
  value,
  onChange,
  folder,
  label = "Image",
  className,
}: ImageUrlOrUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useImageUpload();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, folder, {
        onProgressChange: setProgress,
        replaceTargetUrl: isEdgeStoreUrl(value) ? value : undefined,
      });
      onChange(url);
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDrag(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (uploading) return;
    setDragActive(event.type === "dragenter" || event.type === "dragover");
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>

      {value ? (
        <div className="relative w-fit">
          <Image
            src={value}
            alt="Preview"
            width={120}
            height={120}
            className="h-[120px] w-[120px] rounded-md border border-border object-cover"
            unoptimized
          />
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            className="absolute -top-2 -right-2"
            disabled={uploading}
            onClick={() => onChange("")}
            aria-label="Remove image"
          >
            <X />
          </Button>
        </div>
      ) : null}

      <Input
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste an image URL"
        disabled={uploading}
      />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or upload
        <span className="h-px flex-1 bg-border" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-disabled={uploading}
        aria-labelledby={inputId}
        onKeyDown={(event) => {
          if (uploading) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!uploading) fileInputRef.current?.click();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors",
          dragActive && "border-primary bg-primary/5",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <Upload className="size-5 animate-pulse text-muted-foreground" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
        <div className="text-sm">
          <span className="font-medium text-foreground">
            {uploading ? "Uploading..." : "Drop an image here"}
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            PNG, JPEG, WebP, or GIF up to 10MB
          </p>
        </div>
      </div>

      {uploading ? (
        <div className="grid gap-1">
          <p className="text-xs text-muted-foreground tabular-nums">
            {Math.round(progress)}%
          </p>
          <Progress value={progress} />
        </div>
      ) : null}
    </div>
  );
}
