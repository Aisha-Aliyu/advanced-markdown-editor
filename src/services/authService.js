import { supabase } from "../lib/supabase";

const NOT_SET_UP = "Accounts aren't set up on this site right now. You can still write as a guest.";

// Supabase's error codes, in words people can act on. Anything else shows Supabase's own
// message, which is already readable (for example the wait time between magic links).
const MESSAGES = {
  invalid_credentials: "That email and password don't match an account.",
  email_not_confirmed: "Please confirm your email first. The link is in your inbox (check spam too).",
  user_already_exists: "That email already has an account. Try signing in instead.",
  email_exists: "That email already has an account. Try signing in instead.",
  weak_password: "That password is too weak. Please use at least 8 characters.",
  email_address_invalid: "Please enter a valid email address.",
  email_address_not_authorized: "We can't send emails to that address yet.",
  over_email_send_rate_limit: "Too many emails have gone out in the last hour. Please try again later, or use a password.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
  signup_disabled: "New sign-ups are switched off right now.",
  otp_disabled: "Magic links are switched off right now. Please use a password.",
};

// overrides: messages for this action only (the same code can mean different things)
const friendlyError = (error, overrides = {}) => {
  // The short wait between emails to one address comes with its own clear message
  // ("you can only request this after 30 seconds"), so that one is kept as it is
  if (error.code === "over_email_send_rate_limit" && /after \d+ seconds?/i.test(error.message)) return error.message;
  if (overrides[error.code]) return overrides[error.code];
  if (MESSAGES[error.code]) return MESSAGES[error.code];
  // A network failure, or a paused Supabase project, never reaches Supabase's error codes
  if (error.name === "AuthRetryableFetchError" || /failed to fetch|network/i.test(error.message)) {
    return "Can't reach the server. Please check your connection and try again.";
  }
  return error.message;
};

// Emails (sign-up confirmation, magic link) bring people back to the site they came from
const redirectTo = () => window.location.origin;

/**
 * Sign up with email + password. When Supabase asks for email confirmation there is no
 * session yet, so needsConfirmation tells the form to say "check your inbox".
 */
export const signUp = async (email, password) => {
  if (!supabase) return { user: null, error: NOT_SET_UP };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { emailRedirectTo: redirectTo() },
  });
  if (error) {
    return {
      user: null,
      error: friendlyError(error, {
        email_address_not_authorized: "We couldn't send the confirmation email to that address. Please try again later.",
      }),
    };
  }
  return { user: data.user, needsConfirmation: !data.session, error: null };
};

/**
 * Sign in with email + password
 */
export const signIn = async (email, password) => {
  if (!supabase) return { user: null, error: NOT_SET_UP };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { user: null, error: friendlyError(error) };
  return { user: data.user, error: null };
};

/**
 * Magic link: sends an email, no password needed
 */
export const sendMagicLink = async (email) => {
  if (!supabase) return { error: NOT_SET_UP };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo() },
  });
  if (error) {
    return {
      error: friendlyError(error, {
        email_address_not_authorized: "We can't send magic links to that address yet. Please sign up with a password instead.",
      }),
    };
  }
  return { error: null };
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error: error ? friendlyError(error) : null };
};

/**
 * Get current session
 */
export const getSession = async () => {
  if (!supabase) return { session: null, error: null };
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session || null, error };
};

/**
 * Listen to auth state changes. Without Supabase, everyone is a guest.
 */
export const onAuthChange = (callback) => {
  if (!supabase) {
    callback(null);
    return { unsubscribe: () => {} };
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return data.subscription;
};
