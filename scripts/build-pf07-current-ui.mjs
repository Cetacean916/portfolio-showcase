#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const [ledgerInput, publicAssetInput, buildInput, currentUiInput] = process.argv.slice(2);
if (!ledgerInput || !publicAssetInput || !buildInput || !currentUiInput) {
  throw new Error("usage: node scripts/build-pf07-current-ui.mjs LEDGER PUBLIC_ASSET_ROOT FINAL_BUILD_ROOT SHOWCASE_CURRENT_UI_ROOT");
}

const ledgerPath = path.resolve(ledgerInput);
const publicAssetRoot = path.resolve(publicAssetInput);
const buildRoot = path.resolve(buildInput);
const currentUiRoot = path.resolve(currentUiInput);
if (path.basename(currentUiRoot) !== "current-ui") throw new Error("refusing a current UI output root not named current-ui");

const artifactSetPath = path.join(buildRoot, "ARTIFACT-MANIFEST.json");
const linuxPackageManifestPath = path.join(buildRoot, "packages", "PF07-OrderOps-1.0.2-linux-x86_64", "ARTIFACT-MANIFEST.json");
const sourcePublicManifestPath = path.join(publicAssetRoot, "PUBLIC-ASSET-MANIFEST.txt");
const captureBuilderPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../유형별 포트폴리오/07-OddRoom-Woo-OrderOps/scripts/capture-final-stills.mjs");
const outputManifestPath = path.join(path.dirname(currentUiRoot), "current-ui-manifest.json");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const mappings = [
  ["KO-HOME-DESKTOP", "ko/storefront-home-desktop.png", "ko", "storefront-home-desktop", "/", "own-ui-captures/after-completion/CASE-005_storefront-desktop_ko.png"],
  ["KO-HOME-MOBILE", "ko/storefront-home-mobile.png", "ko", "storefront-home-mobile", "/", "own-ui-captures/after-completion/CASE-006_storefront-mobile_ko.png"],
  ["KO-SHOP-DESKTOP", "ko/storefront-shop-desktop.png", "ko", "storefront-shop-desktop", "/shop/", "own-ui-captures/after-completion/CASE-005_storefront-shop-desktop_ko.png"],
  ["KO-PRODUCT-DESKTOP", "ko/product-detail-desktop.png", "ko", "product-detail-desktop", "/product/foldline-tech-case/", "own-ui-captures/after-completion/CASE-008_variable-product_ko.png"],
  ["KO-ADMIN-DESKTOP", "ko/operator-console-desktop.png", "ko", "operator-console-desktop", "/wp-admin/admin.php?page=oddroom-orderops", "own-ui-captures/after-completion/CASE-010_operator-console_ko.png"],
  ["KO-HUB-DESKTOP", "ko/runtime-hub-desktop.png", "ko", "runtime-hub-desktop", "package://launcher-hub/", "own-ui-captures/after-completion/GUIDE-005_linux-install-run_ko.png"],
  ["KO-CART-DESKTOP", "ko/cart-desktop.png", "ko", "cart-desktop", "/cart/", "own-ui-captures/after-completion/CASE-009_cart_ko.png"],
  ["KO-CHECKOUT-DESKTOP", "ko/checkout-desktop.png", "ko", "checkout-desktop", "/checkout/", "own-ui-captures/after-completion/CASE-009_checkout_ko.png"],
  ["EN-HOME-DESKTOP", "en/storefront-home-desktop.png", "en", "storefront-home-desktop", "/", "own-ui-captures/after-completion/CASE-007_storefront-desktop_en.png"],
  ["EN-HOME-MOBILE", "en/storefront-home-mobile.png", "en", "storefront-home-mobile", "/", "own-ui-captures/after-completion/CASE-007_storefront-mobile_en.png"],
  ["EN-SHOP-DESKTOP", "en/storefront-shop-desktop.png", "en", "storefront-shop-desktop", "/shop/", "own-ui-captures/after-completion/CASE-007_storefront-shop-desktop_en.png"],
  ["EN-PRODUCT-DESKTOP", "en/product-detail-desktop.png", "en", "product-detail-desktop", "/product/foldline-tech-case/", "own-ui-captures/after-completion/CASE-008_variable-product_en.png"],
  ["EN-ADMIN-DESKTOP", "en/operator-console-desktop.png", "en", "operator-console-desktop", "/wp-admin/admin.php?page=oddroom-orderops", "own-ui-captures/after-completion/CASE-010_operator-console_en.png"],
  ["EN-HUB-DESKTOP", "en/runtime-hub-desktop.png", "en", "runtime-hub-desktop", "package://launcher-hub/", "own-ui-captures/after-completion/GUIDE-005_linux-install-run_en.png"],
];

