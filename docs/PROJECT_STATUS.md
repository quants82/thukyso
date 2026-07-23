# Trạng thái dự án Thư Ký Số

Cập nhật: 23/07/2026

## 1. Tổng quan

- Tên hiển thị: **Thư Ký Số**
- Tên kỹ thuật: `thukyso`
- Mô tả: Trợ lý xử lý văn bản và điều hành AI
- Website tạm: `https://thukyso.vatli365.vn`
- Repository: `https://github.com/quants82/thukyso`
- Nhánh triển khai: `main`
- Commit Phase 2 hiện tại: `fa513ca`

Sản phẩm không phải dịch vụ chữ ký điện tử.

## 2. Kiến trúc đã chốt

```text
React PWA
    |
Nginx HTTPS
    |
NestJS API :3020 (localhost)
    |
    +-- PostgreSQL
    +-- Redis / BullMQ
    +-- Worker systemd
    +-- Google OAuth
    +-- Google Drive (Phase 3)
    +-- Gemini (Phase 5)
```

Stack:

- Frontend: React, Vite, TypeScript
- API: NestJS, TypeScript
- Database: PostgreSQL, Prisma
- Queue: Redis, BullMQ
- Desktop tương lai: Tauri
- Reverse proxy: Nginx trên server hiện tại
- Package manager: pnpm workspace
- Kiểm thử: Vitest, integration test; Playwright bổ sung ở phase giao diện

## 3. Đã hoàn thành

### Phase 0 — Khởi tạo

- Tạo pnpm monorepo.
- Tạo `apps/web`, `apps/api`, `apps/worker`, `apps/desktop`.
- Tạo các package `shared`, `ui`, `drive`, `gemini`, `auth`, `config`.
- Tạo tài liệu, Docker Compose local và GitHub Actions.
- Khởi tạo Git và đẩy lên GitHub.

### Phase 1 — Backend nền tảng

- Prisma schema và migration đầu tiên.
- 21 bảng nghiệp vụ; cùng bảng migration là 22 bảng trên production.
- Health check thật cho PostgreSQL và Redis.
- Request ID, JSON request log và global exception filter.
- BullMQ queue với Redis database/prefix riêng.
- API và worker chạy bằng systemd.
- Frontend/API đã chạy qua Nginx và HTTPS.
- Chứng chỉ Let's Encrypt tự gia hạn đã dry-run thành công.

Production Phase 1 hiện đang hoạt động:

- Frontend: `https://thukyso.vatli365.vn`
- Health: `https://thukyso.vatli365.vn/api/v1/health`
- API chỉ bind `127.0.0.1:3020`.
- Hai service `thukyso-api` và `thukyso-worker` đang enabled.

### Phase 2 — Google OAuth trong mã nguồn

Đã triển khai và push commit `fa513ca`:

- Authorization-code flow phía server.
- Scope đăng nhập chỉ gồm `openid email profile`.
- State ký HMAC và nonce chống replay.
- Xác minh Google ID token.
- Mã hóa refresh token bằng AES-256-GCM.
- Cookie session HttpOnly/Secure/SameSite=Lax.
- Database chỉ lưu SHA-256 hash của session token.
- Session rotation, revoke và audit log.
- Migration thêm bảng `UserSession`.
- Các endpoint `/auth/google`, `/auth/google/callback`, `/auth/refresh`, `/auth/logout`, `/auth/me`.
- Lint, typecheck, build, Prisma validation và 17 test đã vượt qua.

## 4. Đang làm

Phase 2 chưa hoàn tất trên production.

Trạng thái chính xác:

1. Mã Phase 2 đã ở GitHub.
2. Server vẫn đang chạy bản Phase 1 ổn định.
3. Chưa pull commit Phase 2 xuống server.
4. Chưa áp dụng migration `UserSession` trên production.
5. Chưa tạo Google Cloud project/OAuth Client.
6. Chưa thêm `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` thật vào `.env`.
7. Chưa restart API bằng mã Phase 2.
8. Chưa kiểm thử đăng nhập Google thật.

Lý do dừng đúng thời điểm này: API Phase 2 yêu cầu Google credentials khi khởi động. Không được cập nhật/restart server trước khi credentials sẵn sàng, để tránh downtime.

## 5. Bước tiếp theo

Thực hiện từng bước, không gộp:

1. Tạo Google Cloud project phát triển, đề xuất tên `Thư Ký Số Dev`.
2. Cấu hình OAuth consent screen.
3. Tạo OAuth Client loại **Web application**.
4. Thêm origin:

   ```text
   https://thukyso.vatli365.vn
   ```

5. Thêm redirect URI:

   ```text
   https://thukyso.vatli365.vn/api/v1/auth/google/callback
   ```

6. Lưu Client ID/Client Secret vào `.env` trên server, không gửi qua chat và không commit.
7. Pull `main` trên server.
8. Chạy `pnpm install --frozen-lockfile`.
9. Chạy `pnpm prisma:generate`.
10. Kiểm tra `prisma migrate status`.
11. Chạy `pnpm prisma:deploy`.
12. Chạy `pnpm check`.
13. Build và restart riêng `thukyso-api`; worker chỉ restart nếu dependency thay đổi yêu cầu.
14. Kiểm tra health.
15. Kiểm thử OAuth thật.
16. Kiểm tra audit log, session cookie và database không chứa token dạng rõ.

Sau khi Phase 2 production hoàn tất mới bắt đầu Phase 3.

## 6. Các phase sau

- Phase 3: kết nối Google Drive với `drive.file`, Google Picker và Service Account.
- Phase 4: worker quét thư mục Drive idempotent.
- Phase 5: Gemini phân tích PDF/DOCX.
- Phase 6: giao diện quản lý văn bản.
- Phase 7: so sánh văn bản.
- Phase 8: sinh Google Docs/Sheets và biểu mẫu.
- Phase 9: giao việc.
- Phase 10: email và thông báo.
- Phase 11: hoàn thiện PWA.
- Phase 12: Windows Tauri.
- Phase 13: hardening, E2E và kiểm thử bảo mật.
- Phase 14: chuyển sang domain `thukyso.com`.

## 7. Mốc MVP

MVP thành công khi người dùng:

```text
Đăng nhập Google
  -> chọn thư mục Drive
  -> tải PDF vào 00_VAN_BAN_MOI
  -> worker phát hiện
  -> Gemini phân tích
  -> báo cáo xuất hiện trên PWA và Drive
```
