"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ImportedData } from "@/modules/import/lib/analyse-document";

type DropzoneState = "idle" | "loading" | "success" | "error";

export function DocumentDropzone({
  projectId,
  onImportStart,
  onImportComplete,
  onImportError,
}: {
  projectId: string;
  onImportStart?: () => void;
  onImportComplete: (data: ImportedData) => void;
  onImportError?: () => void;
}) {
  const [state, setState] = useState<DropzoneState>("idle");
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Client-side validation
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        setState("error");
        setErrorMessage(
          "Unsupported file type. Please upload a .docx or .pdf file."
        );
        return;
      }
      if (file.size > 24 * 1024 * 1024) {
        setState("error");
        setErrorMessage("File too large. Maximum size is 24MB.");
        return;
      }

      setFileName(file.name);
      setState("loading");
      setErrorMessage("");
      onImportStart?.();

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);

        const response = await fetch("/api/import/requirements", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error || "Import failed. Please try again."
          );
        }

        const importedData: ImportedData = await response.json();
        setState("success");
        onImportComplete(importedData);
      } catch (error) {
        setState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Import failed. Please try again."
        );
        onImportError?.();
      }
    },
    [projectId, onImportStart, onImportComplete, onImportError]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (state === "loading") return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleClick() {
    if (state === "loading") return;
    fileInputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleRetry() {
    setState("idle");
    setFileName("");
    setErrorMessage("");
  }

  return (
    <div className="mb-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          state === "idle"
            ? "border-gray-700 hover:border-gray-500"
            : state === "loading"
              ? "cursor-wait border-blue-600 bg-blue-600/5"
              : state === "success"
                ? "border-green-600 bg-green-600/5"
                : "border-red-600 bg-red-600/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {state === "idle" && (
          <>
            <Upload className="mx-auto mb-2 h-8 w-8 text-gray-500" />
            <p className="text-sm font-medium text-gray-300">
              Import from a requirements document
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Drag and drop a .docx or .pdf file, or click to browse
            </p>
          </>
        )}

        {state === "loading" && (
          <>
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm font-medium text-gray-300">{fileName}</p>
            <p className="mt-1 text-xs text-blue-400">
              Analysing your document...
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
            <p className="text-sm font-medium text-gray-300">{fileName}</p>
            <p className="mt-1 text-xs text-green-400">
              Document imported successfully
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
            <p className="text-sm font-medium text-gray-300">{errorMessage}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              className="mt-2 text-xs text-red-400 underline hover:text-red-300"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
