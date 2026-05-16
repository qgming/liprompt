const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "datadoc");
const outputDefault = path.join(root, "remote-data", "image-prompts.json");
const imageBase =
  "https://raw.githubusercontent.com/qgming/awesome-gpt-image-2-prompts/refs/heads/main/images";

const sources = [
  {
    file: "ecommerce_zh-CN.md",
    section: "电商案例",
    emoji: "🛍️",
    prefix: "ecommerce",
  },
  {
    file: "ad-creative_zh-CN.md",
    section: "广告创意案例",
    emoji: "📣",
    prefix: "ad-creative",
  },
  {
    file: "portrait_zh-CN.md",
    section: "人像与摄影案例",
    emoji: "📷",
    prefix: "portrait",
  },
  {
    file: "poster_zh-CN.md",
    section: "海报与插画案例",
    emoji: "🎨",
    prefix: "poster",
  },
  {
    file: "character_zh-CN.md",
    section: "角色设计案例",
    emoji: "🧙",
    prefix: "character",
  },
  {
    file: "ui_zh-CN.md",
    section: "UI 与社交媒体截图案例",
    emoji: "🖥️",
    prefix: "ui",
  },
  {
    file: "comparison_zh-CN.md",
    section: "模型对比与社区案例",
    emoji: "🧪",
    prefix: "comparison",
  },
];

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeImageUrl(value) {
  const url = decodeHtml(value.trim());
  const match = url.match(/(?:^|\/)images\/([^\s?#)"'>]+)(?:[?#][^\s)"'>]*)?$/i);
  return match ? `${imageBase}/${match[1].replace(/\\/g, "/")}` : url;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractImages(block) {
  const images = [];
  const htmlImage = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const markdownImage = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of block.matchAll(htmlImage)) {
    images.push(normalizeImageUrl(match[1]));
  }
  for (const match of block.matchAll(markdownImage)) {
    images.push(normalizeImageUrl(match[1]));
  }

  return unique(images).filter((image) => /\/images\//i.test(image));
}

function extractPrompt(block) {
  const promptPattern =
    /\*\*(?:提示词|Prompt(?:\s+\d+[^*]*)?)\s*[:：]?\*\*\s*[:：]?\s*\r?\n+```[\w-]*\r?\n([\s\S]*?)\r?\n```/gi;
  const labelPattern = /\*\*((?:提示词|Prompt(?:\s+\d+[^*]*)?))\s*[:：]?\*\*/i;
  const parts = [];

  for (const match of block.matchAll(promptPattern)) {
    const labelMatch = match[0].match(labelPattern);
    const label = labelMatch ? labelMatch[1].trim() : "Prompt";
    const text = match[1].trim();
    if (text) {
      parts.push({ label, text });
    }
  }

  if (parts.length === 1 && /^(提示词|Prompt)$/i.test(parts[0].label)) {
    return parts[0].text;
  }
  return parts.map((part) => `${part.label}:\n${part.text}`).join("\n\n");
}

function extractAuthor(authorMarkdown = "") {
  const match = authorMarkdown.match(/\[([^\]]+)]\(([^)]+)\)/);
  if (!match) {
    return { author: authorMarkdown.trim(), authorUrl: "" };
  }
  return {
    author: match[1].trim(),
    authorUrl: decodeHtml(match[2].trim()),
  };
}

function parseCaseHeading(line) {
  const linked = line.match(
    /^###\s+Case\s+(\d+):\s+\[([^\]]+)]\(([^)]+)\)(?:\s+\(by\s+(.+)\))?\s*$/,
  );
  if (linked) {
    return {
      caseNumber: linked[1],
      name: linked[2].trim(),
      sourceUrl: decodeHtml(linked[3].trim()),
      ...extractAuthor(linked[4]),
    };
  }

  const plain = line.match(/^###\s+Case\s+(\d+):\s+(.+?)\s*$/);
  if (plain) {
    return {
      caseNumber: plain[1],
      name: plain[2].trim(),
      sourceUrl: "",
      author: "",
      authorUrl: "",
    };
  }

  return null;
}

function extractCaseKey(images, prefix, caseNumber) {
  const match = (images[0] || "").match(/\/images\/([^/]+)\//i);
  return match ? match[1] : `${prefix}_case${caseNumber}`;
}

function makeDescription(prompt) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  return compact.length <= 60 ? compact : `${compact.slice(0, 57)}...`;
}

function parseSource(meta) {
  const sourcePath = path.join(dataDir, meta.file);
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const lines = markdown.split(/\r?\n/);
  const cases = [];
  let activeCase = null;
  let activeCaseStart = -1;

  function flushCase(endIndex) {
    if (!activeCase) {
      return;
    }

    const block = lines.slice(activeCaseStart, endIndex).join("\n");
    const images = extractImages(block);
    const prompt = extractPrompt(block);

    if (!images.length) {
      console.warn(`Skipped ${meta.file} Case ${activeCase.caseNumber}: no output image.`);
      activeCase = null;
      activeCaseStart = -1;
      return;
    }
    if (!prompt) {
      console.warn(`Skipped ${meta.file} Case ${activeCase.caseNumber}: no prompt text.`);
      activeCase = null;
      activeCaseStart = -1;
      return;
    }

    const caseKey = extractCaseKey(images, meta.prefix, activeCase.caseNumber);
    cases.push({
      caseKey,
      sourcePrefix: meta.prefix,
      caseNumber: activeCase.caseNumber,
      name: activeCase.name,
      description: makeDescription(prompt),
      emoji: meta.emoji,
      group: ["图片提示", meta.section],
      prompt,
      promptType: "image",
      section: meta.section,
      author: activeCase.author,
      sourceUrl: activeCase.sourceUrl,
      authorUrl: activeCase.authorUrl,
      coverImage: images[0],
      images,
    });

    activeCase = null;
    activeCaseStart = -1;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseCaseHeading(lines[index]);
    if (!parsed) {
      continue;
    }

    flushCase(index);
    activeCase = parsed;
    activeCaseStart = index;
  }

  flushCase(lines.length);
  return cases;
}

function validateCases(cases) {
  const ids = new Set();
  const caseKeys = new Set();

  for (const item of cases) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate id: ${item.id}`);
    }
    if (caseKeys.has(item.caseKey)) {
      throw new Error(`Duplicate caseKey: ${item.caseKey}`);
    }
    ids.add(item.id);
    caseKeys.add(item.caseKey);
  }
}

function assignUniqueIds(cases) {
  const used = new Set();
  return cases.map((item) => {
    let caseKey = item.caseKey;
    if (used.has(caseKey)) {
      caseKey = `${item.caseKey}__${item.sourcePrefix}_case${item.caseNumber}`;
    }

    let suffix = 2;
    while (used.has(caseKey)) {
      caseKey = `${item.caseKey}__${item.sourcePrefix}_case${item.caseNumber}_${suffix}`;
      suffix += 1;
    }

    used.add(caseKey);
    const { sourcePrefix, ...rest } = item;
    return {
      id: `IMG_${caseKey}`,
      ...rest,
      caseKey,
    };
  });
}

function summarize(cases) {
  const counts = new Map();
  for (const item of cases) {
    counts.set(item.section, (counts.get(item.section) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([section, count]) => `  ${section}: ${count}`)
    .join("\n");
}

function main() {
  const [, , outputArg] = process.argv;
  const outputPath = path.resolve(root, outputArg || outputDefault);
  const parsed = sources.flatMap(parseSource);
  const cases = assignUniqueIds(parsed).map((item, index) => ({
    ...item,
    sortIndex: index + 1,
  }));

  validateCases(cases);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(cases, null, 2)}\n`, "utf8");

  console.log(`Generated ${path.relative(root, outputPath)} from ${sources.length} datadoc files`);
  console.log(`Total image prompts: ${cases.length}`);
  console.log(summarize(cases));
}

main();
