# Roadmap

| Phase | Phạm vi | Trạng thái |
|---|---|---|
| 0 | Monorepo, tài liệu, placeholder, Docker local, CI | Hoàn thành |
| 1 | NestJS, Prisma, health dependencies, logging, BullMQ | Hoàn thành |
| 2 | Google OAuth server-side | Hoàn thành |
| 3 | Kết nối thư mục Google Drive với `drive.file` | Hoàn thành |
| 4 | Worker quét Drive idempotent | Hoàn thành |
| 5 | Pipeline phân tích Gemini | Hoàn thành |
| 6 | Giao diện quản lý văn bản | Mã nguồn hoàn thành; chờ production |
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
trùng sau khi restart worker. Job này đã được Phase 5 xử lý thành công.

## Kết quả mã nguồn Phase 5

- Worker tiêu thụ job `analyze-document`, tải lại file qua OAuth `drive.file` và xác minh
  SHA-256 trước khi phân tích.
- PDF được gửi trực tiếp từ bộ nhớ; DOCX được trích raw text trong bộ nhớ. Không lưu file gốc
  xuống đĩa.
- Dùng Gemini Interactions API và structured output với năm lượt tuần tự: metadata,
  nhiệm vụ/thời hạn, tóm tắt lãnh đạo, điểm cần kiểm tra, phụ lục/yêu cầu báo cáo.
- JSON được kiểm tra bằng schema; dữ liệu thiếu trả `null`/mảng rỗng, không tự suy diễn.
- Kết luận quan trọng chứa trang, mục, trích dẫn nguồn và confidence.
- Kết quả được upsert idempotent theo document, checksum, schema version và model.
- Job retry theo BullMQ, cập nhật trạng thái Document/Job và tạo audit log cho retry, lỗi,
  hoàn tất.

Migration production đã được áp dụng. Gemini `gemini-3.5-flash` đã xử lý PDF thật thành
công, tạo một DocumentAnalysis, 10 AnalysisFinding, chuyển Document sang `REVIEW_REQUIRED`,
Job sang `COMPLETED` và tạo audit `DOCUMENT_ANALYSIS_COMPLETED`. Restart worker không gọi
Gemini hoặc tạo dữ liệu/audit trùng. Đây là nền dữ liệu đã dùng để phát triển Phase 6.

## Kết quả mã nguồn Phase 6

- API danh sách văn bản có phân trang, tìm theo tên và lọc trạng thái.
- API chi tiết trả metadata, tóm tắt, nhiệm vụ, thời hạn, nguồn dẫn và findings của analysis
  mới nhất.
- Review finding giữ nguyên dữ liệu AI, lưu riêng quyết định xác nhận, loại bỏ hoặc nội dung
  đã chỉnh sửa.
- Chỉ cho phép phê duyệt khi tất cả findings đã được review; thao tác là idempotent.
- Phân quyền mọi API theo organization membership và khóa review sau khi phê duyệt.
- Dashboard responsive cho desktop/mobile, có trạng thái tải, rỗng, lỗi và Drive controls.
- Audit `ANALYSIS_FINDING_REVIEWED` và `DOCUMENT_REVIEW_APPROVED`.

Chỉ đánh dấu hoàn thành sau khi migration production được áp dụng, danh sách/chi tiết hiển
thị PDF thật, review đủ findings, phê duyệt thành công và audit log được xác nhận.
