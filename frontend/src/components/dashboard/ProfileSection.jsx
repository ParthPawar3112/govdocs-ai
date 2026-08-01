import { Calendar, Hash, KeyRound, ShieldCheck } from "lucide-react";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { formatDateTime } from "../../utils/format";

export default function ProfileSection({ user, onLogout }) {
  const fields = [
    { icon: Hash, label: "User ID", value: `#${user.id}` },
    { icon: ShieldCheck, label: "Role", value: user.role },
    { icon: Calendar, label: "Account created", value: formatDateTime(new Date(user.created_at)) },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Profile</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          Your account
        </h1>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar username={user.username} size="lg" />
          <div>
            <p className="text-lg font-bold text-ink dark:text-slate-100">{user.username}</p>
            <Badge tone="primary" className="mt-1">
              {user.role}
            </Badge>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-line pt-5 dark:border-slate-800">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink-soft">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <span className="font-medium text-ink dark:text-slate-100">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 dark:border-slate-800 sm:flex-row">
          <Button variant="secondary" icon={KeyRound} disabled title="Password changes aren't available yet">
            Change password
          </Button>
          <Button variant="danger" onClick={onLogout} className="sm:ml-auto">
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}
