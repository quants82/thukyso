# Roadmap

| Phase | Phạm vi | Trạng thái |
|---|---|---|
| 0 | Monorepo, tài liệu, placeholder, Docker local, CI | Hoàn thành |
| 1 | NestJS, Prisma, health dependencies, logging, BullMQ | Chưa bắt đầu |
| 2 | Google OAuth server-side | Chưa bắt đầu |
| 3 | Kết nối thư mục Google Drive với `drive.file` | Chưa bắt đầu |
| 4 | Worker quét Drive idempotent | Chưa bắt đầu |
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
