# Roadmap

| Phase | Phạm vi | Trạng thái |
|---|---|---|
| 0 | Monorepo, tài liệu, placeholder, Docker local, CI | Hoàn thành |
| 1 | NestJS, Prisma, health dependencies, logging, BullMQ | Hoàn thành |
| 2 | Google OAuth server-side | Hoàn thành |
| 3 | Kết nối thư mục Google Drive với `drive.file` | Hoàn thành |
| 4 | Worker quét Drive idempotent | Hoàn thành |
| 5 | Pipeline phân tích Gemini | Chưa bắt đầu |
| 6 | Giao diện quản lý văn bản | Chưa bắt đầu |
| 7 | So sánh văn bản | Chưa bắt đầu |
| 8 | Sinh báo cáo và biểu mẫu | Chưa bắt đầu |
| 9 | Giao việc | Chưa bắt đầu |
| 10 | Email và thông báo | Chưa bắt đầu |
| 11 | Hoàn thiện PWA | Chưa bắt đầu |
| 12 | Đóng gói Windows Tauri | Chưa bắt đầu |
| 13 | Bảo mật và kiểm thử toàn diện | Chưa bắt đầu |
| 14 | Triển khai thukyso.com | Chưa bắt đầu |

## Điều kiện hoàn thành Phase 0

- `pnpm install` hoàn tất.
- `pnpm check` vượt qua.
- `pnpm dev` khởi động web, API và worker mà không cần Google/Gemini.
- Compose định nghĩa PostgreSQL và Redis có health check.
- Không triển khai OAuth, Drive hoặc Gemini.

## Kết quả Phase 1

- Prisma schema và migration đầu tiên cho các bảng nghiệp vụ nền tảng.
- Validation `DATABASE_URL`, `REDIS_URL`, `REDIS_PREFIX`, `API_PORT` và `NODE_ENV`.
- `GET /api/v1/health` kiểm tra PostgreSQL/Redis thật và trả `ok` hoặc HTTP 503.
- Request ID, JSON access log và global exception filter.
- BullMQ system queue với Redis database/prefix cô lập.
- Unit test cho config/health và integration test cho health endpoint.

Phase 1 không triển khai OAuth, Drive polling hoặc Gemini.

## Kết quả Phase 2

- Authorization-code flow phía server với scope `openid email profile`.
- OAuth `state` ký HMAC, thời hạn 10 phút; OpenID Connect `nonce` được đối chiếu với ID token.
- ID token được Google client library xác minh chữ ký, issuer, audience và expiry; ứng dụng kiểm tra email verified.
- Refresh token Google (nếu được cấp) mã hóa AES-256-GCM trước khi lưu.
- Session ứng dụng dùng token ngẫu nhiên trong cookie HttpOnly; database chỉ lưu SHA-256 hash.
- Session có expiry, rotation, revoke và audit log cho login/refresh/logout.
- API: `/auth/google`, `/auth/google/callback`, `/auth/refresh`, `/auth/logout`, `/auth/me`.

Phase 2 không xin scope Drive và không gửi Google token xuống frontend.

## Kết quả mã nguồn Phase 3

- OAuth tăng dần `drive.file` với state ký và gắn với phiên người dùng.
- Google Picker chọn folder; API key bị giới hạn theo Picker API và website production.
- Xác minh folder/capabilities, chia sẻ writer cho Service Account và tạo cấu trúc idempotent.
- Lưu `DriveConnection`, `DriveFolder`; đổi/ngắt kết nối và audit log.
- Giao diện đăng nhập, kết nối, đổi và ngắt Drive.

Migration, cấu hình production, Google Picker thật, 9 thư mục chuẩn, database và audit log
đã được kiểm thử thành công. Worker polling vẫn thuộc Phase 4.

## Kết quả mã nguồn Phase 4

- Polling Drive mỗi 60 giây bằng OAuth `drive.file`; token mã hóa chỉ được giải mã trong worker.
- Google Picker cấp quyền theo từng PDF/DOCX trước khi backend đưa file vào inbox.
- Redis lock, unique keys database và BullMQ job ID xác định bảo đảm idempotency.
- Chỉ nhận PDF/DOCX, giới hạn dung lượng và tính SHA-256 trong bộ nhớ.
- Transaction tạo Document, DocumentVersion, Job và audit log.
- Di chuyển file hợp lệ sang xử lý, file bị từ chối sang thư mục lỗi.
- Graceful shutdown đóng Queue, Redis và Prisma.

Production đã phát hiện một PDF thật, chuyển file từ `00_VAN_BAN_MOI` sang
`01_DANG_XU_LY`, tạo đúng một Document/DocumentVersion/Job/audit log và không tạo bản ghi
trùng sau khi restart worker. Job `analyze-document` đang chờ Phase 5; Gemini chưa được gọi.
