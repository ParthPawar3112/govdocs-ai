// Phase 8 - Admin Settings. Most values are read-only display of the
// existing .env-driven config (see backend/app/services/settings_service.py
// for why: this project's config.py already says "change this one value,
// no code changes needed" for OCR engine/model/upload limits - a DB
// override layer would fight that, not extend it). AI confidence threshold
// is the one value that's genuinely persisted and live-editable.
import { useEffect, useState } from "react";
import { CheckCircle2, Info, Save, Server, Sparkles, Upload } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { getSettingsRequest, updateSettingsRequest } from "../../api/settings";
import { useToast } from "../../hooks/useToast";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 last:border-0 dark:border-slate-800">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="text-sm font-medium text-ink dark:text-slate-100">{value}</span>
    </div>
  );
}

export default function SettingsSection() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getSettingsRequest()
      .then(({ data }) => {
        setSettings(data);
        setThreshold(data.ai_confidence_threshold);
      })
      .catch((error) => {
        if (error.response?.status === 403) setIsForbidden(true);
        else showToast("Could not load settings.", "error");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data } = await updateSettingsRequest({ ai_confidence_threshold: Number(threshold) });
      setSettings(data);
      showToast("Settings updated", "success");
    } catch (error) {
      showToast(error.response?.data?.detail || "Could not save settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isForbidden) {
    return (
      <Card>
        <p className="text-sm text-ink-soft">Settings are available to Admin accounts only.</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          Application settings
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">System configuration and preferences</p>
      </div>

      {isLoading || !settings ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-primary" />
              AI confidence threshold
            </h3>
            <p className="mb-4 text-xs text-ink-soft">
              Documents scoring below this confidence are flagged for closer review across the app.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="flex-1 accent-primary"
              />
              <span className="w-14 text-right text-lg font-bold tabular-nums text-ink dark:text-slate-100">
                {threshold}%
              </span>
            </div>
            <div className="mt-4 flex justify-end">
              <Button icon={Save} size="sm" onClick={handleSave} loading={isSaving}>
                Save
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
              <Server className="h-4 w-4 text-primary" />
              Processing engines
            </h3>
            <InfoRow label="OCR engine" value={settings.ocr_engine} />
            <InfoRow label="Gemini model" value={settings.gemini_model} />
            <InfoRow
              label="Gemini API key"
              value={
                <Badge tone={settings.gemini_configured ? "success" : "warning"}>
                  {settings.gemini_configured ? "Configured" : "Not configured"}
                </Badge>
              }
            />
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Set via the backend .env file - change the value there and restart the server.
            </p>
          </Card>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
              <Upload className="h-4 w-4 text-primary" />
              Upload limits
            </h3>
            <InfoRow label="Maximum file size" value={`${settings.max_upload_size_mb} MB`} />
            <InfoRow label="Allowed file types" value={settings.allowed_file_types.map((t) => t.toUpperCase()).join(", ")} />
          </Card>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Application
            </h3>
            <InfoRow label="Name" value={settings.app_name} />
            <InfoRow label="Environment" value={settings.environment} />
          </Card>
        </div>
      )}
    </div>
  );
}
