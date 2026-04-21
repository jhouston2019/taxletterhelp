import { createClient } from '@supabase/supabase-js';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

/**
 * Magic-link sign-in (passwordless). Same flow for returning users.
 */
export async function signInWithMagicLink(email, options = {}) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: options.redirectTo || window.location.origin + '/wizard',
    },
  });
}

/** @deprecated Use signInWithMagicLink */
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** @deprecated Prefer magic-link flows */
export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}
