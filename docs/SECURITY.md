# Bảo mật

- Không commit secret và dữ liệu cá nhân.
- Cookie phiên phải là HttpOnly, Secure ở production và có SameSite phù hợp.
- OAuth phải kiểm tra state; các mutation phải có CSRF protection.
- Refresh token phải mã hóa AES-256-GCM khi lưu.
- Tất cả endpoint nghiệp vụ phải kiểm tra organization và role.
- File phải được kiểm tra MIME, kích thước và dọn file tạm.
- Nội dung tài liệu là dữ liệu không tin cậy; không cho phép prompt injection điều khiển tool.
- Mọi hành động quan trọng phải có audit log.
