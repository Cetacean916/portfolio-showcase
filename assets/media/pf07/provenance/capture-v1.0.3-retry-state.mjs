#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const packageRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
const outputRoot = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (!packageRoot || !outputRoot) {
  throw new Error("usage: capture-v1.0.3-retry-state.mjs FINAL_LINUX_PACKAGE OUTPUT_ROOT");
}

const launcher = path.join(packageRoot, "pf07");
const runtimeEnv = path.join(packageRoot, ".pf07", "runtime.env");
const composeFile = path.join(packageRoot, "packaging", "common", "compose.yaml");
const artifactManifestPath = path.join(packageRoot, "ARTIFACT-MANIFEST.json");
for (const required of [launcher, runtimeEnv, composeFile, artifactManifestPath]) {
  await fsp.access(required, fs.constants.R_OK);
}

const runtime = Object.fromEntries(
  (await fsp.readFile(runtimeEnv, "utf8"))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
for (const key of ["PF07_WORDPRESS_PORT", "PF07_ADMIN_USER", "PF07_ADMIN_PASSWORD", "PF07_COMPOSE_PROJECT"]) {
  if (!runtime[key]) throw new Error(`missing final package runtime value: ${key}`);
}

const artifactManifestBytes = await fsp.readFile(artifactManifestPath);
const artifactManifest = JSON.parse(artifactManifestBytes.toString("utf8"));
if (artifactManifest.schema !== "pf07.artifact-manifest.v1"
  || artifactManifest.artifact_id !== "pf07-linux-x86_64"
  || artifactManifest.package_version !== "1.0.3"
  || artifactManifest.build_id !== "pf07-build-c14f8fe0b8e95bea97bf") {
  throw new Error("final Linux package identity failed");
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const checked = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? packageRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout;
};
const packageCommand = (...args) => checked(launcher, args);
const compose = (...args) => checked("docker", [
  "compose", "--progress", "quiet", "--env-file", runtimeEnv, "-f", composeFile,
  "-p", runtime.PF07_COMPOSE_PROJECT, ...args,
]);

await fsp.mkdir(outputRoot, { recursive: true });
const outputs = {
  ko: path.join(outputRoot, "operator-retrying-ko.png"),
  en: path.join(outputRoot, "operator-retrying-en.png"),
};
for (const output of Object.values(outputs)) {
  if (fs.existsSync(output)) throw new Error(`refusing to replace existing output: ${path.basename(output)}`);
}

const baseUrl = `http://127.0.0.1:${runtime.PF07_WORDPRESS_PORT}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PF07_CHROME_PATH || "/usr/bin/google-chrome",
});

const capture = async (locale, output, requiredText) => {
  packageCommand("language", locale);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/wp-login.php`, { waitUntil: "domcontentloaded" });
    await page.locator("#user_login").fill(runtime.PF07_ADMIN_USER);
    await page.locator("#user_pass").fill(runtime.PF07_ADMIN_PASSWORD);
    await Promise.all([
      page.waitForURL(/\/wp-admin\//),
      page.locator("#wp-submit").click(),
    ]);
    await page.goto(`${baseUrl}/wp-admin/admin.php?page=oddroom-orderops`, { waitUntil: "networkidle" });
    const card = page.locator(".oddroom-event-card").first();
    await card.waitFor({ state: "visible" });
    if (!(await card.evaluate((node) => node.className.includes("status-retrying")))
      || !(await card.innerText()).includes(requiredText)) {
      throw new Error(`retry-wait state was not visible for ${locale}`);
    }
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -180));
    await page.screenshot({ path: output, type: "png" });
  } finally {
    await context.close();
  }
};

try {
  packageCommand("reset-demo", "--confirm=RESET PF07 DEMO");
  packageCommand("language", "ko_KR");
  packageCommand("scenario", "fail_once");
  compose("stop", "-t", "1", "worker");
  compose(
    "--profile", "tools", "run", "--rm", "-T", "wpcli",
    "oddroom-orderops", "create-order", "--shape=variable",
    "--alias=portfolio-retry-state", "--email=pf07-retry-state@example.com",
  );
  compose(
    "--profile", "tools", "run", "--rm", "-T", "wpcli",
    "action-scheduler", "run", "--hooks=oddroom_orderops_process",
    "--batch-size=25", "--batches=1", "--force",
  );
  await capture("ko_KR", outputs.ko, "재시도 중");
  await capture("en_US", outputs.en, "Retrying");
} finally {
  compose("start", "worker");
  packageCommand("scenario", "normal");
  packageCommand("language", "ko_KR");
  packageCommand("reset-demo", "--confirm=RESET PF07 DEMO");
  await browser.close();
}

const result = {};
for (const [locale, output] of Object.entries(outputs)) {
  const bytes = await fsp.readFile(output);
  result[locale] = { filename: path.basename(output), bytes: bytes.length, sha256: sha256(bytes) };
}
process.stdout.write(`${JSON.stringify({
  schema: "pf07.portfolio-retry-state.v1",
  package_build_id: artifactManifest.build_id,
  package_artifact_manifest_sha256: sha256(artifactManifestBytes),
  state: "retry_wait",
  files: result,
}, null, 2)}\n`);