const [ledgerBytes, artifactSetBytes, linuxPackageManifestBytes, sourcePublicManifestBytes, captureBuilderBytes] = await Promise.all([
  fs.readFile(ledgerPath),
  fs.readFile(artifactSetPath),
  fs.readFile(linuxPackageManifestPath),
  fs.readFile(sourcePublicManifestPath),
  fs.readFile(captureBuilderPath),
]);
const ledger = JSON.parse(ledgerBytes.toString("utf8"));
const artifactSet = JSON.parse(artifactSetBytes.toString("utf8"));
if (ledger.schema !== "pf07.final-public-asset-ledger.v1" || ledger.ledger_state !== "FINAL"
  || ledger.inventory_id_count !== 71 || ledger.accepted_public_id_count !== 71) {
  throw new Error("PF07 source asset ledger identity failed");
}
if (artifactSet.schema !== "pf07.artifact-set-manifest.v1" || artifactSet.package_version !== "1.0.2"
  || artifactSet.build_id !== "pf07-build-b99af2ac12d22b464865") {
  throw new Error("PF07 final artifact-set identity failed");
}

const ledgerFiles = new Map();
for (const row of ledger.rows || []) {
  for (const file of row.files || []) ledgerFiles.set(file.final_relative_path, { row, file });
}

const prepared = [];
for (const [assetId, filename, locale, surface, sourceRoute, sourceRelativePath] of mappings) {
  const source = ledgerFiles.get(sourceRelativePath);
  if (!source) throw new Error(`source asset is not ledger-bound: ${sourceRelativePath}`);
  const bytes = await fs.readFile(path.join(publicAssetRoot, sourceRelativePath));
  if (sha256(bytes) !== source.file.sha256) throw new Error(`source asset hash mismatch: ${sourceRelativePath}`);
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`source asset is not PNG: ${sourceRelativePath}`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const chunks = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    chunks.push(bytes.subarray(offset + 4, offset + 8).toString("ascii"));
    offset += 12 + length;
  }
  if (chunks.some((type) => ["tEXt", "zTXt", "iTXt", "eXIf"].includes(type))) {
    throw new Error(`source asset contains public-forbidden PNG metadata: ${sourceRelativePath}`);
  }
  prepared.push({
    asset_id: assetId,
    filename,
    locale,
    surface,
    source_route: sourceRoute,
    source_asset_id: source.row.ASSET_ID,
    source_ledger_relative_path: sourceRelativePath,
    transformation: "byte-for-byte-copy",
    direct_review_result: source.row.review_result,
    width,
    height,
    bytes: bytes.length,
    sha256: sha256(bytes),
    payload: bytes,
  });
}

await fs.rm(currentUiRoot, { recursive: true, force: true });
for (const asset of prepared) {
  const destination = path.join(currentUiRoot, asset.filename);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, asset.payload, { flag: "wx" });
}

const assets = prepared.map(({ payload, ...asset }) => asset);
const manifest = {
  schema: "pf07.current-ui-manifest.v2",
  state: "CURRENT_REFERENCE_APPLIED",
  classification: "PUBLIC_SANITIZED_RUNTIME_CAPTURE",
  package_build_id: artifactSet.build_id,
  package_version: artifactSet.package_version,
  artifact_set_sha256: sha256(artifactSetBytes),
  linux_package_manifest_sha256: sha256(linuxPackageManifestBytes),
  capture_builder: "scripts/capture-final-stills.mjs",
  capture_builder_sha256: sha256(captureBuilderBytes),
  source_asset_ledger_sha256: sha256(ledgerBytes),
  source_public_asset_manifest_sha256: sha256(sourcePublicManifestBytes),
  exact_file_count: assets.length,
  locale_asset_counts: { ko: assets.filter((asset) => asset.locale === "ko").length, en: assets.filter((asset) => asset.locale === "en").length },
  assets,
};
await fs.writeFile(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  schema: manifest.schema,
  package_build_id: manifest.package_build_id,
  exact_file_count: manifest.exact_file_count,
  locale_asset_counts: manifest.locale_asset_counts,
  manifest_sha256: sha256(await fs.readFile(outputManifestPath)),
}, null, 2)}\n`);
