import { useCallback, useEffect, useMemo, useState } from "react";
import { chooseDriveFile, chooseDriveFolder } from "./google-picker";

type ReviewStatus = "PENDING" | "CONFIRMED" | "DISMISSED" | "EDITED";

interface User {
  displayName?: string;
  email: string;
  avatarUrl?: string;
}

interface DriveConnection {
  id: string;
  selectedFolderName?: string;
  connectedAt: string;
  folders: Array<{ type: string; name: string }>;
}

interface Evidence {
  page: number | null;
  section: string | null;
  quote: string | null;
  confidence: number;
}

interface AnalysisResult {
  document?: {
    number?: string | null;
    issuedDate?: string | null;
    issuer?: string | null;
    subject?: string | null;
    documentType?: string | null;
  };
  tasks?: Array<{
    title: string;
    description?: string | null;
    responsibleUnit?: string | null;
    assignees?: string[];
    evidence: Evidence;
  }>;
  deadlines?: Array<{
    value?: string | null;
    description: string;
    relatedTask?: string | null;
    evidence: Evidence;
  }>;
  keyPoints?: Array<{ text: string; evidence: Evidence }>;
  attachments?: Array<{ name: string; description?: string | null; evidence: Evidence }>;
  reportRequirements?: Array<{
    name: string;
    description?: string | null;
    evidence: Evidence;
  }>;
}

interface Finding {
  id: string;
  type: string;
  title: string;
  detail?: string | null;
  page?: number | null;
  section?: string | null;
  quote?: string | null;
  confidence?: number | null;
  reviewStatus: ReviewStatus;
  reviewReason?:
    | "AI_MARKED_FOR_REVIEW"
    | "LOW_CONFIDENCE"
    | "MISSING_EVIDENCE"
    | null;
  needsReview: boolean;
  reviewedTitle?: string | null;
  reviewedDetail?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: { displayName?: string | null; email: string } | null;
}

interface DocumentListItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  analysis?: {
    executiveSummary?: string | null;
    confidence?: number | null;
    findingCount: number;
    createdAt: string;
  } | null;
}

interface DocumentDetail extends Omit<DocumentListItem, "analysis"> {
  sha256?: string | null;
  analysis?: {
    id: string;
    model: string;
    schemaVersion: string;
    executiveSummary?: string | null;
    result: AnalysisResult;
    confidence?: number | null;
    createdAt: string;
    findings: Finding[];
  } | null;
}

interface DocumentListResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: {
    reviewRequired: number;
    approved: number;
  };
  items: DocumentListItem[];
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

const statusLabels: Record<string, string> = {
  NEW: "Mới",
  QUEUED: "Đang chờ",
  DOWNLOADING: "Đang tải",
  EXTRACTING: "Đang trích xuất",
  ANALYZING: "Đang phân tích",
  REVIEW_REQUIRED: "Cần kiểm tra",
  APPROVED: "Đã duyệt",
  ARCHIVED: "Đã lưu trữ",
  FAILED: "Lỗi"
};

