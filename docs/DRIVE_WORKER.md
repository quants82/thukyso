# Drive Worker Phase 4

## Phạm vi

Worker quét `00_VAN_BAN_MOI` mỗi 60 giây bằng OAuth người dùng. Refresh token được giải mã
chỉ trong tiến trình worker. Để giữ duy nhất scope `drive.file`, người dùng chọn PDF/DOCX
cụ thể qua Google Picker; backend đánh dấu file bằng `appProperties` và đưa vào inbox. File
chỉ được kéo/thả thủ công ngoài ứng dụng không thuộc phạm vi `drive.file`.

```text
Google Picker chọn PDF/DOCX
  -> backend đưa file vào 00_VAN_BAN_MOI
  -> Redis lock theo DriveConnection
  -> list file bằng Service Account + drive.file
  -> kiểm tra PDF/DOCX và giới hạn dung lượng
  -> SHA-256 trong bộ nhớ
  -> transaction Document + DocumentVersion + Job + AuditLog
  -> BullMQ analyze-document với jobId xác định
  -> chuyển file sang 01_DANG_XU_LY
```

File không đúng MIME hoặc quá dung lượng được ghi trạng thái `FAILED`, audit
`DOCUMENT_REJECTED` và chuyển sang `99_LOI_XU_LY`.

## Idempotency

- Redis `SET NX PX` khóa một lần quét theo từng DriveConnection.
- `Document` unique theo `(driveConnectionId, driveFileId)`.
- `DocumentVersion` unique theo `(documentId, sha256)`.
- `Job.jobKey` unique theo connection, Drive file ID và SHA-256.
- BullMQ `jobId` là SHA-256 của `jobKey`.
- Kết nối lại hoặc restart worker không tạo Document/Job trùng.

Worker không ghi file tạm xuống đĩa. Nội dung được giới hạn dung lượng, đọc vào bộ nhớ để
tính SHA-256 rồi giải phóng sau lượt quét.

## Cấu hình

```env
TOKEN_ENCRYPTION_KEY=64-hex-characters
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
WORKER_SCAN_INTERVAL_MS=60000
MAX_DOCUMENT_SIZE_MB=25
```

Google refresh token luôn được mã hóa AES-256-GCM trong PostgreSQL, không xuất hiện trong
job payload hoặc log. Worker chỉ thấy các file cụ thể đã được dùng với ứng dụng.

## Vận hành

- Service: `thukyso-worker.service`.
- Queue: `documents`.
- Job name Phase 5 sẽ xử lý: `analyze-document`.
- Khi Phase 5 chưa triển khai, job chờ trong BullMQ và database ở trạng thái `PENDING`.
- Dừng worker chờ lượt quét hiện tại hoàn tất rồi đóng Queue, Redis và Prisma.
