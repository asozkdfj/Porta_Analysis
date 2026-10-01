import { usePreferenceStore } from "@renderer/stores/preferenceStore";

export function Notifications() {
  const notifications = usePreferenceStore((s) => s.notifications);
  const dismiss = usePreferenceStore((s) => s.dismiss);

  if (notifications.length === 0) return null;

  return (
    <div className="notifications" aria-live="polite">
      {notifications.map((n) => (
        <div key={n.id} className={`toast ${n.level}`} role="status">
          <div>{n.message}</div>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(n.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
