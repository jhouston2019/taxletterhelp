const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");

/** Remove inline **bold** and *italic* markers (non-greedy, line-safe). */
function stripInlineMarkdown(segment) {
  let s = segment;
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  return s;
}

/**
 * Turn markdown-ish letter text into docx Paragraphs (headings, bullets, spacing).
 */
function markdownToDocxParagraphs(rawText) {
  const normalized = (rawText || "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const children = [];

  for (const line of lines) {
    const trimmedRight = line.replace(/\s+$/, "");
    if (trimmedRight === "") {
      children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    let content = trimmedRight;
    let heading;
    let bullet = false;

    if (/^###\s+/.test(content)) {
      heading = HeadingLevel.HEADING_3;
      content = content.replace(/^###\s+/, "");
    } else if (/^##\s+/.test(content)) {
      heading = HeadingLevel.HEADING_2;
      content = content.replace(/^##\s+/, "");
    } else if (/^#\s+/.test(content)) {
      heading = HeadingLevel.HEADING_1;
      content = content.replace(/^#\s+/, "");
    } else if (/^-\s+/.test(content)) {
      bullet = true;
      content = content.replace(/^-\s+/, "");
    }

    content = stripInlineMarkdown(content);

    if (heading !== undefined) {
      children.push(new Paragraph({ text: content, heading }));
    } else if (bullet) {
      children.push(new Paragraph({ text: content, bullet: { level: 0 } }));
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: content, size: 24 })],
        })
      );
    }
  }

  return children;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const { text, fileName = "response-letter.docx" } = JSON.parse(event.body || "{}");

    if (!text) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "No text provided for DOCX generation" }),
      };
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: markdownToDocxParagraphs(text),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
      },
      body: Buffer.from(buffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("[generate-docx]", error && error.message, error && error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to generate DOCX",
        details: error.message,
      }),
    };
  }
};
