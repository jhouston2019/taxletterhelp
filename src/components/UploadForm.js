const { createClient } = globalThis.supabase;

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

async function toBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return dataUrl.split(',')[1];
}

export async function uploadFile(file, userId) {
  const fileBase64 = await toBase64(file);
  const response = await fetch('/.netlify/functions/upload-letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      fileName: file.name,
      fileBase64,
      contentType: file.type,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data.path;
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
