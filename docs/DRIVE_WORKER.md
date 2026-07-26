# Drive Worker Phase 4

## Phạm vi

Worker quét `00_VAN_BAN_MOI` mỗi 60 giây bằng Service Account. Để giữ duy nhất scope
`drive.file`, người dùng chọn PDF/DOCX cụ thể qua Google Picker; backend đánh dấu file bằng
`appProperties` và đưa vào inbox. File chỉ được kéo/thả thủ công ngoài ứng dụng không thuộc
phạm vi `drive.file` và không được worker nhìn thấy.

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
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/absolute/path/to/google_service_account.json
WORKER_SCAN_INTERVAL_MS=60000
MAX_DOCUMENT_SIZE_MB=25
```

Service Account JSON nằm ngoài repository với quyền `600`. Service Account chỉ nhìn thấy
thư mục và các file cụ thể đã được dùng với ứng dụng.

## Vận hành

- Service: `thukyso-worker.service`.
- Queue: `documents`.
- Job name Phase 5 sẽ xử lý: `analyze-document`.
- Khi Phase 5 chưa triển khai, job chờ trong BullMQ và database ở trạng thái `PENDING`.
- Dừng worker chờ lượt quét hiện tại hoàn tất rồi đóng Queue, Redis và Prisma.
