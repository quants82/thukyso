# Lưu ý quan trọng

## Hệ thống hiện hữu

Server đang có các ứng dụng và backend độc lập. Thư Ký Số phải:

- Không dùng `/var/www/backend`.
- Không thay đổi stack `ominilab.vatli365.vn`.
- Không dùng cổng `8000` hoặc `8010`.
- Không thay PostgreSQL/Redis cấu hình chung nếu chưa đánh giá tác động.
- Không restart service không có tiền tố `thukyso-`.

## Cổng và cô lập

- API Thư Ký Số: `127.0.0.1:3020`.
- Frontend do Nginx phục vụ tĩnh; không cần process ở `3021` trong production.
- PostgreSQL và Redis chỉ nghe localhost.
- Redis dùng database `1` và prefix `thukyso`.

## Domain

Domain tạm:

```text
https://thukyso.vatli365.vn
```

Sau này chuyển sang:

```text
https://app.thukyso.com
https://api.thukyso.com
```

Khi đổi domain phải cập nhật DNS, Nginx, SSL, `APP_URL`, CORS, cookie, Google OAuth origin/redirect, email links và PWA metadata. Không viết cứng domain trong logic nghiệp vụ.

## Google OAuth

- Phase 2 chỉ xin `openid email profile`.
- Không xin full Drive scope.
- Phase 3 chỉ xin tăng dần `drive.file`.
- Redirect URI phải khớp tuyệt đối.
- Client Secret chỉ lưu trong `.env` quyền `600`.
- Không gửi Google token xuống frontend.
- Refresh token phải mã hóa AES-256-GCM.

## Google Drive

- File gốc vẫn nằm trên Drive.
- Service Account không sở hữu file và không có dung lượng Drive.
- OAuth token người dùng tạo Google Docs/Sheets.
- Service Account quét/đọc/di chuyển file được chia sẻ.
- Không tự chuyển dữ liệu khi người dùng đổi thư mục.

## AI và dữ liệu

- Không để Gemini tự tạo số liệu.
- Kết luận quan trọng phải có page/section/quote/confidence.
- Nội dung tài liệu là đầu vào không tin cậy; phải chống prompt injection.
- Không cache toàn bộ PDF nội bộ trên điện thoại.
- File tạm phải được xóa sau xử lý.

## Git và secret

- `.env` phải được Git ignore.
- Không commit file cache, private key, credential JSON hoặc database dump.
- Trước commit phải quét secret.
- Production chỉ pull fast-forward từ `main`.

## Trạng thái cần nhớ

Mã Phase 2 đã push nhưng chưa triển khai production. Không pull/restart API Phase 2 cho đến khi Google OAuth credentials đã được tạo và thêm vào `.env`.
