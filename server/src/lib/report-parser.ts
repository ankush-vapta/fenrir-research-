export interface ParsedReport {
  executiveSummary: string;
  keyFindings: string[];
  sourceReferences: Array<{ title: string; url: string }>;
  conclusion: string;
}

export function parseReportMarkdown(markdown: string): ParsedReport {
  const sections = splitSections(markdown);

  return {
    executiveSummary: sections["executive summary"] ?? "",
    keyFindings: extractBulletPoints(sections["key findings"] ?? ""),
    sourceReferences: extractSources(sections["source references"] ?? sections["sources"] ?? ""),
    conclusion: sections["conclusion"] ?? "",
  };
}

function splitSections(markdown: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = markdown.split(/^##\s+/m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const [headingLine, ...body] = part.split("\n");
    const key = headingLine.trim().toLowerCase();
    result[key] = body.join("\n").trim();
  }

  return result;
}

function extractBulletPoints(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""));
}

function extractSources(section: string): Array<{ title: string; url: string }> {
  const sources: Array<{ title: string; url: string }> = [];
  const urlRegex = /(https?:\/\/[^\s)]+)/g;

  for (const line of section.split("\n")) {
    const urls = line.match(urlRegex);
    if (!urls?.length) continue;

    const title = line
      .replace(urlRegex, "")
      .replace(/^[-*\d.]+\s*/, "")
      .replace(/[\[\]()]/g, "")
      .trim();

    for (const url of urls) {
      sources.push({
        title: title || url,
        url: url.replace(/[.,]$/, ""),
      });
    }
  }

  return sources;
}
