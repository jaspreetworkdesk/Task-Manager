import AppIcon from "@/components/AppIcon";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  warning?: boolean;
  tone?: "brand" | "success" | "warning" | "danger";
  icon?: "projects" | "tasks" | "users" | "building" | "check" | "clock" | "alert";
};

export default function StatCard({
  title,
  value,
  description,
  warning = false,
  tone = "brand",
  icon = "tasks",
}: StatCardProps) {
  const resolvedTone = warning ? "danger" : tone;
  return (
    <div className="stat-card-modern">
      <div className="stat-card-top">
        <div className={`stat-card-icon ${resolvedTone === "brand" ? "" : resolvedTone}`}>
          <AppIcon name={icon} />
        </div>
        <span className="stat-card-title">{title}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      {description && <div className="stat-card-desc">{description}</div>}
    </div>
  );
}
