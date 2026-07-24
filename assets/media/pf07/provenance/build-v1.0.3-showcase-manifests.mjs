#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const mediaRoot = path.join(projectRoot, "assets/media/pf07");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const toPosix = (value) => value.split(path.sep).join("/");

const release = {
  package_version: "1.0.3",
  release_tag: "pf07-v1.0.3",
  immutable_predecessor_tag: "pf07-v1.0.2",
  source_commit: "4085e87f5d221d36ba5a58e859f12806e4b10d36",
  source_tree: "214ee2e8773a1f6109641869f06a8d13d4cd5310",
  package_build_id: "pf07-build-c14f8fe0b8e95bea97bf",
  artifact_set_sha256: "74b458a861d51da2e681b1201f138527731a2b87cde38f2f5f47438b3d20833e",
  release_manifest_sha256: "2880647f7d40e98f6af0c53eefa392941d9af01cc2efb50bcf46fc54c0b41b89",
  linux_package_filename: "pf07-linux-x86_64-1.0.3.tar.gz",
  linux_package_sha256: "cd60c8b6b280f1347123262d4895b0fdf53e8d6de07eb59020d57fb8c4c67f2e",
  linux_package_manifest_sha256: "4507f33a5c79d8fdf019023fecbcffc8664c2e8078a1edbfd88b83d6d37e43aa",
};

const scriptFiles = {
  still_capture: "assets/media/pf07/provenance/capture-final-stills.mjs",
  retry_state_capture: "assets/media/pf07/provenance/capture-v1.0.3-retry-state.mjs",
  ko_recording_capture: "assets/media/pf07/provenance/record-public-media-ko-capture.mjs",
  current_recording_capture: "assets/media/pf07/provenance/record-public-media.mjs",
  release_evidence_builder: "assets/media/pf07/provenance/build-v1.0.3-release-evidence.mjs",
};

const scriptCommitments = {};
for (const [id, relative] of Object.entries(scriptFiles)) {
  const bytes = await fs.readFile(path.join(projectRoot, relative));
  scriptCommitments[id] = { file: relative, sha256: sha256(bytes) };
}

