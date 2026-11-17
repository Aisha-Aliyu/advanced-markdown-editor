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
// Errors the way Supabase Auth sends them to supabase-js (API version 2024-01-01)
const authError = (status, code, msg, extra = {}) => ({ status, json: { code, msg, ...extra } });
// A sign-up that waits for email confirmation: a user, but no session
const pendingUser = (email, identities) => ({ id: "u2", aud: "authenticated", role: "", email, confirmation_sent_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, identities });

// What the stand-in answers, by path. Each scenario can override one.
function defaultAnswers() {
  return {
    "/auth/v1/token": ({ body }) => (body.password === "right password" ? { json: session(body.email) } : authError(400, "invalid_credentials", "Invalid login credentials")),
    "/auth/v1/signup": ({ body }) => {
      if (body.email.startsWith("blocked")) return authError(400, "email_address_not_authorized", "Email address not authorized");
      if (body.email.startsWith("weak")) {
        return authError(422, "weak_password", "Password is known to be weak and easy to guess, please choose a different one.", { weak_password: { reasons: ["pwned"] } });
      }
      // With "Confirm email" on, an address that already has an account gets this, and no email
      if (body.email.startsWith("taken")) return { json: pendingUser(body.email, []) };
      if (body.email.startsWith("confirm")) return { json: pendingUser(body.email, [{ id: "u2" }]) };
      return { json: session(body.email) };
    },
    "/auth/v1/otp": ({ body }) =>
      body.email.startsWith("blocked")
        ? authError(400, "email_address_not_authorized", "Email address not authorized")
        : body.email.startsWith("soon")
          ? authError(429, "over_email_send_rate_limit", "For security purposes, you can only request this after 30 seconds.")
          : { json: {} },
    "/auth/v1/logout": () => ({ status: 204 }),
  };
}

const HEADERS = {
  "access-control-allow-origin": "*",
  // supabase-js only reads the 2024-01-01 error format when it can see this header
  "access-control-expose-headers": "x-supabase-api-version",
  "x-supabase-api-version": "2024-01-01",
};

// An answer that waits for release(), so a scenario can act while the request is running
function held(answer) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  return { answer: async (request) => { await gate; return answer(request); }, release: () => release() };
}

