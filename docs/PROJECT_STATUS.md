# Trạng thái dự án Thư Ký Số

Cập nhật: 28/07/2026

## 1. Tổng quan

- Tên hiển thị: **Thư Ký Số**
- Tên kỹ thuật: `thukyso`
- Mô tả: Trợ lý xử lý văn bản và điều hành AI
- Website tạm: `https://thukyso.vatli365.vn`
- Repository: `https://github.com/quants82/thukyso`
- Nhánh triển khai: `main`
- Phase hiện tại: Phase 6 đã hoàn thành mã nguồn; chờ kiểm thử production

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

### Phase 3 — Google Drive

- OAuth tăng dần chỉ dùng scope `drive.file`.
- Google Picker chọn thư mục làm việc và từng PDF/DOCX.
- Đã tạo `THU_KY_SO` cùng đủ 9 thư mục chuẩn.
- Kết nối, đổi/ngắt thư mục và audit log đã hoạt động trên production.

### Phase 4 — Drive worker

- Worker production quét Drive mỗi 60 giây và quét ngay khi khởi động.
- Refresh token chỉ được giải mã AES-256-GCM trong worker.
- Redis lock, unique keys PostgreSQL và BullMQ job ID bảo đảm idempotency.
- PDF thử nghiệm đã chuyển từ `00_VAN_BAN_MOI` sang `01_DANG_XU_LY`.
- Production có đúng một Document, DocumentVersion, Job và audit `DOCUMENT_DISCOVERED`.
- Restart worker không tạo thêm bản ghi.
- Job `analyze-document` đã được pipeline Phase 5 xử lý thành công.

### Phase 5 — Gemini analysis

- Migration `20260727062000_phase_5_gemini_analysis` đã áp dụng trên production.
- Worker Phase 5 chạy với `gemini-3.5-flash`, concurrency 2.
- Gemini Interactions API thực hiện năm lượt structured analysis với `store: false`.
- PDF thật tạo đúng một `DocumentAnalysis` và 10 `AnalysisFinding`.
- Document chuyển sang `REVIEW_REQUIRED`; Job chuyển sang `COMPLETED` sau một lần chạy.
- Audit `DOCUMENT_ANALYSIS_COMPLETED` đã được tạo.
- Restart worker không tạo analysis, finding, job hoặc audit trùng.
- API key chỉ nằm trong `.env` quyền `600`, không nằm trong source control hay log.

## 4. Đang làm

Mã nguồn Phase 6 đã hoàn thành: API danh sách/chi tiết, review finding, phê duyệt văn bản,
audit log và dashboard responsive. Chưa áp dụng migration hoặc triển khai build Phase 6
lên production.

Hotfix review theo ngoại lệ đang được triển khai: chỉ yêu cầu người dùng kiểm tra nội dung
mơ hồ, confidence thấp hoặc thiếu nguồn; kết quả rõ được thu gọn và không chặn hoàn tất.

## 5. Bước tiếp theo

Triển khai Phase 6 lên production theo từng lệnh:

1. Pull commit Phase 6 và cài dependency khóa.
2. Generate Prisma, kiểm tra rồi áp dụng migration `20260728010000_phase_6_document_review`.
3. Build toàn bộ API/web và restart riêng `thukyso-api`.
4. API health, route Phase 6, frontend production và icon hệ thống đã được xác nhận.
5. Hotfix review theo ngoại lệ đang chờ triển khai production và kiểm tra bằng PDF thật.

## 6. Các phase sau

Phase 7 đã hoàn thành mã nguồn local và vượt qua lint, typecheck, test, build; đang chờ
commit, migration và kiểm chứng production bằng hai văn bản thật.

- Phase 3: hoàn thành kết nối Google Drive với `drive.file` và Google Picker.
- Phase 4: hoàn thành worker quét thư mục Drive idempotent.
- Phase 5: hoàn thành pipeline Gemini và kiểm chứng bằng PDF thật trên production.
- Phase 6: migration, API và giao diện đã lên production; hotfix review theo ngoại lệ đang
  chờ kiểm tra cuối.
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
