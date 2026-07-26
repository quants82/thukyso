import { passPrompt } from "./common.js";

export const METADATA_PROMPT = passPrompt(
  "nhận dạng metadata",
  "Trích xuất số/ký hiệu, ngày ban hành, cơ quan ban hành, trích yếu và loại văn bản."
);
