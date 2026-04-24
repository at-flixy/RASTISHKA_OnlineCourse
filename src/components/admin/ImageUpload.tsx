"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  aspect?: "video" | "square" | "product" | "story"; // 16:9 | 1:1 | 3:2 | 4:5
  label?: string;
}

const aspectClasses = {
  video: "aspect-video",
  square: "aspect-square",
  product: "aspect-[3/2]",
  story: "aspect-[4/5]",
};

export function ImageUpload({
  value,
  onChange,
  aspect = "product",
  label = "Изображение",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Ошибка загрузки");
          return;
        }

        onChange(data.url);
      } catch {
        setError("Ошибка соединения");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUrlApply = () => {
    if (urlInputValue.trim()) {
      onChange(urlInputValue.trim());
      setShowUrlInput(false);
      setUrlInputValue("");
    }
  };

  const handleRemove = () => {
    onChange("");
    setError(null);
  };

  return (
    <div className="space-y-2">
      {/* Drop zone / preview */}
      <div
        className={cn(
          "relative w-full rounded-xl border-2 border-dashed transition-all overflow-hidden bg-muted/30",
          aspectClasses[aspect],
          isDragging && "border-primary bg-primary/5 scale-[1.01]",
          !isDragging && !value && "border-border hover:border-primary/50 cursor-pointer",
          value && "border-transparent"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !value && !isUploading && inputRef.current?.click()}
      >
        {/* Image preview */}
        {value && !isUploading && (
          <>
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
              unoptimized={value.startsWith("/api/media/")}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="flex items-center gap-1.5 bg-white text-foreground text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Заменить
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                className="flex items-center gap-1.5 bg-white text-destructive text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-destructive hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Удалить
              </button>
            </div>
          </>
        )}

        {/* Uploading spinner */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Загрузка...</span>
          </div>
        )}

        {/* Empty state */}
        {!value && !isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
              <ImageIcon className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Отпустите файл" : "Перетащите или нажмите"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP, GIF · до 5 МБ
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="text-xs h-8"
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          {value ? "Заменить файл" : "Загрузить файл"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput((v) => !v)}
          className="text-xs h-8 text-muted-foreground"
        >
          <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
          По URL
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-xs h-8 text-destructive hover:text-destructive ml-auto"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Удалить
          </Button>
        )}
      </div>

      {/* URL input (collapsible) */}
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            placeholder="https://..."
            className="text-sm h-8"
            onKeyDown={(e) => e.key === "Enter" && handleUrlApply()}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUrlApply}
            className="h-8 shrink-0"
          >
            Применить
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(false)}
            className="h-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
