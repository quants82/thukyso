# Trạng thái dự án Thư Ký Số

Cập nhật: 27/07/2026

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

### Phase 2 — Google OAuth

Đã triển khai mã nguồn ở commit `fa513ca` và đưa lên production:

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
- Google Cloud project: `thu-ky-so-dev`.
- OAuth Client loại Web application dùng origin và callback HTTPS của `thukyso.vatli365.vn`.
- Migration `20260723141000_phase_2_auth_sessions` đã áp dụng thành công trên production.
- API Phase 2 đang chạy bằng `thukyso-api.service`.
- Đăng nhập Google thật, `/auth/me`, OAuth account, active session và audit log đã được xác nhận.
- Client secret chỉ nằm trong file quyền `600` trên server, không lưu trong repository.

## 4. Đang làm

Phase 2 và Phase 3 đã hoàn tất trên production. Chưa bắt đầu Phase 4.

Frontend hiện vẫn là trang giới thiệu nền tảng; giao diện trạng thái đăng nhập sẽ được bổ sung trong phase giao diện. Việc trang chủ còn hiển thị nội dung Phase 0 không ảnh hưởng API OAuth đã hoạt động.

## 5. Bước tiếp theo

Kết quả production Phase 3:

1. Drive API, Picker API và duy nhất scope `drive.file` đã cấu hình.
2. Service Account không có IAM role cấp project; khóa JSON nằm ngoài repository với quyền `600`.
3. Migration Phase 3 đã áp dụng; API và frontend production đã build.
4. Google Picker thật đã chọn `THU_KY_SO_WORKSPACE`.
5. `THU_KY_SO` và đủ 9 thư mục chuẩn đã được tạo.
6. Database có một kết nối active, 9 DriveFolder và audit `DRIVE_CONNECTED`.

Bước tiếp theo là thiết kế và triển khai riêng Phase 4: worker polling idempotent. Không đưa
Gemini hoặc phân tích tài liệu vào Phase 4.

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
