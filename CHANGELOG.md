# Changelog

## [Unreleased]

### Added

- Khởi tạo pnpm monorepo cho web, API, worker và desktop.
- Thêm các package dùng chung, tài liệu kiến trúc, roadmap và bảo mật.
- Thêm PostgreSQL và Redis cho môi trường local bằng Docker Compose.
- Thêm CI cho lint, typecheck, test và build.
- Thêm Prisma schema và migration nền tảng cho dữ liệu nghiệp vụ.
- Thêm kiểm tra health thật cho PostgreSQL và Redis.
- Thêm validation cấu hình, request ID, JSON logging và global error handler.
- Thêm BullMQ system queue với Redis database/prefix cô lập.
- Thêm systemd unit và startup script cô lập cho API/worker trên Linux.
- Thêm virtual host Nginx riêng cho frontend và API trên `thukyso.vatli365.vn`.
- Thêm Google OAuth authorization-code flow phía server với state/nonce validation.
- Thêm session cookie HttpOnly, rotation/revoke và audit log.
- Thêm mã hóa AES-256-GCM cho Google refresh token.
- Thêm migration `UserSession` và API `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/me`.
- Thêm tài liệu trạng thái dự án, runbook vận hành và danh sách lưu ý quan trọng.
- Thêm OAuth tăng dần `drive.file`, Google Picker và API quản lý kết nối Drive.
- Thêm chia sẻ Service Account, cấu trúc 9 thư mục chuẩn và audit log kết nối Drive.
- Thêm giao diện đăng nhập, chọn, đổi và ngắt thư mục Google Drive.
- Thêm Drive worker polling, Redis lock và chuỗi khóa idempotent từ Drive tới BullMQ.
- Thêm kiểm tra PDF/DOCX, giới hạn dung lượng, SHA-256 và phân luồng file lỗi.
- Thêm luồng chọn file qua Google Picker để giữ quyền Drive ở `drive.file`.
- Chuyển scanner sang OAuth `drive.file` của người dùng; token chỉ giải mã trong worker.
- Thêm Gemini Interactions API với năm lượt structured analysis độc lập cho PDF/DOCX.
- Thêm schema validation, prompt-injection guard, lưu Analysis/Finding idempotent và audit
  retry/failure/completion.
- Thêm migration `20260727062000_phase_5_gemini_analysis` và worker consumer cho
  `analyze-document`.
- Định tuyến runtime package Gemini sang JavaScript đã build trong `dist`, trong khi
  TypeScript vẫn đọc type từ `src`.
- Thêm API quản lý văn bản Phase 6 với phân trang, tìm kiếm, lọc, chi tiết analysis và phân
  quyền theo organization.
- Thêm human review giữ nguyên dữ liệu AI, lưu xác nhận/loại bỏ/chỉnh sửa riêng và khóa
  phê duyệt khi còn finding chưa xử lý.
- Thêm audit `ANALYSIS_FINDING_REVIEWED`, `DOCUMENT_REVIEW_APPROVED` và migration
  `20260728010000_phase_6_document_review`.
- Thêm dashboard responsive quản lý văn bản, trang chi tiết phân tích và giao diện review.
- Dùng icon PNG 512×512 do chủ dự án cung cấp làm favicon, Apple touch icon và nhận diện
  trên giao diện Thư Ký Số.

### Changed

- Đổi Phase 6 sang review theo ngoại lệ: chỉ finding `REQUIRES_REVIEW`, confidence dưới
  80% hoặc thiếu toàn bộ nguồn mới cần xác nhận; dữ liệu rõ được thu gọn và không chặn hoàn
  tất văn bản.
- Đổi model Gemini mặc định sang `gemini-3.5-flash` vì `gemini-2.5-flash` không còn được
  cấp cho tài khoản mới trên Interactions API.
- Hoàn tất Phase 5 trên production: PDF thật tạo một Analysis, 10 Findings, trạng thái
  `REVIEW_REQUIRED`/`COMPLETED`, audit hoàn tất và không trùng dữ liệu sau restart worker.
- Ràng buộc stack production không được ảnh hưởng backend dùng chung và `ominilab.vatli365.vn`.
- Chỉ bind PostgreSQL và Redis local qua `127.0.0.1` trong Docker Compose phát triển.
- Triển khai Google OAuth Phase 2 trên `thukyso.vatli365.vn` và xác nhận đăng nhập, session, OAuth account cùng audit log trên production.
- Triển khai Phase 3 trên production và xác nhận Picker, kết nối Drive, 9 thư mục chuẩn cùng audit log.
- Hoàn tất Phase 4 trên production: PDF thật được phát hiện và chuyển sang xử lý, job được
  xếp hàng đúng một lần, restart worker không tạo dữ liệu trùng.
