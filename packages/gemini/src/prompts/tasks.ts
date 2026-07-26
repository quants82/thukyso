import { passPrompt } from "./common.js";

export const TASKS_PROMPT = passPrompt(
  "nhiệm vụ và thời hạn",
  "Trích xuất từng nhiệm vụ được giao, đơn vị/người thực hiện được nêu rõ và mọi thời hạn liên quan."
);