const findingLabels: Record<string, string> = {
  RISK: "Rủi ro",
  REQUIRES_REVIEW: "Cần kiểm tra",
  LEGAL_BASIS: "Căn cứ pháp lý",
  FINANCIAL: "Tài chính",
  DEADLINE: "Thời hạn",
  RESPONSIBILITY: "Trách nhiệm",
  OTHER: "Khác"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatSize(value?: string | null) {
  if (!value) return "—";
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function confidenceLabel(value?: number | null) {
  if (value === undefined || value === null) return "Chưa xác định";
  return `${Math.round(value * 100)}%`;
}

export function App() {
  const [user, setUser] = useState<User | null>();
  const [connection, setConnection] = useState<DriveConnection | null>();
  const [documents, setDocuments] = useState<DocumentListResponse>();
  const [selected, setSelected] = useState<DocumentDetail | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadConnection = useCallback(async () => {
    setConnection(await api<DriveConnection | null>("/drive/connection"));
  }, []);

  const loadDocuments = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) query.set("status", status);
    if (search.trim()) query.set("search", search.trim());
    setDocuments(await api<DocumentListResponse>(`/documents?${query}`));
  }, [page, search, status]);

  const loadDetail = useCallback(async (documentId: string) => {
    setSelected(await api<DocumentDetail>(`/documents/${documentId}`));
  }, []);

  useEffect(() => {
    api<User>("/auth/me")
      .then(async (currentUser) => {
        setUser(currentUser);
        await Promise.all([loadConnection(), loadDocuments()]);
      })
      .catch(() => setUser(null));
  }, [loadConnection, loadDocuments]);

  useEffect(() => {
    if (user) void loadDocuments().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Không tải được văn bản");
    });
  }, [loadDocuments, user]);

  const openPicker = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const configuration = await api<{ accessToken: string; apiKey: string; appId: string }>(
        "/drive/picker-token"
      );
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
      const configuration = await api<{ accessToken: string; apiKey: string; appId: string }>(
        "/drive/picker-token"
      );
      const file = await chooseDriveFile(configuration);
      if (!file) return;
      await api("/drive/queue-files", {
        method: "POST",
        body: JSON.stringify({ fileIds: [file.id] })
      });
      setMessage("Đã đưa file vào hàng đợi xử lý.");
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đưa file vào xử lý");
    } finally {
      setBusy(false);
    }
  }

  async function reviewFinding(
    findingId: string,
    input: { status: ReviewStatus; title?: string; detail?: string; note?: string }
  ) {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/documents/${selected.id}/findings/${findingId}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      });
      await loadDetail(selected.id);
      setMessage("Đã lưu kết quả kiểm tra.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu kết quả kiểm tra");
    } finally {
      setBusy(false);
    }
  }

  async function approveDocument() {
    if (!selected || !window.confirm("Xác nhận đã kiểm tra toàn bộ kết quả AI?")) return;
    setBusy(true);
    try {
      await api(`/documents/${selected.id}/approve`, { method: "POST" });
      await Promise.all([loadDetail(selected.id), loadDocuments()]);
      setMessage("Văn bản đã được phê duyệt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể phê duyệt văn bản");
    } finally {
      setBusy(false);
    }
  }

  if (user === undefined) {
    return <main className="auth-shell"><div className="loading-card">Đang kiểm tra phiên đăng nhập…</div></main>;
  }

  if (user === null) {
    return (
      <main className="auth-shell">
        <section className="login-card">
          <img className="login-logo" src="/icon.png" alt="Biểu tượng Thư Ký Số" />
          <span className="eyebrow">THUKYSO.COM</span>
          <h1>Thư Ký Số</h1>
          <p>Trợ lý xử lý văn bản và điều hành AI.</p>
          <div className="notice">
            <p>Đăng nhập để quản lý và kiểm tra văn bản.</p>
            <a className="button" href="/api/v1/auth/google">Đăng nhập bằng Google</a>
          </div>
          <small>Thư Ký Số không phải dịch vụ chữ ký điện tử.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src="/icon.png" alt="" />
          <div><strong>Thư Ký Số</strong><small>Điều hành văn bản bằng AI</small></div>
        </div>
        <div className="user-chip">
          {user.avatarUrl && <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />}
          <span>{user.displayName ?? user.email}</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <button className={!selected ? "nav-item active" : "nav-item"} onClick={() => setSelected(null)}>
            Tổng quan văn bản
          </button>
          <div className="drive-summary">
            <span className={`connection-dot ${connection ? "online" : ""}`} />
            <strong>{connection ? "Drive đã kết nối" : "Chưa kết nối Drive"}</strong>
            <small>{connection?.selectedFolderName ?? "Chọn thư mục làm việc"}</small>
            <div className="sidebar-actions">
              {connection ? (
                <>
                  <button disabled={busy} onClick={() => void queueFile()}>Thêm PDF/DOCX</button>
                  <button className="text-button" disabled={busy} onClick={() => void openPicker()}>Đổi thư mục</button>
                  <button className="text-button danger" disabled={busy} onClick={() => void disconnect()}>Ngắt kết nối</button>
                </>
              ) : (
                <button disabled={busy} onClick={() => void authorizeDrive()}>Kết nối Drive</button>
              )}
            </div>
          </div>
        </aside>

        <section className="content">
          {message && <div className="toast" role="status">{message}</div>}
          {selected ? (
            <DocumentDetailView
              document={selected}
              busy={busy}
              onBack={() => {
                setSelected(null);
                void loadDocuments();
              }}
              onReview={reviewFinding}
              onApprove={approveDocument}
            />
          ) : (
            <DocumentDashboard
              data={documents}
              search={search}
              status={status}
              page={page}
              onSearch={(value) => {
                setPage(1);
                setSearch(value);
              }}
              onStatus={(value) => {
                setPage(1);
                setStatus(value);
              }}
              onPage={setPage}
              onSelect={(id) => void loadDetail(id)}
              onUpload={() => void queueFile()}
              busy={busy}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function DocumentDashboard(props: {
  data?: DocumentListResponse;
  search: string;
  status: string;
  page: number;
  busy: boolean;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onPage: (page: number) => void;
  onSelect: (id: string) => void;
  onUpload: () => void;
}) {
  const reviewCount = props.data?.summary.reviewRequired ?? 0;
  const approvedCount = props.data?.summary.approved ?? 0;
  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">PHASE 6</span><h2>Quản lý văn bản</h2><p>Theo dõi, kiểm tra và phê duyệt kết quả phân tích AI.</p></div>
        <button disabled={props.busy} onClick={props.onUpload}>+ Thêm văn bản</button>
      </div>
      <div className="metrics">
        <Metric label="Tổng văn bản" value={props.data?.total ?? 0} />
        <Metric label="Cần kiểm tra" value={reviewCount} tone="amber" />
        <Metric label="Đã duyệt" value={approvedCount} tone="green" />
      </div>
      <div className="document-panel">
        <div className="filters">
          <input
            aria-label="Tìm văn bản"
            placeholder="Tìm theo tên văn bản…"
            value={props.search}
            onChange={(event) => props.onSearch(event.target.value)}
          />
          <select
            aria-label="Lọc trạng thái"
            value={props.status}
            onChange={(event) => props.onStatus(event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="REVIEW_REQUIRED">Cần kiểm tra</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="ANALYZING">Đang phân tích</option>
            <option value="FAILED">Lỗi</option>
          </select>
        </div>
        {!props.data ? (
          <div className="empty-state">Đang tải danh sách văn bản…</div>
        ) : props.data.items.length === 0 ? (
          <div className="empty-state"><strong>Chưa có văn bản phù hợp</strong><span>Chọn PDF/DOCX để bắt đầu xử lý.</span></div>
        ) : (
          <div className="document-list">
            {props.data.items.map((document) => (
              <button className="document-row" key={document.id} onClick={() => props.onSelect(document.id)}>
                <span className="file-icon">{document.mimeType.includes("pdf") ? "PDF" : "DOC"}</span>
                <span className="document-main">
                  <strong>{document.name}</strong>
                  <small>{formatSize(document.sizeBytes)} · cập nhật {formatDate(document.updatedAt)}</small>
                  {document.analysis?.executiveSummary && <span>{document.analysis.executiveSummary}</span>}
                </span>
                <span className={`status-pill status-${document.status.toLowerCase()}`}>
                  {statusLabels[document.status] ?? document.status}
                </span>
                <span className="finding-count">
                  {document.analysis?.findingCount
                    ? `${document.analysis.findingCount} cần xem`
                    : "Không có ngoại lệ"}
                </span>
                <span className="chevron">›</span>
              </button>
            ))}
          </div>
        )}
        {props.data && props.data.totalPages > 1 && (
          <div className="pagination">
            <button className="secondary" disabled={props.page <= 1} onClick={() => props.onPage(props.page - 1)}>Trước</button>
            <span>Trang {props.page}/{props.data.totalPages}</span>
            <button className="secondary" disabled={props.page >= props.data.totalPages} onClick={() => props.onPage(props.page + 1)}>Sau</button>
          </div>
        )}
      </div>
    </>
  );
}

function Metric({ label, value, tone = "blue" }: { label: string; value: number; tone?: string }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function DocumentDetailView(props: {
  document: DocumentDetail;
  busy: boolean;
  onBack: () => void;
  onReview: (
    findingId: string,
    input: { status: ReviewStatus; title?: string; detail?: string; note?: string }
  ) => Promise<void>;
  onApprove: () => Promise<void>;
}) {
  const analysis = props.document.analysis;
  const exceptionFindings =
    analysis?.findings.filter((finding) => finding.reviewReason !== null) ?? [];
  const reliableFindings =
    analysis?.findings.filter((finding) => finding.reviewReason === null) ?? [];
  const pendingCount =
    exceptionFindings.filter((finding) => finding.needsReview).length;
  const result = analysis?.result;
  return (
    <>
      <button className="back-button" onClick={props.onBack}>← Danh sách văn bản</button>
      <div className="detail-heading">
        <div>
          <div className="detail-title-row">
            <span className="file-icon">{props.document.mimeType.includes("pdf") ? "PDF" : "DOC"}</span>
            <div><h2>{props.document.name}</h2><small>{formatSize(props.document.sizeBytes)} · {formatDate(props.document.updatedAt)}</small></div>
          </div>
        </div>
        <span className={`status-pill status-${props.document.status.toLowerCase()}`}>{statusLabels[props.document.status] ?? props.document.status}</span>
      </div>
      {!analysis ? (
        <div className="empty-state">Văn bản chưa có kết quả phân tích.</div>
      ) : (
        <>
          <div className="analysis-meta">
            <span>Model <strong>{analysis.model}</strong></span>
            <span>Độ tin cậy <strong>{confidenceLabel(analysis.confidence)}</strong></span>
            <span>Phân tích lúc <strong>{formatDate(analysis.createdAt)}</strong></span>
          </div>
          <section className="summary-card">
            <span className="section-kicker">TÓM TẮT LÃNH ĐẠO</span>
            <p>{analysis.executiveSummary || "Không có tóm tắt."}</p>
          </section>
          <MetadataGrid result={result} />
          <StructuredSections result={result} />
          <ExtractedDetails result={result} findings={reliableFindings} />
          <section className="review-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CHỈ HIỆN NGOẠI LỆ</span>
                <h3>{exceptionFindings.length} điểm cần chú ý</h3>
              </div>
              {pendingCount > 0 && (
                <span className="pending-count">{pendingCount} cần bạn kiểm tra</span>
              )}
            </div>
            {exceptionFindings.length ? (
              <div className="findings">
                {exceptionFindings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    busy={props.busy}
                    onReview={props.onReview}
                  />
                ))}
              </div>
            ) : (
              <div className="review-clear">
                AI không phát hiện đoạn nào mơ hồ hoặc thiếu nguồn cần bạn xác nhận.
              </div>
            )}
            <div className="approval-bar">
              <div>
                <strong>Hoàn tất xem văn bản</strong>
                <span>
                  {pendingCount > 0
                    ? "Chỉ cần xử lý các ngoại lệ ở trên."
                    : "Không còn ngoại lệ chưa xử lý; không cần xác nhận từng nội dung AI đã đọc rõ."}
                </span>
              </div>
              <button disabled={props.busy || pendingCount > 0 || props.document.status === "APPROVED"} onClick={() => void props.onApprove()}>
                {props.document.status === "APPROVED" ? "Đã hoàn tất" : "Đã xem và hoàn tất"}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function MetadataGrid({ result }: { result?: AnalysisResult }) {
  const metadata = result?.document;
  if (!metadata) return null;
  const items = [
    ["Số/ký hiệu", metadata.number],
    ["Ngày ban hành", metadata.issuedDate],
    ["Cơ quan ban hành", metadata.issuer],
    ["Loại văn bản", metadata.documentType],
    ["Trích yếu", metadata.subject]
  ];
  return (
    <section className="metadata-grid">
      {items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "Chưa xác định"}</strong></div>)}
    </section>
  );
}

function StructuredSections({ result }: { result?: AnalysisResult }) {
  const sections = useMemo(() => [
    {
      title: "Nhiệm vụ",
      items: result?.tasks?.map((task) => ({
        title: task.title,
        text: [task.description, task.responsibleUnit && `Đơn vị: ${task.responsibleUnit}`].filter(Boolean).join(" · "),
        evidence: task.evidence
      })) ?? []
    },
    {
      title: "Thời hạn",
      items: result?.deadlines?.map((deadline) => ({
        title: deadline.value || "Chưa xác định ngày",
        text: deadline.description,
        evidence: deadline.evidence
      })) ?? []
    },
  ], [result]);
  if (!sections.some((section) => section.items.length)) return null;
  return (
    <section className="structured-grid">
      {sections.map((section) => (
        <div className="structured-card" key={section.title}>
          <h3>{section.title}</h3>
          {section.items.length ? section.items.map((item, index) => (
            <div className="structured-item" key={`${section.title}-${index}`}>
              <strong>{item.title}</strong>
              {item.text && <p>{item.text}</p>}
              <EvidenceLine evidence={item.evidence} />
            </div>
          )) : <small>Không phát hiện.</small>}
        </div>
      ))}
    </section>
  );
}

function ExtractedDetails({
  result,
  findings
}: {
  result?: AnalysisResult;
  findings: Finding[];
}) {
  const keyPoints = result?.keyPoints ?? [];
  const attachments = result?.attachments ?? [];
  const reportRequirements = result?.reportRequirements ?? [];
  const count =
    keyPoints.length +
    attachments.length +
    reportRequirements.length +
    findings.length;
  if (count === 0) return null;
  return (
    <details className="extracted-details">
      <summary>AI đã trích xuất thêm {count} nội dung rõ ràng — mở khi cần đối chiếu</summary>
      <div className="extracted-content">
        {keyPoints.length > 0 && (
          <div>
            <h4>Điểm chính</h4>
            {keyPoints.map((point, index) => (
              <p key={`key-${index}`}>
                <strong>{point.text}</strong>
                <EvidenceLine evidence={point.evidence} />
              </p>
            ))}
          </div>
        )}
        {(attachments.length > 0 || reportRequirements.length > 0) && (
          <div>
            <h4>Phụ lục và yêu cầu báo cáo</h4>
            {[...attachments, ...reportRequirements].map((item, index) => (
              <p key={`attachment-${index}`}>
                <strong>{item.name}</strong>
                {item.description && <span>{item.description}</span>}
                <EvidenceLine evidence={item.evidence} />
              </p>
            ))}
          </div>
        )}
        {findings.length > 0 && (
          <div>
            <h4>Các dữ kiện có nguồn rõ</h4>
            {findings.map((finding) => (
              <p key={finding.id}>
                <strong>{finding.title}</strong>
                <EvidenceLine
                  evidence={{
                    page: finding.page ?? null,
                    section: finding.section ?? null,
                    quote: finding.quote ?? null,
                    confidence: finding.confidence ?? 0
                  }}
                />
              </p>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function EvidenceLine({ evidence }: { evidence: Evidence }) {
  return <small className="evidence">{[evidence.page && `Trang ${evidence.page}`, evidence.section].filter(Boolean).join(" · ") || "Không xác định vị trí nguồn"}</small>;
}

function FindingCard(props: {
  finding: Finding;
  busy: boolean;
  onReview: (
    findingId: string,
    input: { status: ReviewStatus; title?: string; detail?: string; note?: string }
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(props.finding.reviewedTitle ?? props.finding.title);
  const [detail, setDetail] = useState(props.finding.reviewedDetail ?? props.finding.detail ?? "");
  const [note, setNote] = useState(props.finding.reviewNote ?? "");
  const displayTitle = props.finding.reviewStatus === "EDITED" ? props.finding.reviewedTitle : props.finding.title;
  const displayDetail = props.finding.reviewStatus === "EDITED" ? props.finding.reviewedDetail : props.finding.detail;
  return (
    <article className={`finding-card review-${props.finding.reviewStatus.toLowerCase()}`}>
      <div className="finding-topline">
        <span className={`finding-type type-${props.finding.type.toLowerCase()}`}>{findingLabels[props.finding.type] ?? props.finding.type}</span>
        <span className="review-badge">
          {props.finding.reviewStatus === "PENDING"
            ? reviewReasonLabel(props.finding.reviewReason)
            : reviewLabel(props.finding.reviewStatus)}
        </span>
      </div>
      {editing ? (
        <div className="edit-form">
          <label>Tiêu đề<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} /></label>
          <label>Nội dung<textarea value={detail} onChange={(event) => setDetail(event.target.value)} rows={4} maxLength={5000} /></label>
          <label>Ghi chú kiểm tra<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={2000} /></label>
          <div className="finding-actions">
            <button disabled={props.busy || !title.trim()} onClick={() => void props.onReview(props.finding.id, { status: "EDITED", title, detail, note }).then(() => setEditing(false))}>Lưu chỉnh sửa</button>
            <button className="secondary" onClick={() => setEditing(false)}>Hủy</button>
          </div>
        </div>
      ) : (
        <>
          <h4>{displayTitle}</h4>
          {displayDetail && <p>{displayDetail}</p>}
          <div className="source-box">
            <span>{[props.finding.page && `Trang ${props.finding.page}`, props.finding.section].filter(Boolean).join(" · ") || "Vị trí chưa xác định"}</span>
            {props.finding.quote && <q>{props.finding.quote}</q>}
            <small>Độ tin cậy AI: {confidenceLabel(props.finding.confidence)}</small>
          </div>
          {props.finding.reviewNote && <p className="review-note">Ghi chú: {props.finding.reviewNote}</p>}
          {props.finding.reviewStatus === "PENDING" ? (
            <div className="finding-actions">
              <button disabled={props.busy} onClick={() => void props.onReview(props.finding.id, { status: "CONFIRMED" })}>Xác nhận</button>
              <button className="secondary" disabled={props.busy} onClick={() => setEditing(true)}>Chỉnh sửa</button>
              <button className="danger-button" disabled={props.busy} onClick={() => void props.onReview(props.finding.id, { status: "DISMISSED" })}>Loại bỏ</button>
            </div>
          ) : (
            <button className="text-button" disabled={props.busy} onClick={() => setEditing(true)}>Chỉnh lại đánh giá</button>
          )}
        </>
      )}
    </article>
  );
}

function reviewLabel(status: ReviewStatus) {
  return {
    PENDING: "Chưa kiểm tra",
    CONFIRMED: "Đã xác nhận",
    DISMISSED: "Đã loại bỏ",
    EDITED: "Đã chỉnh sửa"
  }[status];
}

function reviewReasonLabel(reason: Finding["reviewReason"]) {
  return {
    AI_MARKED_FOR_REVIEW: "AI báo cần kiểm tra",
    LOW_CONFIDENCE: "Độ tin cậy thấp",
    MISSING_EVIDENCE: "Thiếu nguồn đối chiếu"
  }[reason ?? "AI_MARKED_FOR_REVIEW"];
}
