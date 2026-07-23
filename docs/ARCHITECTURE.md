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

## Quyết định Phase 0

Các ứng dụng là placeholder có thể lint, typecheck, test, build và chạy độc lập. PostgreSQL/Redis được cung cấp qua Compose nhưng chưa được API sử dụng; kết nối thật thuộc Phase 1.
