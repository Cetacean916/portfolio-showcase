#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const refinementRoot = path.join(projectRoot, "assets/media/pf07/refinement");
const outputRoot = path.join(refinementRoot, "own-ui-captures/after-completion");
const allowlistPath = path.join(projectRoot, "assets/media/pf07/media-allowlist.json");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const release = {
  version: "1.0.3",
  tag: "pf07-v1.0.3",
  build: "pf07-build-c14f8fe0b8e95bea97bf",
  commit: "4085e87f5d221d36ba5a58e859f12806e4b10d36",
  tree: "214ee2e8773a1f6109641869f06a8d13d4cd5310",
  artifactSet: "74b458a861d51da2e681b1201f138527731a2b87cde38f2f5f47438b3d20833e",
  workflowRun: "30070689929",
  workflowJob: "89410725798",
  canonicalArtifact: "pf07-canonical-packages-1.0.3",
  canonicalWrapper: "bc46a9d235f64140c857f2847a7ee0b8fd8ecec03836edcad1b510ce147e4e55",
};

const packages = [
  {
    platform: "WINDOWS x64",
    file: "pf07-windows-x64-1.0.3.zip",
    sha: "969dfb6d5dab0c9dbe82554f9329abce5f8917804754b5ad2806a1168930ad80",
    entry: "PF07-Launcher.exe",
    boundary: "CROSS-BUILD + STATIC VALIDATION · NATIVE RUN NOT CLAIMED",
  },
  {
    platform: "WINDOWS KVM KIT",
    file: "pf07-windows-kvm-test-kit-1.0.3.zip",
    sha: "6a8df9b9385ce0b7f85ccd192a0d716db7098641703c3d9e5d30e4474d065703",
    entry: "RUN-KVM-TEST.cmd",
    boundary: "OWNER KVM WORKFLOW READY · NATIVE RUN NOT CLAIMED",
  },
  {
    platform: "macOS UNIVERSAL",
    file: "pf07-macos-universal-1.0.3.zip",
    sha: "68062ddf03ec688b37e8f17422655e889165c325d91173dd341fdf405ff7aa22",
    entry: "PF07 Launcher.app",
    boundary: "APP-BUNDLE STATIC VALIDATION · NATIVE RUN NOT CLAIMED",
  },
  {
    platform: "LINUX LOCAL x86_64",
    file: "pf07-linux-x86_64-1.0.3.tar.gz",
    sha: "cd60c8b6b280f1347123262d4895b0fdf53e8d6de07eb59020d57fb8c4c67f2e",
    entry: "./pf07",
    boundary: "CANONICAL-BYTE START · RECOVERY · RERUN OBSERVED",
  },
  {
    platform: "LINUX SERVER x86_64",
    file: "pf07-linux-server-1.0.3.tar.gz",
    sha: "33fb64edd845273ccc322fe358c0143e359c05c80ca0542fa62da2f363a1a2e4",
    entry: "server/pf07-server",
    boundary: "ISOLATED START · STOP · RECOVER · RERUN OBSERVED",
  },
];

const xml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const packageRows = packages.map((item, index) => {
  const y = 286 + index * 244;
  return `<g transform="translate(72 ${y})">
    <rect width="1296" height="216" rx="18" fill="${index >= 3 ? "#171a18" : "#ffffff"}" stroke="#252822" stroke-width="2"/>
    <rect width="236" height="216" rx="18" fill="${index >= 3 ? "#36513d" : "#e6eadf"}"/>
    <text x="28" y="54" class="${index >= 3 ? "platform light" : "platform"}">${xml(item.platform)}</text>
    <text x="28" y="102" class="${index >= 3 ? "entry light" : "entry"}">${xml(item.entry)}</text>
    <text x="264" y="52" class="${index >= 3 ? "file light" : "file"}">${xml(item.file)}</text>
    <text x="264" y="94" class="${index >= 3 ? "hash light-muted" : "hash"}">SHA-256 ${xml(item.sha)}</text>
    <line x1="264" y1="124" x2="1264" y2="124" stroke="${index >= 3 ? "#52574e" : "#d6d8d0"}"/>
    <text x="264" y="168" class="${index >= 3 ? "boundary light" : "boundary"}">${xml(item.boundary)}</text>
  </g>`;
}).join("\n");

