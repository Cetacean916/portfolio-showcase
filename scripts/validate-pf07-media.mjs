import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

const requireCondition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = (command, args, encoding = null) => {
  const result = spawnSync(command, args, {
    encoding,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const error = encoding ? result.stderr : result.stderr?.toString("utf8");
    throw new Error(`${path.basename(command)} failed: ${(error || "unknown error").trim()}`);
  }
  return result.stdout;
};

const probeVideo = (videoPath) => JSON.parse(run("ffprobe", [
  "-v", "error",
  "-select_streams", "v:0",
  "-count_frames",
  "-show_entries", "stream=codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames:format=duration,size:format_tags",
  "-of", "json",
  videoPath,
], "utf8"));

const decodeVideo = (videoPath) => {
  run("ffmpeg", ["-v", "error", "-i", videoPath, "-map", "0:v:0", "-f", "null", "-"]);
};

const frameAt = (videoPath, seconds) => run("ffmpeg", [
  "-hide_banner", "-loglevel", "error",
  "-i", videoPath,
  "-ss", String(seconds),
  "-frames:v", "1",
  "-f", "image2pipe",
  "-vcodec", "png",
  "-",
]);

const sampleDynamics = (videoPath) => {
  const output = run("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-i", videoPath,
    "-vf", "fps=1,scale=160:90,format=gray",
    "-f", "framemd5",
    "-",
  ]).toString("utf8");
  const hashes = output.split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(",").at(-1).trim());
  return { sampled: hashes.length, unique: new Set(hashes).size };
};

