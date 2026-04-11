/**
 * Removes common tool-disclaimer lines from letter text before PDF/DOCX export.
 */
function stripDisclaimerLinesFromLetter(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .split("\n")
    .filter(
      (line) =>
        !line.includes("This tool generates draft") &&
        !line.includes("does not constitute legal") &&
        !line.includes("attorney-client") &&
        !line.includes("For complex matters") &&
        !line.includes("Full disclaimer")
    )
    .join("\n");
}

module.exports = { stripDisclaimerLinesFromLetter };
