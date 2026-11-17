// Checks the sign-in window against a stand-in for Supabase Auth, so it runs on CI
// without a real project. Build with VITE_SUPABASE_URL=https://e2e-test.supabase.co, serve
// the build with `vite preview`, then run: node e2e/auth.e2e.mjs
import { chromium } from "playwright";

const APP = process.env.APP_URL || "http://127.0.0.1:4173";
const SUPABASE = "https://e2e-test.supabase.co";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "ok" : "not ok"} - ${name}${detail ? ` (${detail})` : ""}`);
};

// A JWT-shaped access token (supabase-js reads it, but doesn't check the signature)
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const session = (email) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", email, exp, aud: "authenticated", role: "authenticated" })}.sig`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: "refresh-token",
    user: { id: "u1", aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {} },
  };
};
const authError = (status, code, msg) => ({ status, json: { code: status, error_code: code, msg } });

// What the stand-in answers, by endpoint. Each scenario can override one.
function defaultAnswers() {
  return {
    "/auth/v1/token": ({ body }) => (body.password === "right password" ? { json: session(body.email) } : authError(400, "invalid_credentials", "Invalid login credentials")),
    "/auth/v1/signup": ({ body }) =>
      body.email.startsWith("confirm")
        ? { json: { id: "u2", aud: "authenticated", role: "", email: body.email, confirmation_sent_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, identities: [{ id: "u2" }] } }
        : { json: session(body.email) },
    "/auth/v1/otp": ({ body }) => (body.email.startsWith("blocked") ? authError(400, "email_address_not_authorized", "Email address not authorized") : { json: {} }),
    "/auth/v1/logout": () => ({ status: 204 }),
  };
}

async function openApp(browser, overrides = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const answers = { ...defaultAnswers(), ...overrides };
  const requests = [];
  await context.route(`${SUPABASE}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      // "*" doesn't cover the Authorization header, so allow exactly what was asked for
      const asked = request.headers()["access-control-request-headers"] || "";
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": asked, "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE" } });
    }
    if (url.pathname.startsWith("/rest/v1/")) return route.fulfill({ json: [], headers: { "access-control-allow-origin": "*" } });
    const answer = answers[url.pathname];
    if (!answer) return route.fulfill({ status: 404, json: {} });
    const body = request.postDataJSON() || {};
    requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), body });
    const result = await answer({ body, url });
    if (result === "abort") return route.abort();
    return route.fulfill({ status: result.status || 200, json: result.json, headers: { "access-control-allow-origin": "*" } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(APP, { waitUntil: "networkidle" });
  return { context, page, requests, errors };
}

async function submit(page, tab, email, password) {
  await page.getByRole("button", { name: /Sign in to sync/ }).click();
  await page.getByRole("tab", { name: tab }).click();
  await page.fill("#email", email);
  if (password !== undefined) await page.fill("#password", password);
  await page.click('form button[type="submit"]');
}

const alertText = (page) => page.getByRole("alert").textContent({ timeout: 5000 }).catch(() => "");

const browser = await chromium.launch();
try {
  {
    const { context, page, errors } = await openApp(browser);
    await submit(page, "Sign In", "ada@example.com", "wrong password");
    check("a wrong password says so", /don't match an account/.test(await alertText(page)));
    await page.fill("#password", "right password");
    await page.click('form button[type="submit"]');
    const signedIn = await page.getByText("ada@example.com").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("the right password signs in and shows the account", signedIn && !(await page.locator("#password").isVisible()));
    check("no errors in the page", errors.length === 0, errors.join(" | "));
    await context.close();
  }
  {
    const { context, page, requests } = await openApp(browser);
    await submit(page, "Sign Up", "confirm.me@example.com", "long enough pw");
    const panel = await page.getByText("Check your inbox").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("a sign-up that needs email confirmation says to check the inbox", panel && (await page.getByText("confirmation link").isVisible()));
    const signup = requests.find((r) => r.path === "/auth/v1/signup");
    check("the confirmation link comes back to this site", signup?.query.redirect_to === new URL(APP).origin, signup?.query.redirect_to);
    check("it doesn't pretend to be signed in", !(await page.getByText("Cloud sync on").isVisible()));
    await context.close();
  }
  {
    const { context, page } = await openApp(browser);
    await submit(page, "Sign Up", "grace@example.com", "long enough pw");
    const signedIn = await page.getByText("grace@example.com").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("a sign-up without confirmation signs straight in", signedIn);
    await context.close();
  }
  {
    const { context, page, requests } = await openApp(browser);
    await submit(page, "Magic Link", "ada@example.com");
    const panel = await page.getByText("Check your inbox").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("a magic link says to check the inbox", panel && (await page.getByText("magic link to").isVisible()));
    const otp = requests.find((r) => r.path === "/auth/v1/otp");
    check("the magic link comes back to this site", otp?.query.redirect_to === new URL(APP).origin, otp?.query.redirect_to);
    await context.close();
  }
  {
    const { context, page } = await openApp(browser);
    await submit(page, "Magic Link", "blocked@example.com");
    check("an address Supabase won't email gets a clear message", /can't send emails to that address/.test(await alertText(page)));
    await context.close();
  }
  {
    const { context, page } = await openApp(browser, { "/auth/v1/token": () => "abort" });
    await submit(page, "Sign In", "ada@example.com", "right password");
    check("no connection says so", /Can't reach the server/.test(await alertText(page)));
    check("the button doesn't stay on Please wait", (await page.textContent('form button[type="submit"]')) === "Sign In");
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll sign-in checks passed");
process.exit(failures ? 1 : 0);
