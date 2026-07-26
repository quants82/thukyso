import { useCallback, useEffect, useState } from "react";
import { chooseDriveFile, chooseDriveFolder } from "./google-picker";

interface User {
  displayName?: string;
  email: string;
}

interface DriveConnection {
  id: string;
  selectedFolderName?: string;
  connectedAt: string;
  folders: Array<{ type: string; name: string }>;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `API lỗi ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function App() {
  const [user, setUser] = useState<User | null>();
  const [connection, setConnection] = useState<DriveConnection | null>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadConnection = useCallback(async () => {
    setConnection(await api<DriveConnection | null>("/drive/connection"));
  }, []);

  useEffect(() => {
    api<User>("/auth/me")
      .then(async (currentUser) => {
        setUser(currentUser);
        await loadConnection().catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : "Không tải được trạng thái Drive");
        });
      })
      .catch(() => setUser(null));
  }, [loadConnection]);

  const openPicker = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const configuration = await api<{
        accessToken: string;
        apiKey: string;
        appId: string;
      }>("/drive/picker-token");
      const folder = await chooseDriveFolder(configuration);
      if (!folder) return;
      await api("/drive/connect-folder", {
        method: "POST",
        body: JSON.stringify({ folderId: folder.id, scanExistingFiles: false })
      });
      await loadConnection();
      setMessage("Đã kết nối và tạo cấu trúc THU_KY_SO.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối Drive");
    } finally {
      setBusy(false);
    }
  }, [loadConnection]);

  useEffect(() => {
    if (user && new URLSearchParams(window.location.search).get("drive") === "authorized") {
      window.history.replaceState({}, "", window.location.pathname);
      void openPicker();
    }
  }, [openPicker, user]);

  async function authorizeDrive() {
    setBusy(true);
    try {
      const result = await api<{ authorizationUrl: string }>("/drive/authorize", {
        method: "POST"
      });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cấp quyền Drive");
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Ngắt kết nối và gỡ quyền worker khỏi thư mục Drive?")) return;
    setBusy(true);
    try {
      await api("/drive/connection", { method: "DELETE" });
      setConnection(null);
      setMessage("Đã ngắt kết nối Drive.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể ngắt kết nối");
    } finally {
      setBusy(false);
    }
  }

  async function queueFile() {
    setBusy(true);
    setMessage("");
    try {
      const configuration = await api<{
        accessToken: string;
        apiKey: string;
        appId: string;
      }>("/drive/picker-token");
      const file = await chooseDriveFile(configuration);
      if (!file) return;
      await api("/drive/queue-files", {
        method: "POST",
        body: JSON.stringify({ fileIds: [file.id] })
      });
      setMessage("Đã đưa file vào hàng đợi xử lý.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đưa file vào xử lý");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="card">
        <span className="eyebrow">THUKYSO.COM</span>
        <h1>Thư Ký Số</h1>
        <p>Trợ lý xử lý văn bản và điều hành AI.</p>
        {user === undefined && <div className="notice">Đang kiểm tra phiên đăng nhập…</div>}
        {user === null && (
          <div className="notice">
            <p>Đăng nhập để kết nối thư mục làm việc Google Drive.</p>
            <a className="button" href="/api/v1/auth/google">Đăng nhập bằng Google</a>
          </div>
        )}
        {user && (
          <div className="drive-panel">
            <p>Xin chào, <strong>{user.displayName ?? user.email}</strong>.</p>
            {connection ? (
              <>
                <p>Drive đang kết nối: <strong>{connection.selectedFolderName ?? "Thư mục Google Drive"}</strong></p>
                <p>{connection.folders.length} thư mục chuẩn đã sẵn sàng.</p>
                <div className="actions">
                  <button disabled={busy} onClick={() => void queueFile()}>Chọn PDF/DOCX</button>
                  <button disabled={busy} onClick={() => void openPicker()}>Đổi thư mục</button>
                  <button className="secondary" disabled={busy} onClick={() => void disconnect()}>Ngắt kết nối</button>
                </div>
              </>
            ) : (
              <button disabled={busy} onClick={() => void authorizeDrive()}>
                Kết nối Google Drive
              </button>
            )}
            {message && <p className="status">{message}</p>}
          </div>
        )}
        <small>Thư Ký Số không phải dịch vụ chữ ký điện tử.</small>
      </section>
    </main>
  );
}
