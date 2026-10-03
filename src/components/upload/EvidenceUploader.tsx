"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

interface EvidenceUploaderProps {
  onFilesChange?: (files: File[]) => void;
}

interface UploadedFile {
  id: string;
  file: File;
}

export default function EvidenceUploader({
  onFilesChange,
}: EvidenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFilesChangeRef = useRef(onFilesChange);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onFilesChangeRef.current = onFilesChange;
  }, [onFilesChange]);

  useEffect(() => {
    onFilesChangeRef.current?.(
      files.map((item) => item.file)
    );
  }, [files]);

  const addFiles = (incomingFiles: FileList | File[]) => {
    const newFiles = Array.from(incomingFiles)
      .filter((file) => file.size > 0)
      .map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
      }));

    setFiles((current) => {
      const existingIds = new Set(
        current.map((item) => item.id)
      );

      const uniqueFiles = newFiles.filter(
        (item) => !existingIds.has(item.id)
      );

      return [...current, ...uniqueFiles];
    });
  };

  const removeFile = (id: string) => {
    setFiles((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileType = (file: File) => {
    if (file.type.startsWith("image/")) {
      return "IMAGE";
    }

    if (file.type.startsWith("video/")) {
      return "VIDEO";
    }

    if (file.type.startsWith("audio/")) {
      return "AUDIO";
    }

    if (
      file.type.includes("pdf") ||
      file.type.includes("document")
    ) {
      return "DOCUMENT";
    }

    if (
      file.type.includes("text") ||
      file.name.toLowerCase().endsWith(".txt")
    ) {
      return "MESSAGE";
    }

    return "FILE";
  };

  const getFileIcon = (file: File) => {
    const type = getFileType(file);

    if (type === "IMAGE") {
      return "◉";
    }

    if (type === "VIDEO") {
      return "▶";
    }

    if (type === "AUDIO") {
      return "◒";
    }

    if (type === "DOCUMENT") {
      return "▤";
    }

    if (type === "MESSAGE") {
      return "≡";
    }

    return "•";
  };

  return (
    <section className="rounded-lg border border-slate-700 bg-[#111827]">
      <div className="border-b border-slate-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">
              EVIDENCE INGESTION
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-100">
              Add Evidence
            </h2>
          </div>

          <span className="rounded border border-slate-700 bg-[#0f172a] px-2 py-1 text-[9px] font-semibold tracking-widest text-slate-500">
            {files.length} FILE{files.length === 1 ? "" : "S"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => {
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`group flex w-full flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-all ${
            isDragging
              ? "border-cyan-400 bg-cyan-500/10"
              : "border-slate-700 bg-[#0f172a] hover:border-cyan-500/50 hover:bg-slate-900"
          }`}
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl transition-all ${
              isDragging
                ? "border-cyan-400 bg-cyan-500/10 text-cyan-300"
                : "border-slate-700 bg-[#111827] text-cyan-400 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/5"
            }`}
          >
            +
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-200">
            {isDragging
              ? "Drop evidence here"
              : "Upload evidence"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Click to browse or drag and drop files here
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {[
              "IMAGE",
              "VIDEO",
              "AUDIO",
              "DOCUMENT",
              "MESSAGE",
            ].map((type) => (
              <span
                key={type}
                className="rounded border border-slate-800 bg-[#111827] px-2 py-1 text-[8px] font-semibold tracking-widest text-slate-600"
              >
                {type}
              </span>
            ))}
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
          onChange={(event) => {
            if (event.target.files) {
              addFiles(event.target.files);
            }

            event.target.value = "";
          }}
        />

        {files.length > 0 && (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                  SELECTED EVIDENCE
                </p>

                <p className="mt-1 text-[10px] text-slate-600">
                  Evidence bundle ready for investigation
                </p>
              </div>

              <span className="text-[10px] text-slate-600">
                {files.length} ITEMS
              </span>
            </div>

            <div className="space-y-2">
              {files.map(({ id, file }) => {
                const fileType = getFileType(file);

                return (
                  <div
                    key={id}
                    className="group flex items-center gap-3 rounded-md border border-slate-700 bg-[#0f172a] p-3 transition-colors hover:border-slate-600"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/5 text-sm font-bold text-cyan-400">
                      {getFileIcon(file)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">
                        {file.name}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[9px] font-semibold tracking-wider text-cyan-500/70">
                          {fileType}
                        </span>

                        <span className="text-slate-700">
                          •
                        </span>

                        <span className="text-[9px] text-slate-600">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-700 text-xs text-slate-500 transition-colors hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400"
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[9px] font-semibold tracking-widest text-emerald-400">
                EVIDENCE BUNDLE READY
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
