import { supabase } from "../lib/supabase";

/**
 * Sign up with email + password
 */
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
};

/**
 * Sign in with email + password
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
};

/**
 * Magic link: sends an email, no password needed
 */
export const sendMagicLink = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { error: null };
};

/**
 * Sign out
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
};

/**
 * Get current session
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session || null, error };
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return data.subscription;
};
