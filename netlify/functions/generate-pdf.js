const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

/**
 * Standard PDF fonts use WinAnsi; unmapped Unicode throws (common Netlify failure for “smart” quotes / em dash).
 */
function sanitizeTextForStandardFont(text) {
  if (!text) return "";
  const map = {
    "\u2013": "-",
    "\u2014": "-",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2026": "...",
    "\u00a0": " ",
  };
  let out = "";
  for (const c of text) {
    if (map[c]) {
      out += map[c];
      continue;
    }
    const code = c.charCodeAt(0);
    if (code <= 0xff) {
      out += c;
    } else {
      out += "?";
    }
  }
  return out;
}

function wordWrapLine(paragraph, font, fontSize, maxWidth) {
  const lines = [];
  const words = paragraph.split(/\s+/).filter(Boolean);
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine + (currentLine ? " " : "") + word;
    if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [""];
}

/** Split on newlines, wrap each paragraph, preserve blank lines as vertical gaps. */
function buildPdfLines(text, font, fontSize, maxWidth) {
  const normalized = (text || "").replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n");
  const lines = [];
  for (const block of blocks) {
    const sanitized = sanitizeTextForStandardFont(block);
    if (sanitized.trim() === "") {
      lines.push("");
      continue;
    }
    lines.push(...wordWrapLine(sanitized.trim(), font, fontSize, maxWidth));
  }
  return lines;
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
    const { text, fileName = "response-letter.pdf" } = JSON.parse(event.body || "{}");

    if (!text) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "No text provided for PDF generation" }),
      };
    }

    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([612, 792]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    const margin = 50;
    const maxWidth = currentPage.getWidth() - margin * 2;

    const lines = buildPdfLines(text, font, fontSize, maxWidth);
    let yPosition = currentPage.getHeight() - margin;

    for (const line of lines) {
      if (yPosition < margin + lineHeight) {
        currentPage = pdfDoc.addPage([612, 792]);
        yPosition = currentPage.getHeight() - margin;
      }
      if (line.length > 0) {
        currentPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
      yPosition -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
      },
      body: Buffer.from(pdfBytes).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("[generate-pdf] PDF generation failed:", error && error.message);
    console.error("[generate-pdf] stack:", error && error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "PDF generation failed — text may contain unsupported characters, or pdf-lib hit a runtime error.",
        details: error.message,
        hint: "Letters are sanitized to WinAnsi for standard fonts; check logs for the full stack trace.",
      }),
    };
  }
};
