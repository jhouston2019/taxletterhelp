/**
 * Preview-first flow (UX only): calls analyze-letter-preview (no billing).
 * Full analysis remains: Auth.js + /.netlify/functions/analyze-letter — unchanged.
 */
export async function analyzeTaxLetterPreview(letterText) {
  const r = await fetch('/.netlify/functions/analyze-letter-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: letterText || '' }),
  });
  const raw = await r.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(r.ok ? 'Invalid preview response' : 'Preview failed');
  }
  if (!r.ok) {
    throw new Error(data.error || 'Preview failed');
  }
  return data;
}
