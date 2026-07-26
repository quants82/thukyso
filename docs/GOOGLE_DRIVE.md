# Google Drive Phase 3

## Phạm vi

Phase 3 kết nối một thư mục do người dùng chọn qua Google Picker. Ứng dụng chỉ xin:

```text
https://www.googleapis.com/auth/drive.file
```

Không dùng `drive`, `drive.readonly`, `drive.metadata` hoặc quyền toàn bộ Drive.

## Luồng kết nối

```text
Phiên đăng nhập
  -> POST /api/v1/drive/authorize
  -> Google OAuth tăng dần quyền drive.file
  -> GET /api/v1/drive/oauth/callback
  -> GET /api/v1/drive/picker-token
  -> người dùng chọn thư mục bằng Google Picker
  -> POST /api/v1/drive/connect-folder
  -> kiểm tra folder/capabilities
  -> chia sẻ folder cho Service Account với role writer
  -> tạo THU_KY_SO và 9 thư mục chuẩn
  -> lưu DriveConnection và audit log
```

Refresh token Drive được mã hóa AES-256-GCM. Access token Picker có thời hạn ngắn, chỉ trả
cho frontend đã đăng nhập; API key Picker bị giới hạn theo API và HTTP referrer.

## Cấu trúc được tạo

```text
THU_KY_SO/
├── 00_VAN_BAN_MOI
├── 01_DANG_XU_LY
├── 02_CHO_KIEM_TRA
├── 03_DA_GIAO_VIEC
├── 04_BAO_CAO_DU_THAO
├── 05_BAO_CAO_HOAN_CHINH
├── 06_BIEU_MAU
├── 07_KHO_VAN_BAN
└── 99_LOI_XU_LY
```

Các thao tác tạo thư mục dùng `ensureFolder`, nên kết nối lại không tạo trùng cấu trúc.
Ngắt kết nối gỡ quyền Service Account và không xóa hay di chuyển file của người dùng.

## Cấu hình production

- Drive callback: `https://thukyso.vatli365.vn/api/v1/drive/oauth/callback`
- Service Account không có IAM role cấp project.
- Khóa JSON nằm ngoài repository, quyền file `600`.
- Không gửi API key, OAuth client secret, refresh token hoặc khóa Service Account qua chat.

Phase 3 không triển khai worker quét file; nội dung đó thuộc Phase 4.
