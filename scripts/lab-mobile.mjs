#!/usr/bin/env node
/**
 * pnpm lab:mobile — does every lab experiment answer a FINGER?
 *
 * Starts Vite (or uses --url), fakes an admin session on /api/lab so the page
 * shows every candidate, and per experiment, under iPhone 13 and Pixel 7
 * emulation (touch on, Chromium's real input pipeline via CDP, so
 * `touch-action` and pointer capture behave as on a phone) plus a 1440 desktop:
 *
 *   drag / pointer → a touch drag across the surface
 *   press          → a 600 ms touch hold, then release
 *   scroll         → a touch swipe up (native scrolling, not the wheel)
 *   tilt           → a touch drag (the fallback when there is no gyroscope)
 *
 * Asserts: the card's DOM changed (transform / opacity / content), the PAGE did
 * not scroll during a drag or press (touch not stolen), no horizontal overflow,
 * the hint fits the card, no console errors. Exit 1 on any failure.
 *
 *   pnpm lab:mobile                          # all profiles, local Vite
 *   pnpm lab:mobile --shots <dir> --tag after  # also save <tag>-<id>.png (iPhone)
 *   pnpm lab:mobile --url http://localhost:5173 --only iphone
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (k) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : undefined);
const PORT = 5199;
const SHOTS = opt("shots");
const TAG = opt("tag") ?? "shot";
const PROFILES = {
  iphone: { ...devices["iPhone 13"], defaultBrowserType: undefined },
  pixel: { ...devices["Pixel 7"], defaultBrowserType: undefined },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false },
};
const only = opt("only")?.split(",") ?? Object.keys(PROFILES);

async function server() {
  if (opt("url")) return { base: opt("url"), stop: () => {} };
  const vite = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], { cwd: ROOT, shell: true, stdio: "pipe" });
  let dead = null;
  vite.on("exit", (c) => (dead = c));
  for (let i = 0; ; i++) {
    if (dead !== null) throw new Error(`vite exited ${dead}`);
    if (i > 120) throw new Error("vite did not answer in 60s");
    if (await fetch(`http://localhost:${PORT}/`).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  return { base: `http://localhost:${PORT}`, stop: () => (process.platform === "win32" ? spawn("taskkill", ["/pid", String(vite.pid), "/T", "/F"]) : vite.kill()) };
}

const ADMIN = { login: true, store: true, admin: true, user: "smoke", kept: [], discarded: [], veredictos: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function touchDrag(cdp, x, y, dx, dy, steps = 12) {
  const pt = (i) => [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(0) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(i) });
    await sleep(16);
  }
}
const touchEnd = (cdp) => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

async function act(page, cdp, input, box, touch) {
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (input === "scroll") {
    // A finger swiping UP scrolls the content down. (Input.synthesizeScrollGesture
    // does nothing in headless Chromium, so this is a raw touch drag.)
    if (touch) {
      await touchDrag(cdp, x, y + box.height * 0.3, 0, -box.height * 0.6, 15);
      await touchEnd(cdp);
    } else {
      await page.mouse.move(x, y);
      for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 60), await sleep(30);
    }
    return;
  }
  if (input === "press") {
    if (touch) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
      await sleep(600);
      return touchEnd(cdp);
    }
    await page.mouse.move(x, y);
    await page.mouse.down();
    await sleep(600);
    return page.mouse.up();
  }
  // drag, pointer, tilt: a finger (or mouse) dragged across the surface
  if (touch) return touchDrag(cdp, x - box.width * 0.25, y + box.height * 0.2, box.width * 0.5, -box.height * 0.3);
  await page.mouse.move(x - box.width * 0.25, y);
  await page.mouse.down();
  await page.mouse.move(x + box.width * 0.25, y - box.height * 0.2, { steps: 12 });
}

const failures = [];
const { base, stop } = await server();
const browser = await chromium.launch();
try {
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  for (const name of only) {
    const touch = PROFILES[name].hasTouch;
    // Phones run under reduced motion: the idle wander (useIdle) is off there, so a
    // change can only come from the finger, and the reduced path gets exercised.
    const ctx = await browser.newContext({ ...PROFILES[name], reducedMotion: touch ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route("**/api/lab", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(ADMIN) }));
    await page.goto(`${base}/lab?admin`, { waitUntil: "load" });
    await page.waitForSelector("[data-lab-id]");
    await sleep(800);
    const cdp = await ctx.newCDPSession(page);
    const fail = (id, m) => failures.push(`${name} ${id}: ${m}`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) fail("page", `horizontal overflow ${overflow}px`);

    const ids = await page.$$eval("[data-lab-id]", (els) => els.map((e) => [e.dataset.labId, e.dataset.labInput]));
    for (const [id, input] of ids) {
      const card = page.locator(`[data-lab-id="${id}"]`).first();
      await card.scrollIntoViewIfNeeded();
      await sleep(300);
      const surface = card.locator("[data-lab-surface]");
      const box = await surface.boundingBox();
      if (!box) {
        fail(id, "no surface box");
        continue;
      }
      const hintOk = await card.evaluate((el) => {
        const h = el.firstElementChild;
        return h ? h.scrollWidth <= h.clientWidth + 1 : true;
      });
      if (!hintOk) fail(id, "hint overflows the card header");
      if (SHOTS && name === "iphone") await card.screenshot({ path: path.join(SHOTS, `${TAG}-${id}.png`) });

      const sig = () => card.evaluate((el) => el.querySelector("[data-lab-surface]").innerHTML);
      const before = await sig();
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await act(page, cdp, input, box, touch);
      await sleep(250);
      const mid = await sig();
      if (input !== "press" && input !== "scroll") {
        if (touch) await touchEnd(cdp);
        else await page.mouse.up();
      }
      await sleep(400);
      const after = await sig();
      const scrollAfter = await page.evaluate(() => window.scrollY);
      if (before === mid && before === after) fail(id, `${input} via ${touch ? "touch" : "mouse"} changed nothing`);
      if (input !== "scroll" && Math.abs(scrollAfter - scrollBefore) > 2)
        fail(id, `the page scrolled ${scrollAfter - scrollBefore}px during the gesture (touch stolen)`);
      console.log(`  ${before === mid && before === after ? "✗" : "✓"} ${name.padEnd(7)} ${id} (${input})`);
    }
    if (errors.length) fail("console", errors.slice(0, 3).join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
  stop();
}
if (failures.length) {
  console.error(`\nlab:mobile: ${failures.length} failure(s)\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("\nlab:mobile: every experiment answered touch and mouse, no overflow, no console errors");