const run = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed: ${(result.stderr || result.stdout || "unknown error").trim()}`);
  }
  return result.stdout;
};

const probeVideo = (absolute) => {
  const parsed = JSON.parse(run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-count_frames",
    "-show_entries", "stream=codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames:format=duration,size",
    "-of", "json",
    absolute,
  ]));
  const stream = parsed.streams?.[0];
  const format = parsed.format;
  if (!stream || !format) throw new Error(`missing ffprobe stream: ${absolute}`);
  return {
    codec: stream.codec_name,
    pixel_format: stream.pix_fmt,
    width: Number(stream.width),
    height: Number(stream.height),
    average_frame_rate: stream.avg_frame_rate,
    frame_count: Number(stream.nb_read_frames),
    duration_seconds: Number(Number(format.duration).toFixed(3)),
    bytes: Number(format.size),
  };
};

const pngInfo = (bytes) => {
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("invalid PNG signature");
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes: bytes.length,
  };
};

const stillSpecs = [
  ["storefront-home-desktop.png", "storefront-home-desktop", "/", "still_capture"],
  ["storefront-home-mobile.png", "storefront-home-mobile", "/", "still_capture"],
  ["storefront-shop-desktop.png", "storefront-shop-desktop", "/shop/", "still_capture"],
  ["product-detail-desktop.png", "product-detail-desktop", "/product/foldline-tech-case/", "still_capture"],
  ["cart-desktop.png", "cart-desktop", "/cart/", "still_capture"],
  ["checkout-desktop.png", "checkout-desktop", "/checkout/", "still_capture"],
  ["order-complete-desktop.png", "order-complete-desktop", "/checkout/order-received/:synthetic-order", "still_capture"],
  ["operator-console-desktop.png", "operator-console-desktop", "/wp-admin/admin.php?page=oddroom-orderops", "still_capture"],
  ["runtime-hub-desktop.png", "runtime-hub-desktop", "package-hub:/", "still_capture"],
  ["operator-failed-desktop.png", "operator-failed-desktop", "/wp-admin/admin.php?page=oddroom-orderops", "localized_recording"],
  ["operator-retrying-desktop.png", "operator-retrying-desktop", "/wp-admin/admin.php?page=oddroom-orderops", "retry_state_capture"],
  ["operator-recovered-desktop.png", "operator-recovered-desktop", "/wp-admin/admin.php?page=oddroom-orderops", "localized_recording"],
];

const stillAssets = [];
for (const locale of ["ko", "en"]) {
  for (const [basename, surface, sourceRoute, sourceKind] of stillSpecs) {
    const filename = `${locale}/${basename}`;
    const bytes = await fs.readFile(path.join(mediaRoot, "current-ui", filename));
    const captureAuthority = sourceKind === "retry_state_capture"
      ? scriptCommitments.retry_state_capture
      : sourceKind === "localized_recording"
        ? scriptCommitments[locale === "ko" ? "ko_recording_capture" : "current_recording_capture"]
        : scriptCommitments.still_capture;
    stillAssets.push({
      asset_id: `PF07-CURRENT-${locale.toUpperCase()}-${surface.toUpperCase().replaceAll("-", "_")}`,
      filename,
      locale,
      runtime_locale: locale === "ko" ? "ko_KR" : "en_US",
      surface,
      source_route: sourceRoute,
      source_kind: sourceKind,
      capture_authority: captureAuthority.file,
      capture_authority_sha256: captureAuthority.sha256,
      transformation: "capture-promoted-without-pixel-mutation",
      direct_review_result: "ACCEPTED_STEP050_DIRECT_REVIEW",
      metadata_stripped: true,
      ...pngInfo(bytes),
      sha256: sha256(bytes),
    });
  }
}

const currentUiManifest = {
  schema: "pf07.current-ui-manifest.v3",
  state: "CURRENT_RELEASE_BOUND",
  case_id: "pf07",
  classification: "PUBLIC_SANITIZED_RUNTIME_CAPTURE",
  metadata_stripped: true,
  release,
  capture_authorities: scriptCommitments,
  exact_file_count: stillAssets.length,
  locale_asset_counts: { ko: 12, en: 12 },
  assets: stillAssets,
};

const recordingProofs = {};
for (const locale of ["ko", "en"]) {
  const relative = `assets/media/pf07/proof/${locale}-recording-proof.json`;
  const bytes = await fs.readFile(path.join(projectRoot, relative));
  const parsed = JSON.parse(bytes.toString("utf8"));
  recordingProofs[locale] = {
    file: relative,
    sha256: sha256(bytes),
    runtime_locale: parsed.runtime_locale,
    recording_script_sha256: parsed.recording_script_sha256,
    purchase_video_sha256: parsed.videos?.["demo-video.mp4"]?.sha256,
    recovery_video_sha256: parsed.videos?.["recovery-clip.mp4"]?.sha256,
  };
}

const executionProof = {
  schema: "pf07.localized-showcase-execution-proof.v2",
  case_id: "pf07",
  classification: "PUBLIC_SANITIZED_EXECUTION_PROOF",
  metadata_stripped: true,
  release,
  final_linux_package_preflight: "PASS",
  synthetic_checkout_window_prepared_via_wp_cli: true,
  exact_runtime_locale_count: 2,
  recording_proofs: recordingProofs,
  capture_authorities: scriptCommitments,
  retry_wait_observation: {
    state: "retry_wait",
    http_status: 503,
    attempt: 1,
    capture_authority: scriptCommitments.retry_state_capture.file,
    capture_authority_sha256: scriptCommitments.retry_state_capture.sha256,
    assets: Object.fromEntries(
      stillAssets
        .filter((asset) => asset.surface === "operator-retrying-desktop")
        .map((asset) => [asset.locale, {
          file: `assets/media/pf07/current-ui/${asset.filename}`,
          sha256: asset.sha256,
        }]),
    ),
  },
};

const executionProofPath = path.join(mediaRoot, "execution-proof.json");
const executionProofBytes = Buffer.from(`${JSON.stringify(executionProof, null, 2)}\n`);
await fs.writeFile(executionProofPath, executionProofBytes);

const roles = {
  "guided-overview": {
    role: "guided_overview",
    outcome: "storefront_to_operator_handoff",
    duration_contract_seconds: { minimum: 30, maximum: 45 },
  },
  "purchase-delivery": {
    role: "purchase_delivery",
    outcome: "product_selection_to_completed_order_handoff",
    duration_contract_seconds: { minimum: 60, maximum: 90 },
  },
  "failure-recovery": {
    role: "failure_recovery",
    outcome: "failed_order_to_manual_retry_and_recovered",
    duration_contract_seconds: { minimum: 8, maximum: 30 },
  },
};

const mediaAssets = [];
for (const locale of ["ko", "en"]) {
  for (const slug of Object.keys(roles)) {
    const videoRelative = `videos/${locale}/${slug}.mp4`;
    const videoBytes = await fs.readFile(path.join(mediaRoot, videoRelative));
    const proofRelative = `assets/media/pf07/proof/${locale}-recording-proof.json`;
    const video = {
      asset_id: `PF07-VIDEO-${locale.toUpperCase()}-${slug.toUpperCase().replaceAll("-", "_")}`,
      file: `assets/media/pf07/${videoRelative}`,
      kind: "video",
      locale,
      runtime_locale: locale === "ko" ? "ko_KR" : "en_US",
      ...roles[slug],
      continuous_runtime_capture: true,
      source_proof: proofRelative,
      source_proof_sha256: recordingProofs[locale].sha256,
      metadata_stripped: true,
      ...probeVideo(path.join(mediaRoot, videoRelative)),
      sha256: sha256(videoBytes),
    };
    if (slug === "guided-overview") {
      video.derived_from = `assets/media/pf07/videos/${locale}/purchase-delivery.mp4`;
      video.transformation = "continuous-time-compression:setpts=0.64*PTS";
    } else {
      video.proof_video_key = slug === "purchase-delivery" ? "demo-video.mp4" : "recovery-clip.mp4";
      video.transformation = "byte-for-byte-promotion-from-localized-recording";
    }
    mediaAssets.push(video);

    const posterRelative = `posters/${locale}/${slug}.png`;
    const posterBytes = await fs.readFile(path.join(mediaRoot, posterRelative));
    mediaAssets.push({
      asset_id: `PF07-POSTER-${locale.toUpperCase()}-${slug.toUpperCase().replaceAll("-", "_")}`,
      file: `assets/media/pf07/${posterRelative}`,
      kind: "poster",
      locale,
      ...roles[slug],
      source_video: video.file,
      review_result: "ACCEPTED_STEP050_DIRECT_REVIEW",
      metadata_stripped: true,
      ...pngInfo(posterBytes),
      sha256: sha256(posterBytes),
    });

    const captionRelative = `captions/${locale}/${slug}.vtt`;
    const captionBytes = await fs.readFile(path.join(mediaRoot, captionRelative));
    mediaAssets.push({
      asset_id: `PF07-CAPTIONS-${locale.toUpperCase()}-${slug.toUpperCase().replaceAll("-", "_")}`,
      file: `assets/media/pf07/${captionRelative}`,
      kind: "captions",
      format: "WEBVTT",
      locale,
      ...roles[slug],
      source_video: video.file,
      bytes: captionBytes.length,
      sha256: sha256(captionBytes),
    });
  }
  mediaAssets.push({
    asset_id: `PF07-PROOF-${locale.toUpperCase()}-RECORDING`,
    file: recordingProofs[locale].file,
    kind: "recording_proof",
    locale,
    runtime_locale: recordingProofs[locale].runtime_locale,
    recording_script_sha256: recordingProofs[locale].recording_script_sha256,
    bytes: (await fs.stat(path.join(projectRoot, recordingProofs[locale].file))).size,
    sha256: recordingProofs[locale].sha256,
  });
}

const mediaManifest = {
  schema: "pf07.localized-showcase-media-manifest.v2",
  state: "CURRENT_RELEASE_BOUND",
  case_id: "pf07",
  classification: "PUBLIC_SANITIZED_LOCALIZED_RUNTIME_MEDIA",
  metadata_stripped: true,
  registration_manifest_case_count: 6,
  release,
  execution_proof: {
    file: "assets/media/pf07/execution-proof.json",
    sha256: sha256(executionProofBytes),
  },
  capture_authorities: scriptCommitments,
  exact_asset_count: mediaAssets.length,
  locale_asset_counts: { ko: 10, en: 10 },
  assets: mediaAssets,
};

await Promise.all([
  fs.writeFile(
    path.join(mediaRoot, "current-ui-manifest.json"),
    `${JSON.stringify(currentUiManifest, null, 2)}\n`,
  ),
  fs.writeFile(
    path.join(mediaRoot, "media-manifest.json"),
    `${JSON.stringify(mediaManifest, null, 2)}\n`,
  ),
]);

process.stdout.write(`${JSON.stringify({
  schema: "pf07.showcase-manifest-build-result.v1",
  project_root: toPosix(projectRoot),
  release_tag: release.release_tag,
  current_ui_asset_count: stillAssets.length,
  localized_media_asset_count: mediaAssets.length,
  execution_proof_sha256: sha256(executionProofBytes),
}, null, 2)}\n`);