async function openApp(browser, overrides = {}, { guestDocs } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  if (guestDocs) {
    // Documents written as a guest earlier, in this browser
    await context.addInitScript((docs) => {
      try {
        if (!localStorage.getItem("inkwell_docs")) localStorage.setItem("inkwell_docs", docs);
      } catch { /* a frame without storage */ }
    }, JSON.stringify(guestDocs));
  }
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
    // Database reads and writes get an empty list unless the scenario says otherwise
    const answer = answers[url.pathname] || (url.pathname.startsWith("/rest/v1/") ? () => ({ json: [] }) : null);
    if (!answer) return route.fulfill({ status: 404, json: {}, headers: HEADERS });
    let body = {};
    try { body = request.postDataJSON() || {}; } catch { /* not JSON */ }
    requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), body });
    const result = await answer({ body, url });
    if (result === "abort") return route.abort();
    const reply = { status: result.status || 200, headers: HEADERS };
    return route.fulfill(result.json === undefined ? { ...reply, body: "" } : { ...reply, json: result.json });
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
    check("a magic link to an address Supabase won't email points to passwords", /can't send magic links to that address yet\. Please sign up with a password/.test(await alertText(page)));
    await context.close();
  }
  {
    const { context, page } = await openApp(browser);
    await submit(page, "Sign Up", "blocked@example.com", "long enough pw");
    check("a sign-up whose confirmation email can't go out says so", /couldn't send the confirmation email/.test(await alertText(page)));
    await context.close();
  }
  {
    const { context, page } = await openApp(browser);
    await submit(page, "Magic Link", "soon@example.com");
    check("the wait between emails keeps Supabase's own message", /only request this after 30 seconds/.test(await alertText(page)));
    await context.close();
  }
  {
    const { context, page } = await openApp(browser);
    await submit(page, "Sign Up", "taken@example.com", "long enough pw");
    check("signing up with an address that already has an account says so", /already has an account/.test(await alertText(page)));
    await context.close();
  }
  {
    const { context, page } = await openApp(browser);
    await submit(page, "Sign Up", "weak@example.com", "long enough pw");
    check("a password Supabase turns down shows Supabase's reason", /known to be weak/.test(await alertText(page)));
    await context.close();
  }
  {
    const otp = held(() => ({ json: {} }));
    const { context, page } = await openApp(browser, { "/auth/v1/otp": otp.answer });
    await submit(page, "Magic Link", "ada@example.com");
    await page.getByRole("button", { name: "Please wait..." }).waitFor({ timeout: 5000 });
    await page.fill("#email", "someone.else@example.com");
    otp.release();
    await page.getByText("Check your inbox").waitFor({ timeout: 5000 }).catch(() => {});
    const message = await page.locator("form").textContent();
    check("the inbox message names the address the link went to, even if the field changed", message.includes("ada@example.com") && !message.includes("someone.else"), message);
    await context.close();
  }
  {
    const token = held(() => authError(400, "invalid_credentials", "Invalid login credentials"));
    const { context, page } = await openApp(browser, { "/auth/v1/token": token.answer });
    await submit(page, "Sign In", "ada@example.com", "wrong password");
    await page.getByRole("button", { name: "Please wait..." }).waitFor({ timeout: 5000 });
    await page.getByRole("tab", { name: "Magic Link" }).click();
    token.release();
    // The request is over once the button stops saying Please wait
    await page.getByRole("button", { name: "Magic Link" }).waitFor({ timeout: 5000 }).catch(() => {});
    check("a reply that arrives after switching tabs stays off the new tab", (await page.getByRole("alert").count()) === 0);
    await context.close();
  }
  {
    const now = new Date().toISOString();
    const guestDocs = [{ id: "guest-1", title: "Guest notes", content: "Written before signing in", createdAt: now, updatedAt: now, isSaved: false }];
    const accountDoc = { id: "cloud-1", title: "Account plan", content: "Private to the account", created_at: now, updated_at: now };
    const { context, page } = await openApp(browser, { "/rest/v1/documents": () => ({ json: [accountDoc] }) }, { guestDocs });
    const sidebar = page.locator("aside");
    await submit(page, "Sign In", "ada@example.com", "right password");
    const shown = await sidebar.getByText("Account plan").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("signing in shows the account's documents", shown);
    await page.waitForTimeout(2500); // the browser copy is saved 2 seconds after a change
    const stored = await page.evaluate(() => ({ ...localStorage }));
    check(
      "the account's copy is kept apart from the guest documents",
      (stored.inkwell_docs_u1 || "").includes("Account plan") && (stored.inkwell_docs || "").includes("Guest notes") && !(stored.inkwell_docs || "").includes("Account plan"),
    );
    await page.getByTitle("Sign out").click();
    const guestBack = await sidebar.getByText("Guest notes").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("after signing out, the guest documents are back", guestBack);
    await page.waitForTimeout(2500);
    const left = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    check(
      "after signing out, the account's documents are gone from the screen and from the browser",
      (await page.getByText("Account plan").count()) === 0 && !left.includes("Account plan") && !left.includes("inkwell_user"),
      left.slice(0, 300),
    );
    await context.close();
  }
  {
    const now = new Date().toISOString();
    const docs = [
      { id: "doc-a", title: "Alpha doc", content: "alpha today", created_at: now, updated_at: now },
      { id: "doc-b", title: "Beta doc", content: "beta today", created_at: now, updated_at: now },
    ];
    const versions = {
      "doc-a": [{ id: "va1", title: "Alpha doc", content: "alpha earlier", version_label: "Snapshot one", created_at: now }],
      "doc-b": [{ id: "vb1", title: "Beta doc", content: "beta earlier", version_label: "Snapshot two", created_at: now }],
    };
    let releaseB;
    const betaGate = new Promise((resolve) => { releaseB = resolve; });
    const { context, page } = await openApp(browser, {
      "/rest/v1/documents": () => ({ json: docs }),
      "/rest/v1/document_versions": async ({ url }) => {
        const id = (url.searchParams.get("document_id") || "").replace("eq.", "");
        if (id === "doc-b") await betaGate;
        return { json: versions[id] || [] };
      },
    });
    const sidebar = page.locator("aside");
    await submit(page, "Sign In", "ada@example.com", "right password");
    await sidebar.getByText("Alpha doc").waitFor({ timeout: 5000 });
    // Preview one of Alpha's versions, then close the panel by clicking beside it
    await page.getByTitle("Version history").click();
    await page.getByText("Snapshot one").click();
    await page.getByText("Restore this version").waitFor({ timeout: 5000 });
    await page.mouse.click(20, 400);
    // Open Beta, and its history while Beta's list is still on the way
    await sidebar.getByText("Beta doc").click();
    await page.getByTitle("Version history").click();
    await page.getByText("Loading versions...").waitFor({ timeout: 5000 });
    const carried = (await page.getByText("Snapshot one").count()) + (await page.getByText("Restore this version").count());
    check("while Beta's history loads, nothing of Alpha's is listed or can be restored", carried === 0);
    releaseB();
    const betaShown = await page.getByText("Snapshot two").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("Beta's own versions then appear, with no preview carried over", betaShown && (await page.getByText("Restore this version").count()) === 0);
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
