import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createWorker } from "tesseract.js";
import englishData from "@tesseract.js-data/eng";

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
  "-v", "error", "-select_streams", "v:0", "-count_frames",
  "-show_entries", "stream=codec_name,pix_fmt,width,height,nb_read_frames:format=duration,size:format_tags",
  "-of", "json", videoPath,
], "utf8"));

const decodeVideo = (videoPath) => {
  run("ffmpeg", ["-v", "error", "-i", videoPath, "-map", "0:v:0", "-f", "null", "-"]);
};

const frameAt = (videoPath, seconds) => run("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-i", videoPath, "-ss", String(seconds),
  "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-",
]);

const sampleDynamics = (videoPath) => {
  const output = run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-i", videoPath,
    "-vf", "fps=1,scale=160:90,format=gray", "-f", "framemd5", "-",
  ]).toString("utf8");
  const hashes = output.split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(",").at(-1).trim());
  return { sampled: hashes.length, unique: new Set(hashes).size };
};

const expectedTimelines = {
  "demo-video.mp4": [
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
  "recovery-clip.mp4": [
    ["OUTBOX_PENDING", "status_pending"],
    ["FAILURE_WORKER_RUN", "visible_terminal_failure_worker_exit_zero"],
    ["FAILED", "status_failed_manual_retry_visible"],
    ["NORMAL_SCENARIO", "actual_hub_normal_scenario_applied"],
    ["MANUAL_RETRY", "manual_retry_scheduled_pending"],
    ["RECOVERY_WORKER_RUN", "visible_terminal_recovery_worker_exit_zero"],
    ["RECOVERED", "status_recovered"],
  ],
};

const ocrRequirements = {
  "demo-video.mp4": {
    LAUNCH_HUB: [/package launch hub/i, /ready/i, /actual hub controls/i],
    CHECKOUT_INPUT: [/checkout/i, /test street/i, /seoul/i],
    ORDER_RECEIVED: [/order received/i],
    OUTBOX_PENDING: [/outbox pending/i, /order[\s._-]*cr\w*[\s._-]+pendin/i],
    WORKER_RUN: [/final package worker/i, /action-scheduler run/i],
    ADMIN_COMPLETED: [/admin completed?/i, /order[\s._-]*created/i, /completed/i, /\b200\b/i],
    INTEGRATION_RESULT: [/integration result/i, /woo.*pf[o0]7.*n8n.*crm.*slack/i, /identifiers.*masked/i],
  },
  "recovery-clip.mp4": {
    OUTBOX_PENDING: [/outbox pending/i, /order[\s._-]*cr\w*[\s._-]+pendin/i],
    FAILURE_WORKER_RUN: [/final package worker/i, /action-scheduler run/i],
    FAILED: [/failed/i, /422/i],
    NORMAL_SCENARIO: [/normal scenario/i, /actual package hub control/i],
    MANUAL_RETRY: [/manual retry/i, /scheduled one follow-up/i],
    RECOVERY_WORKER_RUN: [/final package worker/i, /action-scheduler run/i],
    RECOVERED: [/recovered/i, /http\s*200/i],
  },
};

const ocrRegions = {
  "demo-video.mp4": {
    WORKER_RUN: { left: 500, top: 475, width: 750, height: 220 },
  },
  "recovery-clip.mp4": {
    FAILURE_WORKER_RUN: { left: 500, top: 475, width: 750, height: 220 },
    RECOVERY_WORKER_RUN: { left: 500, top: 475, width: 750, height: 220 },
  },
};

const forbiddenMetadataKeys = new Set([
  "artist", "author", "comment", "copyright", "creation_time", "description",
  "encoded_by", "location", "location-eng", "title",
]);

export async function validatePf07ExecutionMedia({ mediaRoot, recordingScriptPath }) {
  const manifestPath = path.join(mediaRoot, "media-manifest.json");
  const proofPath = path.join(mediaRoot, "execution-proof.json");
  const [manifestBytes, proofBytes, recordingScriptBytes] = await Promise.all([
    fs.readFile(manifestPath),
    fs.readFile(proofPath),
    fs.readFile(recordingScriptPath),
  ]);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const proof = JSON.parse(proofBytes.toString("utf8"));

  requireCondition(manifest.schema_version === 1
    && manifest.case_id === "pf07"
    && manifest.classification === "PUBLIC_SANITIZED_MEDIA"
    && manifest.metadata_stripped === true, "manifest identity or metadata boundary failed");
  requireCondition(proof.schema_version === 1
    && proof.case_id === "pf07"
    && proof.classification === "PUBLIC_SANITIZED_EXECUTION_PROOF", "execution proof identity failed");
  requireCondition(!Object.hasOwn(proof, "status") && !Object.hasOwn(proof, "result"), "execution proof must not self-declare PASS");
  requireCondition(proof.synthetic_checkout_window_prepared_via_wp_cli === true, "protected checkout preparation disclosure is missing");
  requireCondition(!/\/home\/|https?:\/\/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(proofBytes.toString("utf8")), "execution proof contains a locator or contact-like value");

  const proofHash = sha256(proofBytes);
  const scriptHash = sha256(recordingScriptBytes);
  requireCondition(manifest.source_commitments?.execution_proof_sha256 === proofHash
    && manifest.assets?.["execution-proof.json"]?.sha256 === proofHash, "execution proof hash commitment failed");
  requireCondition(proof.recording_script_sha256 === scriptHash
    && manifest.source_commitments?.recording_script_sha256 === scriptHash, "recording script commitment failed");

  const frameBuffers = new Map();
  const summaries = {};
  for (const [fileName, expectedTimeline] of Object.entries(expectedTimelines)) {
    const videoPath = path.join(mediaRoot, fileName);
    const videoBytes = await fs.readFile(videoPath);
    const videoProof = proof.videos?.[fileName];
    const asset = manifest.assets?.[fileName];
    requireCondition(videoProof && asset, `${fileName}: proof or manifest entry is missing`);
    requireCondition(sha256(videoBytes) === videoProof.sha256 && videoProof.sha256 === asset.sha256, `${fileName}: byte commitment failed`);

    const probe = probeVideo(videoPath);
    const stream = probe.streams?.[0];
    const format = probe.format;
    const duration = Number(format?.duration);
    const frameCount = Number(stream?.nb_read_frames);
    requireCondition(stream?.codec_name === "h264" && stream?.pix_fmt === "yuv420p"
      && Number(stream?.width) === 1280 && Number(stream?.height) === 720, `${fileName}: codec or dimensions failed`);
    requireCondition(Math.abs(duration - Number(videoProof.duration_seconds)) < 0.01
      && Math.abs(duration - Number(asset.duration_seconds)) < 0.01
      && frameCount === Number(videoProof.frame_count)
      && frameCount === Number(asset.frame_count), `${fileName}: duration or frame-count commitment failed`);
    requireCondition(Math.abs(frameCount / duration - 30) < 0.1, `${fileName}: continuous 30fps capture was not established`);
    requireCondition(fileName === "demo-video.mp4" ? duration >= 60 && duration <= 90 : duration >= 8 && duration <= 30, `${fileName}: contract duration failed`);
    const tags = Object.keys(format?.tags || {}).map((key) => key.toLowerCase());
    requireCondition(!tags.some((key) => forbiddenMetadataKeys.has(key)), `${fileName}: identifying metadata remains`);
    decodeVideo(videoPath);

    const dynamics = sampleDynamics(videoPath);
    requireCondition(dynamics.sampled === Number(videoProof.sampled_frame_count)
      && dynamics.sampled === Number(asset.sampled_frame_count)
      && dynamics.unique === Number(videoProof.unique_sampled_frames)
      && dynamics.unique === Number(asset.unique_sampled_frames), `${fileName}: dynamic-sample commitment failed`);
    requireCondition(dynamics.unique > expectedTimeline.length, `${fileName}: content does not distinguish continuous execution from event slides`);

    const actualTimeline = videoProof.timeline;
    requireCondition(Array.isArray(actualTimeline) && actualTimeline.length === expectedTimeline.length, `${fileName}: exact timeline inventory failed`);
    let previousTime = -1;
    const eventFrameHashes = new Set();
    for (let index = 0; index < expectedTimeline.length; index += 1) {
      const event = actualTimeline[index];
      const [expectedEvent, expectedObservation] = expectedTimeline[index];
      requireCondition(event?.event === expectedEvent && event?.observation === expectedObservation, `${fileName}: timeline event ${index + 1} failed`);
      requireCondition(Number.isFinite(event.at_seconds) && event.at_seconds > previousTime && event.at_seconds < duration, `${fileName}: timeline time ${expectedEvent} failed`);
      previousTime = event.at_seconds;
      const frame = frameAt(videoPath, event.at_seconds);
      requireCondition(sha256(frame) === event.frame_sha256, `${fileName}: frame commitment failed for ${expectedEvent}`);
      frameBuffers.set(`${fileName}:${expectedEvent}`, frame);
      eventFrameHashes.add(event.frame_sha256);
    }
    requireCondition(eventFrameHashes.size === expectedTimeline.length, `${fileName}: event frames are not visually distinct`);

    if (fileName === "demo-video.mp4") {
      requireCondition(videoProof.continuous_capture === true
        && videoProof.actual_launcher_hub_observed === true
        && videoProof.actual_checkout_observed === true
        && videoProof.foreground_worker_observed === true
        && videoProof.visible_worker_terminal_observed === true
        && videoProof.final_status === "completed", "demo execution flags failed");
    } else {
      requireCondition(videoProof.continuous_capture === true
        && videoProof.actual_terminal_failure_observed === true
        && videoProof.actual_hub_scenario_transition_observed === true
        && videoProof.manual_retry_observed === true
        && videoProof.visible_worker_terminal_observed === true
        && videoProof.final_status === "recovered", "recovery execution flags failed");
    }
    summaries[fileName] = { duration_seconds: duration, frame_count: frameCount, unique_sampled_frames: dynamics.unique };
  }

  const posterPath = path.join(mediaRoot, "video-poster.png");
  const posterBytes = await fs.readFile(posterPath);
  const poster = proof.poster;
  requireCondition(poster?.file === "video-poster.png"
    && poster.source_video === "demo-video.mp4"
    && sha256(posterBytes) === poster.sha256
    && poster.sha256 === manifest.assets?.["video-poster.png"]?.sha256, "poster commitment failed");
  const regeneratedPoster = run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-i", path.join(mediaRoot, poster.source_video),
    "-ss", String(poster.source_at_seconds), "-frames:v", "1",
    "-vf", "scale=1440:810:force_original_aspect_ratio=decrease,pad=1440:1000:(ow-iw)/2:(oh-ih)/2:color=0x07111f",
    "-map_metadata", "-1", "-f", "image2pipe", "-vcodec", "png", "-",
  ]);
  requireCondition(sha256(regeneratedPoster) === poster.sha256, "poster is not the committed execution-video frame");

  const worker = await createWorker("eng", 1, {
    langPath: englishData.langPath,
    gzip: englishData.gzip,
    cacheMethod: "none",
  });
  try {
    for (const [fileName, events] of Object.entries(ocrRequirements)) {
      for (const [eventName, patterns] of Object.entries(events)) {
        const frame = frameBuffers.get(`${fileName}:${eventName}`);
        requireCondition(frame, `${fileName}: OCR frame is missing for ${eventName}`);
        const rectangle = ocrRegions[fileName]?.[eventName];
        const result = await worker.recognize(frame, rectangle ? { rectangle } : {});
        const text = result.data.text.replace(/\s+/g, " ");
        requireCondition(patterns.every((pattern) => pattern.test(text)), `${fileName}: frame text did not establish ${eventName}`);
      }
    }
  } finally {
    await worker.terminate();
  }

  return {
    status: "PASS",
    proof_sha256: proofHash,
    recording_script_sha256: scriptHash,
    videos: summaries,
    ocr_event_count: Object.values(ocrRequirements).reduce((sum, events) => sum + Object.keys(events).length, 0),
  };
}
