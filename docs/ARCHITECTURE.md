# Kiến trúc Thư Ký Số

## Phạm vi sản phẩm

Thư Ký Số là trợ lý xử lý văn bản và điều hành AI, không phải dịch vụ chữ ký điện tử.

## Kiến trúc mục tiêu

```text
React PWA / Tauri Desktop
          |
       NestJS API
          |
  +-------+-------+
PostgreSQL      Redis/BullMQ
                  |
                Worker
          +-------+-------+
      Google Drive       Gemini
```

## Monorepo

- `apps/web`: React, Vite, TypeScript, PWA.
- `apps/api`: NestJS API dưới `/api/v1`.
- `apps/worker`: BullMQ worker và lịch quét Drive.
- `apps/desktop`: Tauri dùng lại frontend web.
- `packages/shared`: DTO, type và enum dùng chung.
- `packages/ui`: component giao diện dùng chung.
- `packages/drive`: tích hợp Google Drive.
- `packages/gemini`: client, prompt và schema AI.
- `packages/auth`: helper xác thực.
- `packages/config`: validation cấu hình.
- `prisma`: schema và migrations.

## Ranh giới dữ liệu và bảo mật

- PostgreSQL lưu dữ liệu nghiệp vụ; file gốc nằm trên Google Drive.
- Chỉ yêu cầu `openid email profile` khi đăng nhập và `drive.file` khi kết nối Drive.
- Refresh token được mã hóa AES-256-GCM; không chuyển Google token cho frontend.
- Service Account đọc/quét/di chuyển file; OAuth token người dùng tạo Docs/Sheets.
- Worker phải idempotent dựa trên Drive file ID, checksum và khóa job.
- Không cache toàn bộ PDF nội bộ trên điện thoại.

## Cô lập với hệ thống vatli365.vn hiện hữu

- Máy chủ Linux đang có backend dùng chung tại `/var/www/backend` cho các subdomain như ebook, eng và các dịch vụ liên quan.
- `ominilab.vatli365.vn` đã có frontend và backend độc lập.
- Thư Ký Số phải được triển khai thành stack độc lập, không đặt mã nguồn vào các thư mục ứng dụng hiện hữu và không dùng chung tiến trình.
- Không sửa, khởi động lại hoặc thay thế cấu hình của backend dùng chung hay `ominilab.vatli365.vn`.
- Cổng host của Thư Ký Số chỉ được chốt sau khi kiểm kê cổng đang lắng nghe trên server.
- PostgreSQL và Redis của Thư Ký Số dùng network nội bộ riêng, không công khai cổng ra Internet trong production.
- Reverse proxy chỉ thêm virtual host mới cho `thukyso.vatli365.vn` và API tương ứng; phải kiểm tra cấu hình trước khi reload.

## Nền tảng backend Phase 1

- NestJS API kiểm tra cấu hình bắt buộc ngay khi khởi động.
- Prisma quản lý schema PostgreSQL và migration; schema nghiệp vụ nền tảng dùng UUID và quan hệ theo organization.
- API health kiểm tra kết nối PostgreSQL và Redis thật, trả HTTP 503 khi một dependency ngừng hoạt động.
- Mọi response có header `x-request-id`; access log và lỗi máy chủ dùng JSON một dòng để có thể đưa vào hệ thống log tập trung.
- BullMQ dùng `REDIS_PREFIX` và Redis database riêng theo `REDIS_URL`; job nghiệp vụ được bổ sung từ Phase 4.
- API và worker đóng kết nối sạch khi nhận SIGINT/SIGTERM.

## Xác thực Phase 2

```text
Browser
  -> GET /api/v1/auth/google
  -> Google OAuth (openid email profile)
  -> GET /api/v1/auth/google/callback
  -> verify state + nonce + ID token
  -> upsert User/OauthAccount
  -> HttpOnly application session cookie
```

- Google access token và ID token chỉ tồn tại trong callback phía server, không lưu và không gửi xuống frontend.
- Google refresh token được mã hóa AES-256-GCM theo từng bản ghi với IV và authentication tag riêng.
- Session token dạng rõ chỉ nằm trong cookie HttpOnly; PostgreSQL chỉ lưu SHA-256 hash.
- Cookie production là `Secure`, `SameSite=Lax`, host-only và có expiry.
- Session rotation thu hồi session cũ trong cùng transaction với session mới và audit log.
