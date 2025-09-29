import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export async function uploadFile(file, userId) {
  const { data, error } = await supabase.storage.from('letters').upload(`${userId}/${file.name}`, file);
  if (error) throw error;
  return data.path;
}

export async function saveDocumentToDatabase(userId, fileName, filePath) {
  const { data, error } = await supabase
    .from('documents')
    .insert([
      {
        user_id: userId,
        file_name: fileName,
        file_path: filePath
      }
    ])
    .select();
  
  if (error) throw error;
  return data[0];
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
