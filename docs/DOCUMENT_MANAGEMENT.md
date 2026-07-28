# Document Management Phase 6

## Phạm vi

Phase 6 cung cấp dashboard quản lý văn bản và lớp human review cho kết quả Gemini Phase 5.
File gốc tiếp tục nằm trên Google Drive; frontend chỉ nhận metadata và dữ liệu phân tích đã
lưu trong PostgreSQL.

## API

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/v1/documents` | Danh sách, phân trang, tìm kiếm, lọc trạng thái |
| `GET` | `/api/v1/documents/:documentId` | Chi tiết văn bản và analysis mới nhất |
| `PATCH` | `/api/v1/documents/:documentId/findings/:findingId` | Review một finding |
| `POST` | `/api/v1/documents/:documentId/approve` | Phê duyệt sau khi review đầy đủ |

Danh sách hỗ trợ `page`, `pageSize`, `status`, `search`; `pageSize` tối đa 100. Tất cả API
yêu cầu cookie session và chỉ truy cập văn bản thuộc organization mà người dùng là member.

## Human review

- `CONFIRMED`: người dùng xác nhận đề xuất AI đúng.
- `DISMISSED`: người dùng loại đề xuất AI.
- `EDITED`: giữ nguyên title/detail AI và lưu title/detail đã kiểm tra ở trường riêng.
- `PENDING` chỉ do hệ thống tạo; client không được đặt lại trạng thái này.
- Văn bản `APPROVED` khóa chỉnh sửa findings qua API Phase 6.

Trước khi approve, server kiểm tra analysis mới nhất không còn finding `PENDING`. Approve
lặp lại không tạo thêm audit.

## Audit

- `ANALYSIS_FINDING_REVIEWED`: finding, trạng thái, document ID và cờ đã chỉnh sửa.
- `DOCUMENT_REVIEW_APPROVED`: document, analysis và số findings tại thời điểm phê duyệt.

Audit không chứa nội dung file, token hoặc secret.

## Giao diện

- Dashboard: tổng số, tổng cần kiểm tra, tổng đã duyệt theo organization, tìm kiếm và lọc.
- Chi tiết: metadata, tóm tắt lãnh đạo, nhiệm vụ, thời hạn, điểm chính, phụ lục/báo cáo.
- Mỗi finding hiển thị evidence, trang/mục, trích dẫn và confidence.
- Review trực tiếp bằng xác nhận, chỉnh sửa hoặc loại bỏ.
- Nút phê duyệt chỉ mở khi không còn finding chưa xử lý.
- Responsive tại breakpoint desktop, tablet và điện thoại.

## Điều kiện xác nhận production

1. Migration `20260728010000_phase_6_document_review` được áp dụng.
2. API chỉ trả văn bản thuộc organization của người dùng.
3. PDF thật hiển thị đúng một analysis và 10 findings.
4. Review đủ findings tạo đúng audit và không sửa dữ liệu AI gốc.
5. Approve chuyển Document sang `APPROVED` và tạo đúng một audit.
6. Giao diện hoạt động trên desktop và điện thoại, không tràn ngang.
