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

### Changed

- Ràng buộc stack production không được ảnh hưởng backend dùng chung và `ominilab.vatli365.vn`.
- Chỉ bind PostgreSQL và Redis local qua `127.0.0.1` trong Docker Compose phát triển.
- Triển khai Google OAuth Phase 2 trên `thukyso.vatli365.vn` và xác nhận đăng nhập, session, OAuth account cùng audit log trên production.
- Triển khai Phase 3 trên production và xác nhận Picker, kết nối Drive, 9 thư mục chuẩn cùng audit log.
