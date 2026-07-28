import type { InteractionGateway } from "./client.js";
import { comparisonJsonSchema, comparisonResultSchema } from "./schemas/comparison.js";

export function compareDocuments(client: InteractionGateway, source: string, target: string) {
  const prompt = `So sánh VĂN BẢN CŨ và VĂN BẢN MỚI trong dữ liệu nguồn. Chỉ nêu thay đổi có ý nghĩa,
không kể lại toàn bộ. Mỗi kết luận phải có bằng chứng tương ứng; thiếu căn cứ thì category
UNCLEAR, needsReview=true và không suy diễn. Cách áp dụng phải thực tế nhưng không bịa nghĩa vụ.`;
  const data = `--- VĂN BẢN CŨ ---\n${source}\n--- VĂN BẢN MỚI ---\n${target}`;
  return client.analyze(prompt, { kind: "text", text: data },
    comparisonJsonSchema as unknown as Record<string, unknown>, comparisonResultSchema);
}
