// Handles the full upload flow: drag & drop or browse, client-side
// validation (mirrors backend rules for instant feedback - the backend
// re-validates regardless, since client checks are never trusted alone),
// upload progress, and success/error reporting via toast.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import ProgressBar from "../ui/ProgressBar";
import {
  AI_OUTPUT_LANGUAGES,
  ALLOWED_UPLOAD_EXTENSIONS,
  DEFAULT_AI_OUTPUT_LANGUAGE,
  DEPARTMENTS,
  MAX_UPLOAD_SIZE_MB,
} from "../../config/departments";
import { uploadDocumentRequest } from "../../api/documents";
import { useToast } from "../../hooks/useToast";

// Live Document Processing Status - how long the "uploaded, now processing"
// confirmation stays up before the modal hands off to the Document Viewer
// (which takes over with the real OCR/AI polling - see DocumentsSection).
const SUCCESS_STAGE_MS = 1400;

const MAX_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

function fileIcon(file) {
  if (!file) return UploadCloud;
  return file.type.startsWith("image/") ? ImageIcon : FileText;
}

function extensionOf(filename) {
  return filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
}

function validateFile(file) {
  const extension = extensionOf(file.name);
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
    return `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ").toUpperCase()}`;
  }
  if (file.size > MAX_BYTES) {
    return `File exceeds the ${MAX_UPLOAD_SIZE_MB}MB limit`;
  }
  if (file.size === 0) {
    return "File is empty";
  }
  return null;
}

const initialForm = {
  title: "",
  department: DEPARTMENTS[0],
  description: "",
  outputLanguage: DEFAULT_AI_OUTPUT_LANGUAGE,
};

export default function UploadModal({ isOpen, onClose, onUploaded }) {
  const { showToast } = useToast();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("form"); // "form" | "success"
  const successTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(successTimeoutRef.current), []);

  const reset = () => {
    clearTimeout(successTimeoutRef.current);
    setFile(null);
    setForm(initialForm);
    setFileError("");
    setFormError("");
    setProgress(0);
    setIsUploading(false);
    setUploadStage("form");
  };

  const handleClose = () => {
    if (isUploading || uploadStage === "success") return;
    reset();
    onClose();
  };

  const pickFile = (candidate) => {
    const error = validateFile(candidate);
    if (error) {
      setFileError(error);
      setFile(null);
      return;
    }
    setFileError("");
    setFile(candidate);
    if (!form.title) {
      setForm((current) => ({ ...current, title: candidate.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!file) {
      setFileError("Choose a file to upload");
      return;
    }
    if (!form.title.trim()) {
      setFormError("Title is required");
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("department", form.department);
    formData.append("description", form.description.trim());
    formData.append("output_language", form.outputLanguage);
    formData.append("file", file);

    setIsUploading(true);
    try {
      const { data } = await uploadDocumentRequest(formData, (progressEvent) => {
        if (progressEvent.total) {
          setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      });
      showToast(`"${data.title}" uploaded successfully`, "success");
      // Brief confirmation before handing off to the Document Viewer, which
      // takes over with the real live OCR -> AI status (see DocumentsSection).
      setIsUploading(false);
      setUploadStage("success");
      successTimeoutRef.current = setTimeout(() => {
        onUploaded(data);
        reset();
        onClose();
      }, SUCCESS_STAGE_MS);
      return;
    } catch (error) {
      const message = error.response?.data?.detail || "Upload failed. Please try again.";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const Icon = fileIcon(file);

  if (uploadStage === "success") {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Upload document" size="md">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-green-50 text-success dark:bg-green-500/15">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">
            Document uploaded successfully
          </p>
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            OCR and AI analysis are starting automatically.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload document" size="md">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {!file ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary-50 dark:bg-primary/10"
                : "border-line hover:border-primary/40 dark:border-slate-700"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-ink-soft" />
            <p className="text-sm font-medium text-ink dark:text-slate-100">
              Drag & drop a file here
            </p>
            <p className="text-xs text-ink-soft">or</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Browse files
            </Button>
            <p className="mt-1 text-xs text-ink-soft">
              PDF, JPG, JPEG, PNG &middot; up to {MAX_UPLOAD_SIZE_MB}MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                if (picked) pickFile(picked);
                event.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-line p-4 dark:border-slate-700">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink dark:text-slate-100">
                {file.name}
              </p>
              <p className="text-xs text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 hover:text-danger dark:hover:bg-slate-800"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {fileError && <p className="text-sm text-danger">{fileError}</p>}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            Title
          </span>
          <input
            value={form.title}
            onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            placeholder="e.g. Land Record - Kopargaon"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            Department
          </span>
          <select
            value={form.department}
            onChange={(event) => setForm((c) => ({ ...c, department: event.target.value }))}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            AI summary language
          </span>
          <select
            value={form.outputLanguage}
            onChange={(event) => setForm((c) => ({ ...c, outputLanguage: event.target.value }))}
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {AI_OUTPUT_LANGUAGES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-soft">
            Language for the AI-generated title &amp; summary only. Text extraction (OCR)
            always reads both English and Marathi in the document regardless of this choice.
          </p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            Description <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))}
            rows={3}
            className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            placeholder="Brief notes about this document..."
          />
        </label>

        {isUploading && (
          <div className="space-y-1.5">
            <ProgressBar percent={progress} />
            <p className="text-right text-xs text-ink-soft">{progress}%</p>
          </div>
        )}

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" loading={isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
