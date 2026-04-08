const { createClient } = globalThis.supabase;

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

function readFileAsBase64DataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(file, userId) {
  const dataUrl = await readFileAsBase64DataUrl(file);
  const fileBase64 = dataUrl.split(',')[1];
  const res = await fetch('/.netlify/functions/upload-letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      fileName: file.name,
      fileBase64,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json.path;
}

export async function saveDocumentToDatabase(userId, fileName, filePath) {
  // documents row is created in upload-letter (service role, bypasses RLS).
  return { user_id: userId, file_name: fileName, file_path: filePath };
}

export async function getUserDocuments(userId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}
