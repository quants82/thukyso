# Triển khai

Phase 0 chỉ cung cấp PostgreSQL, Redis và khung Caddy. Image cho web, API và worker cùng quy trình backup/restore được bổ sung ở phase triển khai production.

## Ràng buộc máy chủ hiện tại

Server đang phục vụ nhiều website và hai nhóm backend độc lập. Việc triển khai Thư Ký Số phải tuân thủ:

1. Kiểm kê container, service, reverse proxy và toàn bộ cổng đang lắng nghe trước khi chọn cổng.
2. Dùng thư mục triển khai riêng, dự kiến `/var/www/thukyso.vatli365.vn`.
3. Dùng project name Docker Compose riêng và network/volume có tiền tố `thukyso`.
4. Không bind PostgreSQL hoặc Redis của Thư Ký Số ra interface công khai.
5. Không chỉnh sửa file cấu hình của các ứng dụng hiện hữu.
6. Sao lưu cấu hình reverse proxy trước khi thêm virtual host mới.
7. Chạy kiểm tra cấu hình proxy trước khi reload; không restart toàn bộ server.
8. Kiểm tra lại các website hiện hữu sau mỗi thay đổi production.

Cổng production chưa được ấn định trong source. Giá trị chỉ được cấu hình bằng biến môi trường sau khi kiểm kê server để tránh xung đột.

## Cấu hình tạm cho vatli365.vn

- Frontend: `https://thukyso.vatli365.vn`.
- API nội bộ: `127.0.0.1:3020`, reverse proxy theo đường dẫn `/api`.
- PostgreSQL: database và role `thukyso` riêng trên `127.0.0.1:5432`.
- Redis: database `1` và prefix `thukyso`; không dùng key không có prefix.
- Secret production nằm trong `.env` quyền `600`, owner `thukyso`, tuyệt đối không commit.

Trước khi chạy API sau một lần cập nhật:

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:deploy
pnpm check
```

Hai service production dùng template versioned tại `infrastructure/systemd`. Cả hai chạy bằng user `thukyso`, đọc `.env` quyền `600`, khởi động qua Node trong NVM riêng và không dùng Node hệ thống.
