"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppIcon from "@/components/AppIcon";
import {
  getNotifications,
  readAllNotifications,
  readNotification,
} from "@/services/workService";

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshInbox = async () => {
    try {
      const response = await getNotifications();
      setItems(response.data.notifications?.data ?? []);
      setUnread(response.data.unread_count ?? 0);
      setError("");
    } catch {
      setError("Could not load your inbox. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchInbox() {
      try {
        const response = await getNotifications();

        if (cancelled) return;

        setItems(response.data.notifications?.data ?? []);
        setUnread(response.data.unread_count ?? 0);
        setError("");
      } catch {
        if (!cancelled) {
          setError("Could not load your inbox. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInbox();

    return () => {
      cancelled = true;
    };
  }, []);

  const openNotification = async (notification: any) => {
    try {
      if (!notification.read_at) {
        await readNotification(notification.id);
      }

      if (notification.url) {
        router.push(notification.url);
        return;
      }

      await refreshInbox();
    } catch {
      setError("Could not open this notification.");
    }
  };

  const markAllRead = async () => {
    try {
      await readAllNotifications();
      await refreshInbox();
    } catch {
      setError("Could not mark notifications as read.");
    }
  };

  return (
    <div className="work-page narrow-page">
      <div className="work-page-head">
        <div>
          <span className="eyebrow">Attention center</span>
          <h1>Inbox</h1>
          <p>Assignments, comments and changes that need your awareness.</p>
        </div>

        {unread > 0 && (
          <button className="secondary-action" onClick={markAllRead}>
            <AppIcon name="check" />
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="work-loading">Loading inbox…</div>
      ) : (
        <div className="inbox-list">
          {items.map((notification) => (
            <button
              key={notification.id}
              onClick={() => void openNotification(notification)}
              className={notification.read_at ? "inbox-item" : "inbox-item unread"}
            >
              <span className={`notification-icon ${notification.type}`}>
                <AppIcon
                  name={
                    notification.type === "comment"
                      ? "comment"
                      : notification.type === "assignment"
                        ? "tasks"
                        : "inbox"
                  }
                />
              </span>

              <div>
                <strong>{notification.title}</strong>
                {notification.body && <p>{notification.body}</p>}
                <time>{new Date(notification.created_at).toLocaleString()}</time>
              </div>

              {!notification.read_at && <i className="unread-dot" />}
              <AppIcon name="chevron" />
            </button>
          ))}

          {!items.length && (
            <div className="empty-state">
              <AppIcon name="inbox" />
              <h3>You’re all caught up</h3>
              <p>New assignments and conversations will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
