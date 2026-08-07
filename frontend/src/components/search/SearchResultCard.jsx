// One search hit - title/snippet highlighting reuses HighlightedText (same
// component DocumentsTable uses), status reuses StatusBadge. Clicking
// anywhere on the card opens the existing DocumentViewerModal.
import { Building2, FileText, FolderOpen, Image as ImageIcon, Sparkles, User } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import StatusBadge from "../documents/StatusBadge";
import HighlightedText from "../documents/HighlightedText";
import { getSearchSnippet } from "../../utils/searchSnippet";
import { formatDateTime } from "../../utils/format";

function FileTypeIcon({ filetype }) {
  const isImage = ["jpg", "jpeg", "png"].includes(filetype);
  const Icon = isImage ? ImageIcon : FileText;
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
      <Icon className="h-5 w-5 text-primary" />
    </span>
  );
}

export default function SearchResultCard({ document: doc, query, onSelect }) {
  const snippet = getSearchSnippet(doc, query);

  return (
    <Card
      as="button"
      hoverable
      onClick={() => onSelect(doc)}
      className="w-full cursor-pointer text-left hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <FileTypeIcon filetype={doc.filetype} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-ink dark:text-slate-100">
              <HighlightedText text={doc.title} query={query} />
            </p>
            <StatusBadge status={doc.lifecycle_status} />
          </div>

          {doc.ai_title && doc.ai_title !== doc.title && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-primary">
              <Sparkles className="h-3 w-3 shrink-0" />
              <HighlightedText text={doc.ai_title} query={query} />
            </p>
          )}

          {snippet && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
              <HighlightedText text={snippet} query={query} />
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-soft">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {doc.department}
            </span>
            {doc.ai_category && (
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
                {doc.ai_category}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {doc.uploaded_by}
            </span>
            <span>{formatDateTime(new Date(doc.upload_date))}</span>
            {doc.ai_confidence != null && (
              <Badge tone={doc.ai_confidence >= 60 ? "success" : "warning"}>
                {Math.round(doc.ai_confidence)}% confidence
              </Badge>
            )}
          </div>

          {doc.ai_keywords?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {doc.ai_keywords.slice(0, 6).map((keyword) => (
                <Badge key={keyword} tone="neutral">
                  <HighlightedText text={keyword} query={query} />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
