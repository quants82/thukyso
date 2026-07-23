# Google OAuth

## Luồng đăng nhập Phase 2

Ứng dụng dùng OAuth 2.0 authorization-code flow phía server và chỉ xin:

```text
openid
email
profile
```

Endpoint:

- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Drive scope `https://www.googleapis.com/auth/drive.file` chỉ được xin tăng dần trong Phase 3. Full Drive scope bị cấm.

## Google Cloud production

OAuth client type: **Web application**.

Authorized JavaScript origin:

```text
https://thukyso.vatli365.vn
```

Authorized redirect URI:

```text
https://thukyso.vatli365.vn/api/v1/auth/google/callback
```

Local development:

```text
Origin: http://localhost:5173
Redirect: http://localhost:3000/api/v1/auth/google/callback
```

Giá trị redirect phải khớp tuyệt đối với `GOOGLE_CALLBACK_URL`.

## Bảo mật

- State ngẫu nhiên được ký HMAC và hết hạn sau 10 phút.
- Nonce trong request phải khớp nonce trong ID token.
- ID token được xác minh bằng Google client library với đúng audience.
- Chỉ chấp nhận email đã được Google xác minh.
- Refresh token mã hóa AES-256-GCM; access token và ID token không lưu.
- Không ghi token, authorization code hoặc cookie vào log.
- Session cookie là HttpOnly, Secure ở production và SameSite=Lax.
- PostgreSQL chỉ lưu hash session token; refresh xoay vòng và thu hồi token cũ.

Tài liệu tham chiếu chính thức:

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/openid-connect/openid-connect
