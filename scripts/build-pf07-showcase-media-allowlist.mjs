#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ledgerPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const publicAssetRoot = process.argv[3] ? path.resolve(process.argv[3]) : null;
const showcasePf07Root = process.argv[4] ? path.resolve(process.argv[4]) : null;
if (!ledgerPath || !publicAssetRoot || !showcasePf07Root) {
  console.error("usage: node scripts/build-pf07-showcase-media-allowlist.mjs LEDGER PUBLIC_ASSET_ROOT SHOWCASE_PF07_MEDIA_ROOT");
  process.exit(64);
}

const refinementRoot = path.join(showcasePf07Root, "refinement");
const outputPath = path.join(showcasePf07Root, "media-allowlist.json");
const ledger = JSON.parse(await fs.readFile(ledgerPath, "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

async function filesBelow(root) {
  const files = [];
  const walk = async (directory) => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  };
  await walk(root);
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

if (ledger.schema !== "pf07.final-public-asset-ledger.v1" || ledger.inventory_id_count !== 71 || ledger.ledger_id_count !== 71) {
  throw new Error("PF07 asset ledger identity failed");
}
const sourceFiles = await filesBelow(publicAssetRoot);
const showcaseFiles = await filesBelow(refinementRoot);
if (JSON.stringify(sourceFiles) !== JSON.stringify(ledger.public_file_set)) {
  throw new Error("asset ledger public file set differs from its declared root");
}
if (JSON.stringify(showcaseFiles) !== JSON.stringify(sourceFiles)) {
  throw new Error("showcase refinement media is not an exact copy of the accepted asset root");
}

const fileHashes = {};
for (const relativePath of sourceFiles) {
  const [sourceBytes, showcaseBytes] = await Promise.all([
    fs.readFile(path.join(publicAssetRoot, relativePath)),
    fs.readFile(path.join(refinementRoot, relativePath)),
  ]);
  const sourceHash = sha256(sourceBytes);
  const showcaseHash = sha256(showcaseBytes);
  if (sourceHash !== showcaseHash) throw new Error(`showcase byte mismatch: ${relativePath}`);
  fileHashes[relativePath] = sourceHash;
}

const mappingRows = ledger.rows.map((row) => ({
  ASSET_ID: row.ASSET_ID,
  visibility: row.visibility,
  language: row.language,
  role_state: row.role_state,
  review_result: row.review_result,
  candidate_relative_paths: row.final_relative_paths,
  files: row.files.map((file) => ({
    candidate_relative_path: file.final_relative_path,
    media_type: file.media_type,
    dimensions_or_vector_view_box: file.dimensions_or_vector_view_box,
    sha256: file.sha256,
  })),
}));

const allowlist = {
  schema: "pf07.showcase-media-allowlist.v1",
  candidate_state: ledger.ledger_state === "FINAL" ? "FINAL" : "PROVISIONAL_PRE_FREEZE",
  final_completion_claim: ledger.final_completion_claim,
  declared_root: "refinement",
  path_resolution: "Resolve every candidate_relative_path against declared_root, relative to this allowlist.",
  inventory_id_count: ledger.inventory_id_count,
  mapped_public_id_count: ledger.accepted_public_id_count,
  deferred_id_count: ledger.deferred_id_count,
  deferred_ids: ledger.deferred_ids,
  showcase_only_post_candidate_ids: ["CASE-017", "CASE-018", "CASE-019", "CASE-020"],
  mapping_rows: mappingRows,
  support_files: ledger.support_files.map((file) => ({
    candidate_relative_path: file.relative_path,
    classification: file.classification,
    sha256: file.sha256,
  })),
  exact_file_count: showcaseFiles.length,
  exact_file_set: showcaseFiles.map((relativePath) => ({ relative_path: relativePath, sha256: fileHashes[relativePath] })),
};
await fs.writeFile(outputPath, `${JSON.stringify(allowlist, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  candidate_state: allowlist.candidate_state,
  mapped_public_ids: allowlist.mapped_public_id_count,
  deferred_ids: allowlist.deferred_id_count,
  exact_files: allowlist.exact_file_count,
  allowlist_sha256: sha256(await fs.readFile(outputPath)),
}, null, 2)}\n`);
