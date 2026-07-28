# So sánh văn bản Phase 7

Phase 7 cho phép chọn **văn bản cũ** và **văn bản mới** đã được Phase 5 phân tích trong
cùng organization. API chỉ tạo yêu cầu BullMQ; Gemini API key tiếp tục chỉ tồn tại trong
worker.

Kết quả tập trung vào thay đổi có ý nghĩa: nội dung cũ, nội dung mới, tác động thực tế và
việc cần làm. Mỗi kết luận phải có nguồn ở hai phía. Thiếu căn cứ phải trả `UNCLEAR`,
`needsReview=true`; AI không được tự điền nội dung.

So sánh idempotent theo hai document, hai checksum, schema `phase7.v1` và cấu hình worker.
Kết quả hoàn tất tạo audit `DOCUMENT_COMPARISON_COMPLETED`.

API:

- `POST /api/v1/comparisons`
- `GET /api/v1/comparisons/:comparisonId`
