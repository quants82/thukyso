# Gemini Analysis Phase 5

## Phạm vi

Worker tiêu thụ BullMQ job `documents/analyze-document` do Phase 4 tạo. File gốc vẫn thuộc
Google Drive và chỉ được tải vào bộ nhớ bằng OAuth người dùng với scope `drive.file`.

## Pipeline

1. Claim database Job và chuyển Document sang `DOWNLOADING`.
2. Tải file, giới hạn dung lượng và đối chiếu SHA-256 với bản đã đăng ký.
3. PDF được gửi dưới dạng document inline; DOCX được Mammoth trích raw text trong bộ nhớ.
4. Chuyển trạng thái `ANALYZING`.
5. Gọi Gemini Interactions API tuần tự năm lượt:
   - metadata;
   - nhiệm vụ và thời hạn;
   - tóm tắt lãnh đạo;
   - điểm quan trọng cần kiểm tra;
   - phụ lục và yêu cầu báo cáo.
6. Kiểm tra từng JSON bằng schema và hợp nhất thành `phase5.v1`.
7. Transaction lưu `DocumentAnalysis`, `AnalysisFinding`, hoàn tất Job, chuyển Document sang
   `REVIEW_REQUIRED` và ghi audit `DOCUMENT_ANALYSIS_COMPLETED`.

## Nguyên tắc dữ liệu

- Không dùng một prompt duy nhất cho mọi nhiệm vụ.
- Không tự điền dữ liệu thiếu; trường thiếu là `null`, danh sách thiếu là `[]`.
- Trang, mục và trích dẫn bắt buộc tồn tại trong cấu trúc evidence; nếu không xác định được
  thì giá trị là `null`, không tạo nguồn giả.
- Không bật tools, Google Search hoặc URL Context.
- `store: false` cho mọi Interaction.
- Không đưa API key, refresh token hoặc nội dung tài liệu vào log/job payload.

## Idempotency và retry

- BullMQ job ID vẫn là SHA-256 của Phase 4 `jobKey`.
- Database upsert kết quả theo document, checksum nguồn, schema version và model.
- Job đã `COMPLETED` không gọi Gemini lần nữa.
- Lỗi tạm thời đưa Job về `PENDING` để BullMQ retry; lượt cuối chuyển Job/Document sang
  `FAILED`.
- Audit:
  - `DOCUMENT_ANALYSIS_RETRY`;
  - `DOCUMENT_ANALYSIS_FAILED`;
  - `DOCUMENT_ANALYSIS_COMPLETED`.

## Cấu hình

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
WORKER_CONCURRENCY=2
MAX_EXTRACTED_TEXT_CHARS=500000
```

`gemini-3.5-flash` là model GA mặc định. `gemini-2.5-flash` trả 404 cho tài khoản mới trên
Interactions API tại thời điểm triển khai production. Việc đổi model phải thực hiện qua
biến môi trường và tạo một khóa kết quả idempotent mới theo tên model.

## Điều kiện xác nhận production

1. Migration `20260727062000_phase_5_gemini_analysis` áp dụng thành công.
2. Worker khởi động với Phase 5 và không lộ secret trong log.
3. PDF thật tạo đúng một `DocumentAnalysis` và các `AnalysisFinding` có nguồn.
4. Document chuyển `REVIEW_REQUIRED`; Job chuyển `COMPLETED`.
5. Restart worker không gọi Gemini hoặc tạo analysis/audit hoàn tất trùng.

## Xác nhận production ngày 27/07/2026

- Worker khởi động ở Phase 5 với model `gemini-3.5-flash`.
- PDF thật hoàn tất sau một attempt.
- Database: một `DocumentAnalysis`, 10 `AnalysisFinding`.
- Trạng thái: Document `REVIEW_REQUIRED`, Job `COMPLETED`.
- Audit: một `DOCUMENT_ANALYSIS_COMPLETED`.
- Restart worker giữ nguyên toàn bộ số lượng trên.