const case018 = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1580" viewBox="0 0 1440 1580" role="img" aria-labelledby="title desc">
  <title id="title">PF07 1.0.3 platform delivery entrypoints</title>
  <desc id="desc">Five exact public 1.0.3 packages, SHA-256 values, entrypoints, and honest validation boundaries.</desc>
  <style>
    text{font-family:"DejaVu Sans","Noto Sans KR",Arial,sans-serif;fill:#171a18}
    .eyebrow{font:700 16px "DejaVu Sans Mono",monospace;letter-spacing:2px;fill:#36513d}
    .title{font-size:52px;font-weight:800;letter-spacing:-2px}
    .subtitle{font-size:19px;fill:#555a52}
    .platform{font:800 18px "DejaVu Sans Mono",monospace}.entry{font:700 18px "DejaVu Sans Mono",monospace;fill:#36513d}
    .file{font-size:25px;font-weight:800}.hash{font:600 15px "DejaVu Sans Mono",monospace;fill:#555a52}
    .boundary{font:750 16px "DejaVu Sans Mono",monospace;letter-spacing:.4px;fill:#9c4f32}
    .light{fill:#f7f5ee}.light-muted{fill:#c8cbc3}.footer{font:650 14px "DejaVu Sans Mono",monospace;fill:#36513d}
  </style>
  <rect width="1440" height="1580" fill="#f4f0e6"/><path d="M0 0h1440v18H0z" fill="#36513d"/>
  <text x="72" y="82" class="eyebrow">PUBLIC DELIVERY / EXACT RELEASE BYTES</text>
  <text x="72" y="150" class="title">Choose the package for the environment.</text>
  <text x="72" y="198" class="subtitle">Native execution is claimed only where it was directly observed. Every hash below matches the public ${release.tag} release.</text>
  <text x="72" y="242" class="footer">${release.build} · ARTIFACT SET ${release.artifactSet}</text>
  ${packageRows}
  <rect x="72" y="1518" width="1296" height="42" rx="12" fill="#dce5d8"/>
  <text x="96" y="1545" class="footer">github.com/Cetacean916/oddroom-woo-orderops/releases/tag/${release.tag}</text>
</svg>
`;

const scoreItems = [
  ["FINAL CI", "SUCCESS", `RUN ${release.workflowRun} · JOB ${release.workflowJob}`],
  ["PUBLIC RELEASE", "10 / 10", "UNAUTHENTICATED NAME · SIZE · SHA-256 READBACK"],
  ["LINUX LOCAL", "5 / 5 READY", "CLEAN START · RECOVERY · RERUN"],
  ["LOCALES", "KO ↔ EN", "ONE RUNTIME · PRESERVED ORDER STATE"],
  ["RECOVERY", "503 → 200", "BOUNDED RETRY · SAME DURABLE EVENT"],
  ["CONNECTED MODE", "PASS", "n8n · HUBSPOT · SLACK · MASKED PUBLIC EVIDENCE"],
  ["BACKUP RESTORE", "PASS", "AUTHENTICATED ENCRYPTION · WRONG KEY REJECTED"],
  ["CONTROLLED UPDATE", "1.0.2 → 1.0.3", "PRESERVED SHOP · QUEUED ORDER COMPLETED ONCE"],
  ["LINUX SERVER", "PASS", "ISOLATED START · STOP · RECOVER · RERUN"],
  ["PUBLIC SOURCE", "4085e87", "TREE 214ee2e · REVIEWED BUILD INPUT"],
];

const scoreRows = scoreItems.map((item, index) => {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const x = 72 + column * 654;
  const y = 260 + row * 164;
  return `<g transform="translate(${x} ${y})">
    <rect width="630" height="140" rx="16" fill="${index === 1 ? "#d9e9d6" : "#ffffff"}" stroke="#252822" stroke-width="2"/>
    <text x="24" y="34" class="card-eye">${xml(item[0])}</text>
    <text x="24" y="79" class="card-value">${xml(item[1])}</text>
    <text x="24" y="113" class="card-note">${xml(item[2])}</text>
  </g>`;
}).join("\n");

const case019 = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1160" viewBox="0 0 1440 1160" role="img" aria-labelledby="title desc">
  <title id="title">PF07 1.0.3 observed validation scorecard</title>
  <desc id="desc">A public-safe scorecard of final CI, public release readback, Linux execution, recovery, connected mode, backup restore, and controlled update observations.</desc>
  <style>
    text{font-family:"DejaVu Sans","Noto Sans KR",Arial,sans-serif;fill:#171a18}
    .eyebrow{font:700 16px "DejaVu Sans Mono",monospace;letter-spacing:2px;fill:#ef8a67}
    .title{font-size:54px;font-weight:800;letter-spacing:-2px;fill:#f7f5ee}
    .subtitle{font-size:19px;fill:#c9ccc4}.meta{font:650 14px "DejaVu Sans Mono",monospace;fill:#aeb4aa}
    .card-eye{font:700 14px "DejaVu Sans Mono",monospace;letter-spacing:1.2px;fill:#36513d}
    .card-value{font-size:29px;font-weight:850}.card-note{font:650 12px "DejaVu Sans Mono",monospace;fill:#656a62}
    .footer{font:650 14px "DejaVu Sans Mono",monospace;fill:#dce5d8}
  </style>
  <rect width="1440" height="1160" fill="#171a18"/><path d="M0 0h1440v18H0z" fill="#ef8a67"/>
  <text x="72" y="78" class="eyebrow">OBSERVED VALIDATION / PUBLIC 1.0.3</text>
  <text x="72" y="148" class="title">Release facts that stay verifiable.</text>
  <text x="72" y="194" class="subtitle">Direct observations remain separate from native-platform claims that were not executed.</text>
  <text x="72" y="226" class="meta">${release.build} · ${release.tag}</text>
  ${scoreRows}
  <rect x="72" y="1090" width="1296" height="46" rx="12" fill="#36513d"/>
  <text x="96" y="1119" class="footer">CI ${release.workflowRun} · COMMIT ${release.commit.slice(0, 7)} · ARTIFACT SET ${release.artifactSet}</text>
</svg>
`;

await Promise.all([
  fs.writeFile(path.join(outputRoot, "CASE-018_platform-delivery-entrypoints.svg"), case018),
  fs.writeFile(path.join(outputRoot, "CASE-019_final-observation-scorecard.svg"), case019),
]);

const fontBytes = await fs.readFile(path.join(projectRoot, "assets/fonts/PretendardVariable.woff2"));
const fontUrl = `data:font/woff2;base64,${fontBytes.toString("base64")}`;
const recoveredBytes = await fs.readFile(path.join(projectRoot, "assets/media/pf07/current-ui/ko/operator-recovered-desktop.png"));
const hubBytes = await fs.readFile(path.join(projectRoot, "assets/media/pf07/current-ui/ko/runtime-hub-desktop.png"));
const recoveredUrl = `data:image/png;base64,${recoveredBytes.toString("base64")}`;
const hubUrl = `data:image/png;base64,${hubBytes.toString("base64")}`;

const sharedCss = `
  @font-face{font-family:PF07;src:url(${fontUrl}) format("woff2");font-weight:100 900}
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
  body{font-family:PF07,Arial,sans-serif;background:#f4f0e6;color:#171a18}
  .mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
`;

const case017Html = `<!doctype html><html lang="ko"><style>${sharedCss}
  body{padding:54px 58px 38px;border-top:18px solid #36513d}
  .top{display:flex;justify-content:space-between;gap:32px;align-items:flex-start}
  .eyebrow{margin:0 0 16px;color:#36513d;font:750 15px/1.2 ui-monospace,monospace;letter-spacing:2px}
  h1{margin:0;font-size:52px;line-height:1.05;letter-spacing:-2.3px}
  .identity{padding:14px 18px;background:#171a18;color:#f7f5ee;font-size:13px;line-height:1.7}
  .lead{margin:18px 0 26px;max-width:980px;color:#555a52;font-size:20px;line-height:1.55}
  .layout{display:grid;grid-template-columns:minmax(0,1.52fr) minmax(330px,.68fr);gap:18px}
  figure{margin:0;border:2px solid #252822;background:#fff;overflow:hidden}
  figure img{display:block;width:100%;height:650px;object-fit:cover;object-position:top}
  figcaption{padding:13px 16px;border-top:1px solid #c9cbc4;font-size:13px;font-weight:750}
  .side{display:grid;grid-template-rows:306px 1fr;gap:18px}
  .hub img{height:246px;object-fit:cover;object-position:top}.hub figcaption{height:56px}
  .facts{display:grid;grid-template-columns:1fr 1fr;border:2px solid #252822;background:#171a18;color:#f7f5ee}
  .fact{padding:22px 18px;border-right:1px solid #4b4f47;border-bottom:1px solid #4b4f47}
  .fact:nth-child(even){border-right:0}.fact:nth-last-child(-n+2){border-bottom:0}
  .fact span{display:block;color:#ef8a67;font:700 11px/1.3 ui-monospace,monospace;letter-spacing:1px}
  .fact strong{display:block;margin-top:11px;font-size:23px;line-height:1.15}
  .bottom{display:flex;justify-content:space-between;align-items:center;margin-top:22px;padding:16px 18px;background:#dce5d8;border:1px solid #36513d;font-size:14px}
  .bottom b{font-size:15px}.bottom code{font-size:12px}
</style><body>
  <div class="top"><div><p class="eyebrow">ACTUAL PUBLIC LINUX RUNTIME / RECOVERY</p><h1>복구된 주문과 준비된 서비스를<br>같은 공개 패키지에서 확인했습니다.</h1></div><div class="identity mono">${release.tag}<br>${release.build}<br>commit ${release.commit.slice(0, 7)}</div></div>
  <p class="lead">합성 주문의 실패 상태를 확인하고 같은 이벤트를 다시 처리해 recovered로 수렴시켰습니다. 오른쪽 허브는 같은 1.0.3 Linux 실행본의 Ready 상태입니다.</p>
  <div class="layout"><figure><img src="${recoveredUrl}" alt=""><figcaption>실제 운영 콘솔 · 같은 주문의 recovered 상태</figcaption></figure><div class="side"><figure class="hub"><img src="${hubUrl}" alt=""><figcaption>실제 패키지 허브 · Ready · 한국어 런타임</figcaption></figure><div class="facts">
    <div class="fact"><span>SERVICES</span><strong>5 / 5 ready</strong></div>
    <div class="fact"><span>RECOVERY</span><strong>503 → 200</strong></div>
    <div class="fact"><span>LOCALES</span><strong>KO ↔ EN</strong></div>
    <div class="fact"><span>RELEASE READBACK</span><strong>10 / 10</strong></div>
  </div></div></div>
  <div class="bottom"><b>합성 상품 · 합성 주문 · 0 KRW 비금전 경로</b><code>Linux SHA-256 ${packages[3].sha}</code></div>
</body></html>`;

const case020Html = `<!doctype html><html lang="en"><style>${sharedCss}
  body{padding:62px;background:#171a18;color:#f7f5ee;border-top:18px solid #ef8a67}
  .eyebrow{margin:0 0 16px;color:#ef8a67;font:750 15px/1.2 ui-monospace,monospace;letter-spacing:2px}
  h1{margin:0;max-width:900px;font-size:58px;line-height:1.02;letter-spacing:-2.5px}
  .lead{margin:18px 0 34px;max-width:1050px;color:#c7cac2;font-size:20px;line-height:1.5}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  article{min-height:220px;padding:28px;border:1px solid #55594f;background:#22251f}
  article.primary{background:#dce5d8;color:#171a18}
  article span{display:block;color:#ef8a67;font:750 12px/1.2 ui-monospace,monospace;letter-spacing:1.3px}
  article.primary span{color:#36513d}
  article strong{display:block;margin:17px 0 11px;font-size:32px;line-height:1.08}
  article p{margin:0;color:#bfc3ba;font-size:15px;line-height:1.55}
  article.primary p{color:#4e554d}
  article code{display:block;margin-top:17px;color:#aeb4aa;font-size:12px;overflow-wrap:anywhere}
  article.primary code{color:#36513d}
  .foot{display:flex;justify-content:space-between;gap:24px;margin-top:22px;padding:17px 20px;background:#36513d;color:#f7f5ee;font-size:13px}
</style><body>
  <p class="eyebrow">PUBLIC RELEASE / CI READBACK · FACT SUMMARY</p>
  <h1>Reviewed source, canonical packages,<br>and public bytes point to one release.</h1>
  <p class="lead">This panel reports facts from the final public manifest and unauthenticated release readback. It does not imitate a GitHub or native-platform interface.</p>
  <div class="grid">
    <article class="primary"><span>FINAL GITHUB ACTIONS</span><strong>SUCCESS</strong><p>Public workflow and test job completed on the reviewed source commit.</p><code>run ${release.workflowRun} · job ${release.workflowJob} · ${release.commit.slice(0, 7)}</code></article>
    <article><span>CANONICAL PROVENANCE ARTIFACT</span><strong>${release.canonicalArtifact}</strong><p>Actions artifact is provenance only; buyer delivery stays on GitHub Release assets.</p><code>wrapper SHA-256 ${release.canonicalWrapper}</code></article>
    <article><span>PUBLIC RELEASE ASSETS</span><strong>10 / 10 matched</strong><p>Name, size, and SHA-256 matched through unauthenticated public download.</p><code>${release.tag} · artifact set ${release.artifactSet}</code></article>
    <article><span>TAG TARGET</span><strong>${release.commit.slice(0, 7)} / ${release.tree.slice(0, 7)}</strong><p>The public tag resolves to the reviewed source commit and tree used for packaging.</p><code>build ${release.build}</code></article>
  </div>
  <div class="foot"><b>PUBLIC_PACKAGE_RELEASE_PASS</b><span class="mono">github.com/Cetacean916/oddroom-woo-orderops/releases/tag/${release.tag}</span></div>
</body></html>`;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PF07_CHROME_PATH || "/usr/bin/google-chrome",
});
try {
  for (const [name, html, width, height] of [
    ["CASE-017_final-clean-restore-rerun_ko.png", case017Html, 1440, 1200],
    ["CASE-020_final-ci-artifact.png", case020Html, 1440, 1000],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    try {
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(async () => { if (document.fonts) await document.fonts.ready; });
      await page.screenshot({ path: path.join(outputRoot, name), type: "png" });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const allowlist = JSON.parse(await fs.readFile(allowlistPath, "utf8"));
for (const entry of allowlist.exact_file_set || []) {
  entry.sha256 = sha256(await fs.readFile(path.join(refinementRoot, entry.relative_path)));
}
for (const row of allowlist.mapping_rows || []) {
  for (const file of row.files || []) {
    const absolute = path.join(refinementRoot, file.candidate_relative_path);
    const bytes = await fs.readFile(absolute);
    file.sha256 = sha256(bytes);
    if (file.media_type === "image/png") {
      file.dimensions_or_vector_view_box = {
        raster_dimensions: `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,
      };
    } else if (file.media_type === "image/svg+xml") {
      const source = bytes.toString("utf8");
      const width = source.match(/<svg\b[^>]*\bwidth="([^"]+)"/i)?.[1];
      const height = source.match(/<svg\b[^>]*\bheight="([^"]+)"/i)?.[1];
      const viewBox = source.match(/<svg\b[^>]*\bviewBox="([^"]+)"/i)?.[1];
      if (width && height && viewBox) {
        file.dimensions_or_vector_view_box = {
          width,
          height,
          view_box: viewBox,
        };
      }
    }
  }
}
for (const support of allowlist.support_files || []) {
  support.sha256 = sha256(await fs.readFile(path.join(refinementRoot, support.candidate_relative_path)));
}
await fs.writeFile(allowlistPath, `${JSON.stringify(allowlist, null, 2)}\n`);

const results = {};
for (const filename of [
  "CASE-017_final-clean-restore-rerun_ko.png",
  "CASE-018_platform-delivery-entrypoints.svg",
  "CASE-019_final-observation-scorecard.svg",
  "CASE-020_final-ci-artifact.png",
]) {
  const bytes = await fs.readFile(path.join(outputRoot, filename));
  results[filename] = { bytes: bytes.length, sha256: sha256(bytes) };
}
process.stdout.write(`${JSON.stringify({
  schema: "pf07.release-evidence-build-result.v1",
  release_tag: release.tag,
  build_id: release.build,
  assets: results,
}, null, 2)}\n`);