const expectedRelease = {
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

const expectedTimelines = {
  "purchase-delivery.mp4": [
    ["LAUNCH_HUB", "final_package_hub_ready"],
    ["LIVE_STOREFRONT", "home_visible"],
    ["SHOP_OPENED", "shop_visible"],
    ["PRODUCT_SELECTED", "product_page_visible"],
    ["CART_READY", "cart_contains_product"],
    ["CHECKOUT_INPUT", "synthetic_checkout_input_visible"],
    ["ORDER_RECEIVED", "woocommerce_confirmation_visible"],
    ["OUTBOX_PENDING", "status_pending"],
    ["WORKER_RUN", "visible_terminal_foreground_worker_exit_zero"],
    ["ADMIN_COMPLETED", "status_completed"],
    ["INTEGRATION_RESULT", "masked_integration_correlation_visible"],
  ],
  "failure-recovery.mp4": [
    ["OUTBOX_PENDING", "status_pending"],
    ["FAILURE_WORKER_RUN", "visible_terminal_failure_worker_exit_zero"],
    ["FAILED", "status_failed_manual_retry_visible"],
    ["NORMAL_SCENARIO", "actual_hub_normal_scenario_applied"],
    ["MANUAL_RETRY", "manual_retry_scheduled_pending"],
    ["RECOVERY_WORKER_RUN", "visible_terminal_recovery_worker_exit_zero"],
    ["RECOVERED", "status_recovered"],
  ],
};

const roles = {
  "guided-overview": {
    role: "guided_overview",
    minimum: 30,
    maximum: 45,
  },
  "purchase-delivery": {
    role: "purchase_delivery",
    minimum: 60,
    maximum: 90,
  },
  "failure-recovery": {
    role: "failure_recovery",
    minimum: 8,
    maximum: 30,
  },
};

const forbiddenMetadataKeys = new Set([
  "artist", "author", "comment", "copyright", "creation_time", "description",
  "encoded_by", "location", "location-eng", "title",
]);

const hasForbiddenJsonValue = (source) => (
  /\/home\/|file:\/\/|xox[baprs]-|gh[pousr]_|AKIA[0-9A-Z]{16}/i.test(source)
);

const parseVttTimestamp = (value) => {
  const parts = value.trim().split(":").map(Number);
  requireCondition(parts.length === 2 || parts.length === 3, `invalid WebVTT timestamp: ${value}`);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

const validatePng = (bytes, asset, label) => {
  requireCondition(bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", `${label}: PNG signature failed`);
  requireCondition(bytes.readUInt32BE(16) === asset.width
    && bytes.readUInt32BE(20) === asset.height
    && bytes.length === asset.bytes
    && sha256(bytes) === asset.sha256, `${label}: PNG byte commitment failed`);
  const chunks = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    chunks.push(bytes.subarray(offset + 4, offset + 8).toString("ascii"));
    offset += 12 + length;
  }
  requireCondition(!chunks.some((type) => ["tEXt", "zTXt", "iTXt", "eXIf"].includes(type)), `${label}: PNG metadata remains`);
};

export async function validatePf07ExecutionMedia({ mediaRoot }) {
  const projectRoot = path.resolve(mediaRoot, "../../..");
  const [manifestBytes, proofBytes, currentUiBytes] = await Promise.all([
    fs.readFile(path.join(mediaRoot, "media-manifest.json")),
    fs.readFile(path.join(mediaRoot, "execution-proof.json")),
    fs.readFile(path.join(mediaRoot, "current-ui-manifest.json")),
  ]);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const proof = JSON.parse(proofBytes.toString("utf8"));
  const currentUi = JSON.parse(currentUiBytes.toString("utf8"));

  requireCondition(manifest.schema === "pf07.localized-showcase-media-manifest.v2"
    && manifest.state === "CURRENT_RELEASE_BOUND"
    && manifest.case_id === "pf07"
    && manifest.classification === "PUBLIC_SANITIZED_LOCALIZED_RUNTIME_MEDIA"
    && manifest.metadata_stripped === true
    && manifest.registration_manifest_case_count === 6, "localized media manifest identity failed");
  requireCondition(proof.schema === "pf07.localized-showcase-execution-proof.v2"
    && proof.case_id === "pf07"
    && proof.classification === "PUBLIC_SANITIZED_EXECUTION_PROOF"
    && proof.metadata_stripped === true, "aggregate execution proof identity failed");
  requireCondition(!Object.hasOwn(proof, "status") && !Object.hasOwn(proof, "result"), "execution proof must not self-declare PASS");
  requireCondition(currentUi.schema === "pf07.current-ui-manifest.v3"
    && currentUi.state === "CURRENT_RELEASE_BOUND"
    && currentUi.case_id === "pf07", "current UI manifest is not release-bound");
  requireCondition(JSON.stringify(manifest.release) === JSON.stringify(expectedRelease)
    && JSON.stringify(proof.release) === JSON.stringify(expectedRelease)
    && JSON.stringify(currentUi.release) === JSON.stringify(expectedRelease), "1.0.3 release identity commitment failed");
  requireCondition(!hasForbiddenJsonValue(manifestBytes.toString("utf8"))
    && !hasForbiddenJsonValue(proofBytes.toString("utf8"))
    && !hasForbiddenJsonValue(currentUiBytes.toString("utf8")), "public PF07 manifest contains a protected locator or token");

  const proofHash = sha256(proofBytes);
  requireCondition(manifest.execution_proof?.file === "assets/media/pf07/execution-proof.json"
    && manifest.execution_proof?.sha256 === proofHash, "aggregate execution proof hash commitment failed");
  requireCondition(proof.final_linux_package_preflight === "PASS"
    && proof.synthetic_checkout_window_prepared_via_wp_cli === true
    && proof.exact_runtime_locale_count === 2, "aggregate execution preflight boundary failed");

  const expectedScripts = {
    still_capture: "assets/media/pf07/provenance/capture-final-stills.mjs",
    retry_state_capture: "assets/media/pf07/provenance/capture-v1.0.3-retry-state.mjs",
    ko_recording_capture: "assets/media/pf07/provenance/record-public-media-ko-capture.mjs",
    current_recording_capture: "assets/media/pf07/provenance/record-public-media.mjs",
    release_evidence_builder: "assets/media/pf07/provenance/build-v1.0.3-release-evidence.mjs",
  };
  for (const [id, relative] of Object.entries(expectedScripts)) {
    const bytes = await fs.readFile(path.join(projectRoot, relative));
    const expectedHash = sha256(bytes);
    requireCondition(manifest.capture_authorities?.[id]?.file === relative
      && manifest.capture_authorities?.[id]?.sha256 === expectedHash
      && proof.capture_authorities?.[id]?.file === relative
      && proof.capture_authorities?.[id]?.sha256 === expectedHash
      && currentUi.capture_authorities?.[id]?.file === relative
      && currentUi.capture_authorities?.[id]?.sha256 === expectedHash, `${id}: capture authority commitment failed`);
  }

  const expectedMediaFiles = [];
  for (const locale of ["ko", "en"]) {
    for (const slug of Object.keys(roles)) {
      expectedMediaFiles.push(
        `assets/media/pf07/videos/${locale}/${slug}.mp4`,
        `assets/media/pf07/posters/${locale}/${slug}.png`,
        `assets/media/pf07/captions/${locale}/${slug}.vtt`,
      );
    }
    expectedMediaFiles.push(`assets/media/pf07/proof/${locale}-recording-proof.json`);
  }
  expectedMediaFiles.sort();
  const declaredFiles = (manifest.assets || []).map((asset) => asset.file).sort();
  requireCondition(manifest.exact_asset_count === 20
    && manifest.locale_asset_counts?.ko === 10
    && manifest.locale_asset_counts?.en === 10
    && manifest.assets?.length === 20
    && new Set(manifest.assets.map((asset) => asset.asset_id)).size === 20
    && JSON.stringify(declaredFiles) === JSON.stringify(expectedMediaFiles), "localized media exact asset set failed");

  const manifestByFile = new Map(manifest.assets.map((asset) => [asset.file, asset]));
  const summaries = {};
  for (const locale of ["ko", "en"]) {
    const proofRelative = `assets/media/pf07/proof/${locale}-recording-proof.json`;
    const localizedProofBytes = await fs.readFile(path.join(projectRoot, proofRelative));
    const localizedProofText = localizedProofBytes.toString("utf8");
    const localizedProof = JSON.parse(localizedProofText);
    const aggregateProof = proof.recording_proofs?.[locale];
    const proofAsset = manifestByFile.get(proofRelative);
    const runtimeLocale = locale === "ko" ? "ko_KR" : "en_US";
    const recordingAuthorityId = locale === "ko" ? "ko_recording_capture" : "current_recording_capture";
    const recordingAuthority = manifest.capture_authorities?.[recordingAuthorityId];
    requireCondition(localizedProof.schema_version === 1
      && localizedProof.case_id === "pf07"
      && localizedProof.classification === "PUBLIC_SANITIZED_EXECUTION_PROOF"
      && localizedProof.metadata_stripped === true
      && localizedProof.runtime_locale === runtimeLocale
      && localizedProof.package_build_id === expectedRelease.package_build_id
      && localizedProof.package_artifact_manifest_sha256 === expectedRelease.linux_package_manifest_sha256
      && localizedProof.final_linux_package_preflight === "PASS"
      && localizedProof.synthetic_checkout_window_prepared_via_wp_cli === true, `${locale}: localized recording proof identity failed`);
    requireCondition(!Object.hasOwn(localizedProof, "status")
      && !Object.hasOwn(localizedProof, "result")
      && !hasForbiddenJsonValue(localizedProofText), `${locale}: localized proof boundary failed`);
    const localizedProofHash = sha256(localizedProofBytes);
    requireCondition(aggregateProof?.file === proofRelative
      && aggregateProof?.sha256 === localizedProofHash
      && aggregateProof?.runtime_locale === runtimeLocale
      && proofAsset?.sha256 === localizedProofHash
      && proofAsset?.bytes === localizedProofBytes.length
      && localizedProof.recording_script_sha256 === recordingAuthority.sha256
      && aggregateProof?.recording_script_sha256 === recordingAuthority.sha256
      && proofAsset?.recording_script_sha256 === recordingAuthority.sha256, `${locale}: localized proof or capture-script commitment failed`);

    for (const slug of ["purchase-delivery", "failure-recovery"]) {
      const fileName = `${slug}.mp4`;
      const relative = `assets/media/pf07/videos/${locale}/${fileName}`;
      const absolute = path.join(projectRoot, relative);
      const bytes = await fs.readFile(absolute);
      const asset = manifestByFile.get(relative);
      const proofKey = slug === "purchase-delivery" ? "demo-video.mp4" : "recovery-clip.mp4";
      const videoProof = localizedProof.videos?.[proofKey];
      const timelineContract = expectedTimelines[fileName];
      requireCondition(asset?.kind === "video"
        && asset.locale === locale
        && asset.role === roles[slug].role
        && asset.proof_video_key === proofKey
        && asset.source_proof === proofRelative
        && asset.source_proof_sha256 === localizedProofHash
        && asset.transformation === "byte-for-byte-promotion-from-localized-recording"
        && sha256(bytes) === asset.sha256
        && asset.sha256 === videoProof?.sha256, `${relative}: proof or byte commitment failed`);
      const probe = probeVideo(absolute);
      const stream = probe.streams?.[0];
      const format = probe.format;
      const duration = Number(format?.duration);
      const frameCount = Number(stream?.nb_read_frames);
      requireCondition(stream?.codec_name === "h264"
        && stream?.pix_fmt === "yuv420p"
        && stream?.avg_frame_rate === "30/1"
        && Number(stream?.width) === 1280
        && Number(stream?.height) === 720
        && Math.abs(duration - Number(asset.duration_seconds)) < 0.001
        && Math.abs(duration - Number(videoProof.duration_seconds)) < 0.001
        && frameCount === Number(asset.frame_count)
        && frameCount === Number(videoProof.frame_count)
        && Number(format?.size) === asset.bytes, `${relative}: codec, dimensions, duration, or frame commitment failed`);
      requireCondition(duration >= roles[slug].minimum
        && duration <= roles[slug].maximum
        && Math.abs(frameCount / duration - 30) < 0.1, `${relative}: duration or continuous-frame contract failed`);
      const tags = Object.keys(format?.tags || {}).map((key) => key.toLowerCase());
      requireCondition(!tags.some((key) => forbiddenMetadataKeys.has(key)), `${relative}: identifying video metadata remains`);
      decodeVideo(absolute);

      const dynamics = sampleDynamics(absolute);
      requireCondition(dynamics.sampled === Number(videoProof.sampled_frame_count)
        && dynamics.unique === Number(videoProof.unique_sampled_frames)
        && dynamics.unique > timelineContract.length, `${relative}: dynamic continuous-capture evidence failed`);

      const timeline = videoProof.timeline;
      requireCondition(Array.isArray(timeline) && timeline.length === timelineContract.length, `${relative}: exact timeline inventory failed`);
      let previousTime = -1;
      const frameHashes = new Set();
      for (let index = 0; index < timelineContract.length; index += 1) {
        const event = timeline[index];
        const [expectedEvent, expectedObservation] = timelineContract[index];
        requireCondition(event?.event === expectedEvent
          && event?.observation === expectedObservation
          && Number.isFinite(event.at_seconds)
          && event.at_seconds > previousTime
          && event.at_seconds < duration, `${relative}: timeline event ${index + 1} failed`);
        previousTime = event.at_seconds;
        const frame = frameAt(absolute, event.at_seconds);
        requireCondition(sha256(frame) === event.frame_sha256, `${relative}: frame commitment failed for ${expectedEvent}`);
        frameHashes.add(event.frame_sha256);
      }
      requireCondition(frameHashes.size === timelineContract.length, `${relative}: event frames are not distinct`);
      if (slug === "purchase-delivery") {
        requireCondition(videoProof.continuous_capture === true
          && videoProof.actual_launcher_hub_observed === true
          && videoProof.actual_checkout_observed === true
          && videoProof.foreground_worker_observed === true
          && videoProof.visible_worker_terminal_observed === true
          && videoProof.final_status === "completed", `${relative}: purchase-delivery execution flags failed`);
      } else {
        requireCondition(videoProof.continuous_capture === true
          && videoProof.actual_terminal_failure_observed === true
          && videoProof.actual_hub_scenario_transition_observed === true
          && videoProof.manual_retry_observed === true
          && videoProof.visible_worker_terminal_observed === true
          && videoProof.final_status === "recovered", `${relative}: failure-recovery execution flags failed`);
      }
      summaries[`${locale}/${slug}`] = {
        duration_seconds: duration,
        frame_count: frameCount,
        unique_sampled_frames: dynamics.unique,
      };
    }

    const localizedStateFiles = {
      "operator-failed.png": `assets/media/pf07/current-ui/${locale}/operator-failed-desktop.png`,
      "operator-recovered.png": `assets/media/pf07/current-ui/${locale}/operator-recovered-desktop.png`,
    };
    for (const [proofName, relative] of Object.entries(localizedStateFiles)) {
      const bytes = await fs.readFile(path.join(projectRoot, relative));
      requireCondition(localizedProof.state_stills?.[proofName]?.sha256 === sha256(bytes), `${locale}: ${proofName} state-still commitment failed`);
    }

    const guidedRelative = `assets/media/pf07/videos/${locale}/guided-overview.mp4`;
    const purchaseRelative = `assets/media/pf07/videos/${locale}/purchase-delivery.mp4`;
    const guidedAsset = manifestByFile.get(guidedRelative);
    const guidedBytes = await fs.readFile(path.join(projectRoot, guidedRelative));
    const guidedProbe = probeVideo(path.join(projectRoot, guidedRelative));
    const guidedStream = guidedProbe.streams?.[0];
    const guidedFormat = guidedProbe.format;
    const guidedDuration = Number(guidedFormat?.duration);
    const purchaseDuration = summaries[`${locale}/purchase-delivery`].duration_seconds;
    requireCondition(guidedAsset?.kind === "video"
      && guidedAsset.role === roles["guided-overview"].role
      && guidedAsset.derived_from === purchaseRelative
      && guidedAsset.transformation === "continuous-time-compression:setpts=0.64*PTS"
      && sha256(guidedBytes) === guidedAsset.sha256
      && guidedStream?.codec_name === "h264"
      && guidedStream?.pix_fmt === "yuv420p"
      && guidedStream?.avg_frame_rate === "30/1"
      && Number(guidedStream?.width) === 1280
      && Number(guidedStream?.height) === 720
      && Number(guidedStream?.nb_read_frames) === guidedAsset.frame_count
      && Number(guidedFormat?.size) === guidedAsset.bytes
      && Math.abs(guidedDuration - guidedAsset.duration_seconds) < 0.001
      && guidedDuration >= roles["guided-overview"].minimum
      && guidedDuration <= roles["guided-overview"].maximum
      && Math.abs((guidedDuration / purchaseDuration) - 0.64) < 0.01, `${guidedRelative}: guided continuous derivative contract failed`);
    const guidedTags = Object.keys(guidedFormat?.tags || {}).map((key) => key.toLowerCase());
    requireCondition(!guidedTags.some((key) => forbiddenMetadataKeys.has(key)), `${guidedRelative}: identifying video metadata remains`);
    decodeVideo(path.join(projectRoot, guidedRelative));
    const guidedDynamics = sampleDynamics(path.join(projectRoot, guidedRelative));
    requireCondition(guidedDynamics.unique > 12, `${guidedRelative}: guided tour is not a dynamic continuous recording`);
    summaries[`${locale}/guided-overview`] = {
      duration_seconds: guidedDuration,
      frame_count: Number(guidedStream.nb_read_frames),
      unique_sampled_frames: guidedDynamics.unique,
    };
  }

  const posterHashes = new Set();
  for (const locale of ["ko", "en"]) {
    for (const slug of Object.keys(roles)) {
      const posterRelative = `assets/media/pf07/posters/${locale}/${slug}.png`;
      const posterAsset = manifestByFile.get(posterRelative);
      const posterBytes = await fs.readFile(path.join(projectRoot, posterRelative));
      requireCondition(posterAsset?.kind === "poster"
        && posterAsset.locale === locale
        && posterAsset.role === roles[slug].role
        && posterAsset.source_video === `assets/media/pf07/videos/${locale}/${slug}.mp4`
        && posterAsset.review_result === "ACCEPTED_STEP050_DIRECT_REVIEW"
        && posterAsset.width === 1280
        && posterAsset.height === 720, `${posterRelative}: poster authority failed`);
      validatePng(posterBytes, posterAsset, posterRelative);
      posterHashes.add(posterAsset.sha256);

      const captionRelative = `assets/media/pf07/captions/${locale}/${slug}.vtt`;
      const captionAsset = manifestByFile.get(captionRelative);
      const captionBytes = await fs.readFile(path.join(projectRoot, captionRelative));
      const captionText = captionBytes.toString("utf8");
      const videoDuration = summaries[`${locale}/${slug}`].duration_seconds;
      requireCondition(captionAsset?.kind === "captions"
        && captionAsset.format === "WEBVTT"
        && captionAsset.locale === locale
        && captionAsset.role === roles[slug].role
        && captionAsset.source_video === `assets/media/pf07/videos/${locale}/${slug}.mp4`
        && captionAsset.bytes === captionBytes.length
        && captionAsset.sha256 === sha256(captionBytes)
        && captionText.startsWith("WEBVTT\n")
        && !hasForbiddenJsonValue(captionText), `${captionRelative}: caption identity or byte commitment failed`);
      const cues = [...captionText.matchAll(/(\d{2}:\d{2}(?::\d{2})?\.\d{3})\s+-->\s+(\d{2}:\d{2}(?::\d{2})?\.\d{3})/g)];
      requireCondition(cues.length >= 4, `${captionRelative}: too few caption cues`);
      let previousEnd = 0;
      for (const cue of cues) {
        const start = parseVttTimestamp(cue[1]);
        const end = parseVttTimestamp(cue[2]);
        requireCondition(start >= previousEnd - 0.001
          && end > start
          && end <= videoDuration + 0.001, `${captionRelative}: caption timing contract failed`);
        previousEnd = end;
      }
      requireCondition(locale === "ko"
        ? /[가-힣]/.test(captionText)
        : !/[ㄱ-ㆎ가-힣]/.test(captionText), `${captionRelative}: caption language boundary failed`);
    }
  }
  requireCondition(posterHashes.size === 6, "localized outcome-specific posters are not all distinct");

  const retryState = proof.retry_wait_observation;
  requireCondition(retryState?.state === "retry_wait"
    && retryState?.http_status === 503
    && retryState?.attempt === 1
    && retryState?.capture_authority === expectedScripts.retry_state_capture
    && retryState?.capture_authority_sha256 === manifest.capture_authorities.retry_state_capture.sha256, "retry-wait observation identity failed");
  for (const locale of ["ko", "en"]) {
    const relative = `assets/media/pf07/current-ui/${locale}/operator-retrying-desktop.png`;
    const bytes = await fs.readFile(path.join(projectRoot, relative));
    requireCondition(retryState.assets?.[locale]?.file === relative
      && retryState.assets?.[locale]?.sha256 === sha256(bytes), `${locale}: actual retry-wait still commitment failed`);
  }

  return {
    status: "PASS",
    release_tag: expectedRelease.release_tag,
    execution_proof_sha256: proofHash,
    localized_video_count: 6,
    localized_poster_count: 6,
    localized_caption_count: 6,
    localized_recording_proof_count: 2,
    videos: summaries,
  };
}
