import type { InteractionGateway, SourceInput } from "./client.js";
import { analyzeRisks } from "./analyze-risks.js";
import { detectTemplate } from "./detect-template.js";
import { extractMetadata } from "./extract-metadata.js";
import { extractTasks } from "./extract-tasks.js";
import { summarizeDocument } from "./summarize-document.js";
import { validateAnalysis } from "./validate-analysis.js";

export async function analyzeDocument(
  client: InteractionGateway,
  source: SourceInput
) {
  const metadata = await extractMetadata(client, source);
  const tasks = await extractTasks(client, source);
  const summary = await summarizeDocument(client, source);
  const risks = await analyzeRisks(client, source);
  const attachments = await detectTemplate(client, source);
  const confidence =
    (metadata.confidence +
      tasks.confidence +
      summary.confidence +
      risks.confidence +
      attachments.confidence) /
    5;

  return validateAnalysis({
    document: metadata.document,
    executiveSummary: summary.executiveSummary,
    tasks: tasks.tasks,
    deadlines: tasks.deadlines,
    importantFindings: risks.importantFindings,
    attachments: attachments.attachments,
    reportRequirements: attachments.reportRequirements,
    keyPoints: summary.keyPoints,
    confidence
  });
}
