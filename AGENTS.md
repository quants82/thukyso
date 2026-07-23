# Hướng dẫn phát triển Thư Ký Số

## Trước khi sửa mã

1. Đọc `docs/ARCHITECTURE.md` và phase đang làm trong `docs/ROADMAP.md`.
2. Chỉ triển khai một phase tại một thời điểm.
3. Kiểm tra thay đổi đang có và không ghi đè công việc không liên quan.

## Quy tắc bắt buộc

- Không đưa secret, token, khóa riêng hoặc dữ liệu người dùng vào source control.
- Cập nhật `.env.example` khi thêm biến môi trường.
- Không dùng Google Drive scope toàn phần; chỉ dùng `drive.file`.
- Google token không được gửi xuống frontend. Refresh token phải được mã hóa AES-256-GCM khi lưu.
- Mọi job nền phải idempotent và có khóa chống xử lý trùng.
- Mọi thao tác quan trọng phải tạo audit log.
- Không dùng mock trong production code.
- AI không được tự suy diễn hoặc tự điền số liệu còn thiếu.
- File gốc thuộc Google Drive; file tạm phải được xóa sau khi xử lý.
- API công khai nằm dưới `/api/v1`.
- Triển khai production phải cô lập khỏi `/var/www/backend` và stack `ominilab.vatli365.vn`; không chọn cổng trước khi kiểm kê server.
- Không sửa hoặc restart dịch vụ hiện hữu khi triển khai Thư Ký Số.

## Chất lượng

Trước khi hoàn tất một phase, chạy:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Mỗi phase phải cập nhật `docs/ROADMAP.md`, `CHANGELOG.md` và tài liệu liên quan.
