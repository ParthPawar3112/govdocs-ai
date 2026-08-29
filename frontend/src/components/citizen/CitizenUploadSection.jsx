// Citizen upload landing. The upload itself reuses the existing UploadModal
// unchanged (it posts to /api/documents/upload, which every authenticated
// role may call) - this screen only adds the "why" and the honest process
// explanation around it.
import { useState } from "react";
import { ArrowRight, ScanLine, Sparkles, Upload, UserCheck } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import UploadModal from "../documents/UploadModal";
import CitizenDocumentModal from "./CitizenDocumentModal";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_SIZE_MB,
} from "../../config/departments";

const STEPS = [
  { icon: Upload, label: "Upload", note: "You submit a scan or PDF" },
  { icon: ScanLine, label: "OCR", note: "Text is extracted automatically" },
  { icon: Sparkles, label: "AI analysis", note: "A summary and metadata are generated" },
  { icon: UserCheck, label: "Officer review", note: "A government officer verifies it" },
];

export default function CitizenUploadSection() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Upload Document</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          Submit a document for processing
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Upload your document for digital processing and officer review, then track its progress
          online.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Accepted formats: {ALLOWED_UPLOAD_EXTENSIONS.join(", ").toUpperCase()} &middot; up to{" "}
          {MAX_UPLOAD_SIZE_MB} MB
        </p>
      </div>

      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-ink dark:text-slate-100">What happens after you upload</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, label, note }, index) => (
            <div
              key={label}
              className="relative rounded-xl border border-line p-3 dark:border-slate-800"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-50 text-primary dark:bg-primary/15">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {index + 1}. {label}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{note}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
          <ArrowRight className="h-3.5 w-3.5" />
          The officer can approve it, reject it, or send it back for correction. You&apos;ll see the
          decision and any remarks on your dashboard.
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          Submitting a document here does not by itself constitute government approval - it enters a
          review workflow.
        </p>
      </Card>

      <div className="flex justify-center">
        <Button icon={Upload} size="lg" onClick={() => setIsUploadOpen(true)}>
          Upload Document
        </Button>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={(doc) => setUploadedDoc(doc)}
      />

      <CitizenDocumentModal
        isOpen={Boolean(uploadedDoc)}
        onClose={() => setUploadedDoc(null)}
        document={uploadedDoc}
      />
    </div>
  );
}
