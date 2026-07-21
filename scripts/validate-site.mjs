import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { validatePf07ExecutionMedia } from "./validate-pf07-media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const publicIds = ["oddroom", "pf01", "pf02", "pf03", "pf04", "pf06", "pf07"];
const registrationIds = ["oddroom", "pf01", "pf02", "pf03", "pf04", "pf06"];
const demoIds = ["pf01", "pf02", "pf03", "pf04"];
const registrationRoot = path.resolve(root, "../등록 준비/00-크몽");
const productRoot = path.resolve(root, "../유형별 포트폴리오");
const publicTrialVideoPolicy = {
  pf01: {
    demoBuildId: "PF01_PUBLIC_TRIAL_20260711_01",
    sourceRunId: "PF01_CONFIGURABLE_LIVE_20260628",
    sourceProject: "01-AI-고객문의-요약분류-자동화",
  },
  pf02: {
    demoBuildId: "PF02_PUBLIC_TRIAL_20260711_01",
    sourceRunId: "PF02_CONFIGURABLE_LIVE_20260628_1816",
    sourceProject: "02-구글폼-웹훅-시트-알림-자동화",
  },
  pf03: {
    demoBuildId: "PF03_PUBLIC_TRIAL_20260711_01",
    sourceRunId: "PF03_FINAL_20260710_891998",
    sourceProject: "03-엑셀-CSV-정리-리포트-자동화",
  },
  pf04: {
    demoBuildId: "PF04_PUBLIC_TRIAL_20260711_01",
    sourceRunId: "PF04_FINAL_20260710_891998",
    sourceProject: "04-근태-휴가-출장-미니-업무관리",
  },
};
const publicTrialImagePolicy = {
  pf01: publicTrialVideoPolicy.pf01,
  pf02: publicTrialVideoPolicy.pf02,
  pf03: publicTrialVideoPolicy.pf03,
};
const evidenceReportPolicy = {
  pf01: { sourceProject: publicTrialVideoPolicy.pf01.sourceProject, report: "evidence/registration-video-validation-report.json" },
  pf02: { sourceProject: publicTrialVideoPolicy.pf02.sourceProject, report: "evidence/registration-video-validation-report.json" },
  pf03: { sourceProject: publicTrialVideoPolicy.pf03.sourceProject, report: "evidence/registration-video-validation-report.json" },
  pf04: { sourceProject: publicTrialVideoPolicy.pf04.sourceProject, report: "evidence/registration-video-validation-report.json" },
  pf06: { sourceProject: "06-Spring-Boot-API-오류수정-테스트리포트", report: "evidence/video-validation-report.json" },
};
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const probeVideo = (videoPath) => {
  const result = spawnSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0", "-count_frames",
    "-show_entries", "stream=codec_name,pix_fmt,width,height,nb_read_frames:format=duration,size",
    "-of", "json", videoPath,
  ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `ffprobe failed: ${videoPath}`);
  const parsed = JSON.parse(result.stdout);
  return { stream: parsed.streams?.[0], format: parsed.format };
};

const fullDecodePasses = (videoPath) => spawnSync(
  "ffmpeg",
  ["-v", "error", "-i", videoPath, "-map", "0:v:0", "-f", "null", "-"],
  { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
).status === 0;

const walk = async (directory) => {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
};

const digestDemoSource = async (id) => {
  const hash = crypto.createHash("sha256");
  for (const sourceRoot of [path.join(root, "demos", id), path.join(root, "demos/shared")]) {
    for (const file of (await walk(sourceRoot)).sort()) {
      hash.update(path.relative(root, file).split(path.sep).join("/"));
      hash.update("\0");
      hash.update(await fs.readFile(file));
      hash.update("\0");
    }
  }
  for (const name of ["Pretendard-Regular.woff2", "Pretendard-SemiBold.woff2", "Pretendard-ExtraBold.woff2"]) {
    const file = path.join(root, "assets/fonts", name);
    hash.update(path.relative(root, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(await fs.readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
};

const projectSource = await fs.readFile(path.join(root, "assets/js/projects.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(projectSource, sandbox, { filename: "projects.js" });
const projects = sandbox.window.PORTFOLIO_PROJECTS;
if (!Array.isArray(projects)) errors.push("projects.js did not define an array");
if (JSON.stringify(projects.map((item) => item.id)) !== JSON.stringify(publicIds)) errors.push("public project IDs/order mismatch");

for (const id of demoIds) {
  const project = projects.find((item) => item.id === id);
  if (!project?.demo || project.demo.url !== `demos/${id}/`) errors.push(`${id}: missing canonical demo URL`);
  if (!project?.demo?.summary || !project?.demo?.boundary) errors.push(`${id}: incomplete demo disclosure`);
}
const pf01ProjectDemo = projects.find((item) => item.id === "pf01")?.demo;
if (!pf01ProjectDemo?.summary.includes("직접 작성한 문의") || !pf01ProjectDemo?.boundary.includes("키워드 점수") || !pf01ProjectDemo?.boundary.includes("사용을 승인한 AI API") || !pf01ProjectDemo?.boundary.includes("별도 협의")) errors.push("pf01: case-page direct-input or AI integration boundary missing");
if (projects.find((item) => item.id === "pf01")?.facts?.some(([value, label]) => value === "0" && label !== "샘플 실행 처리 오류")) errors.push("pf01: zero-error fact label can be mistaken for an AI accuracy claim");
if (["oddroom", "pf06", "pf07"].some((id) => projects.find((item) => item.id === id)?.demo)) errors.push("demo policy leaked to a non-demo project");

let registrationManifest;
try {
  registrationManifest = JSON.parse(await fs.readFile(path.join(registrationRoot, "registration-manifest.json"), "utf8"));
  if (registrationManifest.status !== "REGISTRATION_READY") errors.push("registration manifest is not ready");
  const registeredIds = registrationManifest.portfolioCases?.map((item) => item.id);
  if (JSON.stringify(registeredIds) !== JSON.stringify(registrationIds)) errors.push("registration manifest must remain the exact six-case sales manifest");
} catch (error) {
  errors.push(`registration manifest unavailable: ${error.message}`);
}
const registrationCases = new Map((registrationManifest?.portfolioCases || []).map((item) => [item.id, item]));
let pf07MediaManifest;
try {
  pf07MediaManifest = JSON.parse(await fs.readFile(path.join(root, "assets/media/pf07/media-manifest.json"), "utf8"));
  if (pf07MediaManifest.schema_version !== 1 || pf07MediaManifest.case_id !== "pf07" || pf07MediaManifest.classification !== "PUBLIC_SANITIZED_MEDIA" || pf07MediaManifest.registration_manifest_case_count !== 6) errors.push("pf07: media manifest identity or six-case boundary failed");
} catch (error) {
  errors.push(`pf07: media manifest unavailable: ${error.message}`);
}
try {
  await validatePf07ExecutionMedia({
    mediaRoot: path.join(root, "assets/media/pf07"),
    recordingScriptPath: path.join(productRoot, "07-OddRoom-Woo-OrderOps/scripts/record-public-media.mjs"),
  });
} catch (error) {
  errors.push(`pf07: execution media semantics failed: ${error.message}`);
}
try {
  const proof = JSON.parse(await fs.readFile(path.join(root, "assets/media/pf07/execution-proof.json"), "utf8"));
  const stillBuilder = await fs.readFile(path.join(productRoot, "07-OddRoom-Woo-OrderOps/scripts/build-public-stills.mjs"));
  const demo = proof.videos?.["demo-video.mp4"];
  const expectedFrames = Object.fromEntries(
    (demo?.timeline || [])
      .filter((event) => ["LIVE_STOREFRONT", "PRODUCT_SELECTED", "CHECKOUT_INPUT"].includes(event.event))
      .map((event) => [event.event, event.frame_sha256]),
  );
  const expectedMainFrames = { LIVE_STOREFRONT: expectedFrames.LIVE_STOREFRONT };
  const main = pf07MediaManifest?.assets?.["main-image.png"];
  const detail = pf07MediaManifest?.assets?.["detail-01-overview.png"];
  if (pf07MediaManifest?.source_commitments?.still_composition_script_sha256 !== sha256(stillBuilder)
    || main?.source_video !== "demo-video.mp4"
    || main?.source_video_sha256 !== demo?.sha256
    || JSON.stringify(main?.source_event_frame_sha256) !== JSON.stringify(expectedMainFrames)
    || detail?.source_video !== "demo-video.mp4"
    || detail?.source_video_sha256 !== demo?.sha256
    || JSON.stringify(detail?.source_event_frame_sha256) !== JSON.stringify(expectedFrames)) {
    errors.push("pf07: real-execution still source commitment failed");
  }
} catch (error) {
  errors.push(`pf07: real-execution still provenance unavailable: ${error.message}`);
}

let pf07RefinementAllowlist;
const pf07RefinementRoot = path.join(root, "assets/media/pf07/refinement");
try {
  pf07RefinementAllowlist = JSON.parse(await fs.readFile(path.join(root, "assets/media/pf07/media-allowlist.json"), "utf8"));
  const rows = pf07RefinementAllowlist.mapping_rows || [];
  const accepted = rows.filter((row) => row.visibility === "PUBLIC");
  const deferred = rows.filter((row) => row.visibility === "PENDING_PUBLIC_OUTPUT");
  if (pf07RefinementAllowlist.schema !== "pf07.showcase-media-allowlist.v1"
    || pf07RefinementAllowlist.candidate_state !== "FINAL"
    || pf07RefinementAllowlist.final_completion_claim !== true
    || pf07RefinementAllowlist.declared_root !== "refinement"
    || pf07RefinementAllowlist.inventory_id_count !== 71
    || pf07RefinementAllowlist.mapped_public_id_count !== 71
    || pf07RefinementAllowlist.deferred_id_count !== 0
    || !Array.isArray(pf07RefinementAllowlist.deferred_ids)
    || pf07RefinementAllowlist.deferred_ids.length !== 0
    || rows.length !== 71
    || new Set(rows.map((row) => row.ASSET_ID)).size !== 71
    || accepted.length + deferred.length !== 71
    || accepted.length !== 71
    || deferred.length !== 0
    || accepted.some((row) => !Array.isArray(row.files) || row.files.length === 0)
    || deferred.some((row) => Array.isArray(row.files) && row.files.length !== 0)) {
    errors.push("pf07: refinement media inventory or intermediate-state semantics failed");
  }
  const actualFiles = (await walk(pf07RefinementRoot)).map((absolute) => path.relative(pf07RefinementRoot, absolute).split(path.sep).join("/")).sort();
  const declaredFiles = (pf07RefinementAllowlist.exact_file_set || []).map((file) => file.relative_path).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(declaredFiles) || actualFiles.length !== pf07RefinementAllowlist.exact_file_count) {
    errors.push("pf07: refinement media exact-set comparison failed");
  }
  const declaredHashes = new Map((pf07RefinementAllowlist.exact_file_set || []).map((file) => [file.relative_path, file.sha256]));
  for (const relative of actualFiles) {
    const data = await fs.readFile(path.join(pf07RefinementRoot, relative));
    if (declaredHashes.get(relative) !== sha256(data)) errors.push(`pf07: refinement media hash mismatch ${relative}`);
    if (/\.(?:svg|json|md|txt)$/i.test(relative) && /\/home\/junsoo|file:\/\/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|xox[baprs]-|gh[pousr]_/i.test(data.toString("utf8"))) {
      errors.push(`pf07: public refinement media contains a protected locator ${relative}`);
    }
  }
} catch (error) {
  errors.push(`pf07: refinement media allowlist unavailable: ${error.message}`);
}

const assetHashes = {};
for (const project of projects) {
  let registrationCaseRoot;
  let registrationProvenance;
  if (registrationIds.includes(project.id)) {
    try {
      const registrationCase = registrationCases.get(project.id);
      if (!registrationCase?.folder) throw new Error("case folder is missing from registration manifest");
      registrationCaseRoot = path.join(registrationRoot, registrationCase.folder);
      registrationProvenance = JSON.parse(await fs.readFile(path.join(registrationCaseRoot, "provenance.json"), "utf8"));
      if (registrationProvenance.kind !== "EVIDENCE_CASE" || registrationProvenance.caseId !== project.id || registrationProvenance.sourceValidation?.status !== "PASS") {
        throw new Error("case provenance identity or source validation is invalid");
      }
    } catch (error) {
      errors.push(`${project.id}: registration case provenance unavailable: ${error.message}`);
    }
  }
  const images = [project.image, ...project.gallery, ...(project.videoPoster ? [project.videoPoster] : [])];
  for (const relative of images) {
    try {
      const data = await fs.readFile(path.join(root, relative));
      assetHashes[relative] = sha256(data);
      if (project.id === "pf07") {
        const candidateRelative = relative.replace(/^assets\/media\/pf07\/refinement\//, "");
        const committed = pf07RefinementAllowlist?.exact_file_set?.find((file) => file.relative_path === candidateRelative);
        if (!committed || committed.sha256 !== assetHashes[relative]) errors.push(`${relative}: PF07 refinement allowlist hash mismatch`);
        if (relative.endsWith(".svg")) {
          const source = data.toString("utf8");
          if (!/<svg\b/i.test(source) || !/\bviewBox=["'][^"']+["']/i.test(source) || /<script\b/i.test(source)) errors.push(`${relative}: invalid or active SVG`);
        } else {
          const actual = [data.readUInt32BE(16), data.readUInt32BE(20)];
          if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || actual.some((value) => value < 1)) errors.push(`${relative}: invalid PNG dimensions ${actual.join("x")}`);
          const chunks = [];
          for (let offset = 8; offset + 12 <= data.length;) {
            const length = data.readUInt32BE(offset); const type = data.subarray(offset + 4, offset + 8).toString("ascii"); chunks.push(type); offset += 12 + length;
          }
          if (chunks.some((type) => ["tEXt", "zTXt", "iTXt", "eXIf"].includes(type))) errors.push(`${relative}: embedded PNG metadata was not stripped`);
        }
      } else {
        const expected = relative.endsWith("main-image.png") ? [1200, 1200] : relative.endsWith("video-poster.png") ? [1440, 1000] : [1200, 1350];
        const actual = [data.readUInt32BE(16), data.readUInt32BE(20)];
        if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || actual[0] !== expected[0] || actual[1] !== expected[1]) errors.push(`${relative}: invalid PNG dimensions ${actual.join("x")}`);
      }
    } catch (error) {
      errors.push(`${project.id}: image validation failed ${relative}: ${error.message}`);
    }
  }
  if (registrationProvenance && registrationCaseRoot) {
    const registrationImageFiles = ["portfolio-main-image.png", "detail-01-overview.png", "detail-02-flow.png", "detail-03-result.png"];
    const sourceImageFiles = ["main-image.png", "detail-01-overview.png", "detail-02-flow.png", "detail-03-result.png"];
    const publicImageFiles = [project.image, ...project.gallery];
    for (let index = 0; index < registrationImageFiles.length; index += 1) {
      const registrationFile = registrationImageFiles[index];
      const sourceFile = sourceImageFiles[index];
      const publicFile = publicImageFiles[index];
      try {
        const registrationHash = sha256(await fs.readFile(path.join(registrationCaseRoot, registrationFile)));
        const recordedHash = registrationProvenance.sourceEvidence?.assets?.[sourceFile];
        if (assetHashes[publicFile] !== registrationHash || recordedHash !== registrationHash) errors.push(`${project.id}: public image differs from registration source ${registrationFile}`);
      } catch (error) {
        errors.push(`${project.id}: image synchronization check failed for ${registrationFile}: ${error.message}`);
      }
    }
    const imagePolicy = publicTrialImagePolicy[project.id];
    if (imagePolicy) {
      try {
        const evidence = registrationProvenance.sourceEvidence;
        const expectedSourceHash = await digestDemoSource(project.id);
        const reportPath = path.join(productRoot, imagePolicy.sourceProject, "evidence/registration-video-validation-report.json");
        const reportData = await fs.readFile(reportPath);
        const report = JSON.parse(reportData.toString("utf8"));
        if (
          evidence?.demoBuildId !== imagePolicy.demoBuildId
          || evidence?.runId !== imagePolicy.sourceRunId
          || evidence?.reportSha256 !== sha256(reportData)
          || report.demoSourceSha256 !== expectedSourceHash
          || report.validation?.representativeFrameReview !== "PASS"
        ) errors.push(`${project.id}: current trial image provenance is stale`);
        for (const frame of report.representativeFrames || []) {
          const frameData = await fs.readFile(path.join(productRoot, imagePolicy.sourceProject, frame.file));
          const frameHash = sha256(frameData);
          if (frame.sha256 !== frameHash) errors.push(`${project.id}: current trial image frame is not reviewed ${frame.file}`);
        }
      } catch (error) {
        errors.push(`${project.id}: current trial image provenance check failed: ${error.message}`);
      }
    }
  }
  if (project.video) {
    if (!project.videoSummary) errors.push(`${project.id}: missing videoSummary`);
    try {
      const videoPath = path.join(root, project.video);
      const data = await fs.readFile(videoPath);
      if (data.length < 100_000) errors.push(`${project.video}: video is unexpectedly small`);
      const videoHash = sha256(data);
      assetHashes[project.video] = videoHash;
      if (registrationProvenance && (registrationProvenance.sourceEvidence?.videoSha256 !== videoHash || registrationProvenance.sourceEvidence?.assets?.["demo-video.mp4"] !== videoHash)) errors.push(`${project.id}: public video differs from registration package`);
      const evidencePolicy = evidenceReportPolicy[project.id];
      if (evidencePolicy) {
        const reportData = await fs.readFile(path.join(productRoot, evidencePolicy.sourceProject, evidencePolicy.report));
        const report = JSON.parse(reportData.toString("utf8"));
        if (registrationProvenance?.sourceEvidence?.reportSha256 !== sha256(reportData) || registrationProvenance?.sourceEvidence?.runId !== report.runId || report.currentVideoSha256 !== videoHash) {
          errors.push(`${project.id}: registration video evidence report linkage mismatch`);
        }
      }
      const publicTrial = publicTrialVideoPolicy[project.id];
      if (publicTrial) {
        const report = JSON.parse(await fs.readFile(path.join(productRoot, publicTrial.sourceProject, "evidence/registration-video-validation-report.json"), "utf8"));
        const expectedSourceHash = await digestDemoSource(project.id);
        const validation = report.validation || {};
        if (report.currentVideoSha256 !== videoHash) errors.push(`${project.id}: public video differs from final trial report`);
        if (report.demoBuildId !== publicTrial.demoBuildId || report.sourceRunId !== publicTrial.sourceRunId || report.runId !== publicTrial.sourceRunId) errors.push(`${project.id}: trial video identity mismatch`);
        if (report.demoSourceSha256 !== expectedSourceHash) errors.push(`${project.id}: trial video source hash is stale`);
        for (const field of ["fullDecode", "frameCountConsistency", "runIdLinkage", "demoBuildLinkage", "sourceProofSeparation", "noBlackSegments", "representativeFrameReview"]) {
          if (validation[field] !== "PASS") errors.push(`${project.id}: trial video ${field} is not PASS`);
        }
        if (registrationProvenance?.sourceEvidence?.demoBuildId !== publicTrial.demoBuildId) errors.push(`${project.id}: registration trial video policy mismatch`);
        if (!report.representativeFrames?.some((frame) => frame.sha256 === assetHashes[project.videoPoster])) errors.push(`${project.id}: public poster is not a reviewed trial-video frame`);
      }
      const { stream, format } = probeVideo(videoPath);
      if (!stream || !format || stream.codec_name !== "h264" || stream.pix_fmt !== "yuv420p" || Number(stream.width) < 1280 || Number(stream.height) < 720 || Number(stream.nb_read_frames) < 1 || Number(format.duration) <= 0) errors.push(`${project.id}: invalid public video metadata`);
      if (project.id === "pf07") {
        if (Number(format.duration) < 60 || Number(format.duration) > 90) errors.push("pf07: end-to-end video must be 60–90 seconds");
        if (pf07MediaManifest?.assets?.[path.basename(project.video)]?.sha256 !== videoHash || pf07MediaManifest?.metadata_stripped !== true) errors.push("pf07: end-to-end video manifest or metadata boundary failed");
      }
      if (!fullDecodePasses(videoPath)) errors.push(`${project.id}: public video full decode failed`);
    } catch (error) {
      errors.push(`${project.id}: video validation failed for ${project.video}: ${error.message}`);
    }
  }
  if (project.recoveryVideo) {
    try {
      const recoveryPath = path.join(root, project.recoveryVideo);
      const recoveryData = await fs.readFile(recoveryPath);
      const recoveryHash = sha256(recoveryData);
      const { stream, format } = probeVideo(recoveryPath);
      assetHashes[project.recoveryVideo] = recoveryHash;
      if (!stream || !format || stream.codec_name !== "h264" || stream.pix_fmt !== "yuv420p" || Number(stream.width) < 1280 || Number(stream.height) < 720 || Number(format.duration) < 8 || Number(format.duration) > 30) errors.push("pf07: invalid recovery clip metadata or duration");
      if (pf07MediaManifest?.assets?.[path.basename(project.recoveryVideo)]?.sha256 !== recoveryHash || !fullDecodePasses(recoveryPath)) errors.push("pf07: recovery clip hash or full decode failed");
    } catch (error) {
      errors.push(`${project.id}: recovery video validation failed: ${error.message}`);
    }
  }
  for (const field of ["title", "short", "summary", "problem", "solution", "disclosure"]) if (!project[field]) errors.push(`${project.id}: missing ${field}`);
  for (const field of ["facts", "proof", "included", "excluded", "tech"]) if (!Array.isArray(project[field]) || project[field].length < 3) errors.push(`${project.id}: incomplete ${field}`);
  if (project.id === "pf07") {
    const refinement = project.refinement;
    const stableReleasePrefix = "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.0/";
    const expectedReleaseFiles = ["pf07-windows-x64-1.0.0.zip", "pf07-windows-kvm-test-kit-1.0.0.zip", "pf07-macos-universal-1.0.0.zip", "pf07-linux-x86_64-1.0.0.tar.gz", "pf07-linux-server-1.0.0.tar.gz"];
    const expectedPostCandidateIds = ["CASE-017", "CASE-018", "CASE-019", "CASE-020"];
    if (!refinement?.repositoryUrl || !refinement?.mediaBase || !refinement?.locales?.ko || !refinement?.locales?.en) errors.push("pf07: bilingual refinement contract is incomplete");
    if (refinement?.releaseUrl !== "https://github.com/Cetacean916/oddroom-woo-orderops/releases/tag/pf07-v1.0.0") errors.push("pf07: stable release page URL is missing or incorrect");
    if (!Array.isArray(refinement?.releaseAssets)
      || refinement.releaseAssets.length !== 5
      || JSON.stringify(refinement.releaseAssets.map((asset) => asset.filename)) !== JSON.stringify(expectedReleaseFiles)
      || new Set(refinement.releaseAssets.map((asset) => asset.url)).size !== 5
      || refinement.releaseAssets.some((asset) => asset.url !== `${stableReleasePrefix}${asset.filename}` || !/^[0-9a-f]{64}$/.test(asset.sha256))) {
      errors.push("pf07: exact stable package download set is incomplete or invalid");
    }
    if (!Array.isArray(refinement?.postCandidateAssets)
      || refinement.postCandidateAssets.length !== 4
      || JSON.stringify(refinement.postCandidateAssets.map((relative) => relative.match(/CASE-0(?:17|18|19|20)/)?.[0])) !== JSON.stringify(expectedPostCandidateIds)
      || refinement.postCandidateAssets.some((relative) => !pf07RefinementAllowlist?.exact_file_set?.some((file) => file.relative_path === relative))) {
      errors.push("pf07: post-candidate CASE-017 through CASE-020 mapping is incomplete or unbound");
    }
    if (/[ㄱ-ㆎ가-힣]/.test(JSON.stringify(refinement?.locales?.en || {}))) errors.push("pf07: English-only copy contains Hangul");
    for (const locale of [refinement?.locales?.ko, refinement?.locales?.en]) {
      for (const field of ["title", "lead", "summary", "pathSteps", "surfaces", "recoveryLabels", "connectedLabels", "packages", "downloadLabels", "finalProofLabels", "fit", "nonFit", "boundary"]) {
        if (!locale?.[field] || (Array.isArray(locale[field]) && locale[field].length < 3)) errors.push(`pf07: incomplete localized field ${field}`);
      }
      for (const field of ["downloadAction", "finalProofTitle", "finalProofIntro"]) if (!locale?.[field]) errors.push(`pf07: incomplete localized field ${field}`);
      if (locale?.downloadLabels?.length !== 5 || locale?.finalProofLabels?.length !== 4) errors.push("pf07: localized download or final-proof cardinality failed");
    }
    for (const phrase of ["formal exactly-once", "실결제", "DEMO_MODE", "CONNECTED_MODE", "0 KRW"]) if (!JSON.stringify(project).toLowerCase().includes(phrase.toLowerCase())) errors.push(`pf07: claims boundary missing ${phrase}`);
  }
}

const rootPublicFiles = [
  "index.html", "inquiry-automation.html", "case.html", "404.html", "assets/css/styles.css", "assets/css/demo-integration.css", "assets/css/pf07-case.css",
  "assets/js/projects.js", "assets/js/main.js", "assets/js/case.js", "assets/js/contact.js", "assets/media/pf07/media-manifest.json", "assets/media/pf07/media-allowlist.json", "site.webmanifest", "robots.txt", "sitemap.xml",
];
const demoRoot = path.join(root, "demos");
let demoPublicFiles = [];
try {
  demoPublicFiles = (await walk(demoRoot))
    .map((absolute) => path.relative(root, absolute).split(path.sep).join("/"))
    .filter((relative) => /\.(?:html|css|js|json|csv)$/i.test(relative))
    .sort();
} catch {
  errors.push("demos: public demo directory is missing");
}

for (const id of demoIds) {
  if (!demoPublicFiles.includes(`demos/${id}/index.html`)) errors.push(`${id}: missing demo index.html`);
}

const publicFiles = [...rootPublicFiles, ...demoPublicFiles];
const resolveReference = async (owner, rawTarget) => {
  if (/^(?:https?:|data:|mailto:|tel:|javascript:|#)/i.test(rawTarget) || rawTarget === "") return;
  const clean = rawTarget.split(/[?#]/, 1)[0];
  if (!clean) return;
  let relativeTarget;
  if (clean.startsWith("/portfolio-showcase/")) relativeTarget = clean.slice("/portfolio-showcase/".length);
  else if (clean === "/portfolio-showcase" || clean === "/portfolio-showcase/") relativeTarget = "index.html";
  else if (clean.startsWith("/")) {
    errors.push(`${owner}: unsupported absolute reference ${rawTarget}`);
    return;
  } else relativeTarget = path.join(path.dirname(owner), clean);
  let absolute = path.resolve(root, relativeTarget);
  if (!absolute.startsWith(`${root}${path.sep}`) && absolute !== root) {
    errors.push(`${owner}: reference leaves public root ${rawTarget}`);
    return;
  }
  try {
    const stat = await fs.stat(absolute);
    if (stat.isDirectory()) absolute = path.join(absolute, "index.html");
    await fs.access(absolute);
  } catch {
    errors.push(`${owner}: broken reference ${rawTarget}`);
  }
};

for (const relative of publicFiles) {
  let content;
  try {
    content = await fs.readFile(path.join(root, relative), "utf8");
  } catch {
    errors.push(`${relative}: missing public file`);
    continue;
  }
  if (/PF05|pf05|05-n8n/.test(content)) errors.push(`${relative}: deferred PF05 leaked into public site`);
  if (/\/home\/junsoo|file:\/\/|localhost:\d+|api[_-]?key\s*[:=]\s*\S+|password\s*[:=]\s*\S+/i.test(content)) errors.push(`${relative}: local or sensitive string detected`);
  if (relative.endsWith(".html")) {
    if (!/<title>[^<]+<\/title>/.test(content)) errors.push(`${relative}: missing title`);
    for (const match of content.matchAll(/(?:src|href)=["']([^"']+)["']/g)) await resolveReference(relative, match[1]);
  }
  if (relative.endsWith(".css")) {
    for (const match of content.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) await resolveReference(relative, match[1]);
  }
}

for (const relative of demoPublicFiles) {
  const content = await fs.readFile(path.join(root, relative), "utf8");
  if (/https?:\/\//i.test(content)) errors.push(`${relative}: public demo contains an external URL`);
  if (/(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/.test(content)) errors.push(`${relative}: public demo contains a network API`);
  if (/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(content)) errors.push(`${relative}: public demo contains persistent browser storage`);
  if (/\beval\s*\(|\bFunction\s*\(/.test(content)) errors.push(`${relative}: dynamic code execution is forbidden`);
  if (/\son[a-z]+\s*=/i.test(content)) errors.push(`${relative}: inline event handler is forbidden`);
  if (/[\w.+-]+@(?![\w.-]+\.invalid\b)[\w.-]+\.[A-Za-z]{2,}/.test(content) || /01[016789]-\d{3,4}-\d{4}/.test(content)) errors.push(`${relative}: public demo contains a contact-like value`);
  if (relative.endsWith("/index.html")) {
    if (!/http-equiv=["']Content-Security-Policy["']/i.test(content) || !/connect-src\s+'none'/.test(content)) errors.push(`${relative}: missing no-connect CSP`);
    if (!/aria-live=|role=["']status["']/.test(content)) errors.push(`${relative}: missing live status region`);
  }
  if (relative.endsWith(".js")) {
    const syntax = spawnSync("node", ["--check", path.join(root, relative)], { encoding: "utf8" });
    if (syntax.status !== 0) errors.push(`${relative}: JavaScript syntax check failed: ${syntax.stderr.trim()}`);
  }
}

const [indexPage, servicePage, contactScript, sitemap] = await Promise.all([
  fs.readFile(path.join(root, "index.html"), "utf8"),
  fs.readFile(path.join(root, "inquiry-automation.html"), "utf8"),
  fs.readFile(path.join(root, "assets/js/contact.js"), "utf8"),
  fs.readFile(path.join(root, "sitemap.xml"), "utf8"),
]);
const validateCopyControls = (owner, content, expectedCount) => {
  const buttons = [...content.matchAll(/<button\b[^>]*data-copy-brief[^>]*aria-describedby="([^"]+)"[^>]*>\s*문의 내용 작성 양식 복사\s*<\/button>/g)];
  if (buttons.length !== expectedCount) errors.push(`${owner}: expected ${expectedCount} neutral copy controls, found ${buttons.length}`);
  for (const [, statusId] of buttons) {
    const escapedId = statusId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`<[^>]+id="${escapedId}"[^>]*data-copy-status[^>]*(?:role="status"[^>]*)?>`).test(content)) errors.push(`${owner}: copy control status target is missing for ${statusId}`);
  }
};
validateCopyControls("index.html", indexPage, 2);
validateCopyControls("inquiry-automation.html", servicePage, 3);
if (!contactScript.includes("이용하시는 문의 채널에 붙여넣고") || !contactScript.includes("자동 복사에 실패했습니다") || !contactScript.includes("button.closest(\"[data-copy-control]\")")) errors.push("contact.js: local success/failure guidance contract missing");
if (!indexPage.includes('href="inquiry-automation.html"') || !indexPage.includes("<dt>07</dt><dd>완성 사례</dd>") || !indexPage.includes("<dt>06</dt><dd>공개 영상 사례</dd>")) errors.push("index.html: service navigation or public counts are stale");
for (const link of ["case.html?id=pf02", "demos/pf02/", "case.html?id=pf01", "demos/pf01/", "case.html?id=pf04", "demos/pf04/"]) {
  if (!servicePage.includes(`href="${link}"`)) errors.push(`inquiry-automation.html: missing direct service link ${link}`);
}
for (const boundary of ["실제 Google Sheets·Slack·Email에 전송하지 않습니다", "외부 AI가 없는 키워드 점수 방식", "브라우저 메모리의 가상 신청", "AI 정확도 100% 보장"]) {
  if (!servicePage.includes(boundary)) errors.push(`inquiry-automation.html: missing boundary disclosure ${boundary}`);
}
if (!servicePage.includes('rel="canonical" href="https://cetacean916.github.io/portfolio-showcase/inquiry-automation.html"') || !sitemap.includes("https://cetacean916.github.io/portfolio-showcase/inquiry-automation.html")) errors.push("inquiry-automation.html: canonical URL or sitemap entry missing");
if (!sitemap.includes("https://cetacean916.github.io/portfolio-showcase/case.html?id=pf07")) errors.push("sitemap.xml: PF07 case URL missing");
for (const relative of rootPublicFiles.filter((item) => item.endsWith(".js"))) {
  const syntax = spawnSync("node", ["--check", path.join(root, relative)], { encoding: "utf8" });
  if (syntax.status !== 0) errors.push(`${relative}: JavaScript syntax check failed: ${syntax.stderr.trim()}`);
}

const [pf01Index, pf01Script, pf01Style, pf02Index, pf02Script] = await Promise.all([
  fs.readFile(path.join(root, "demos/pf01/index.html"), "utf8"),
  fs.readFile(path.join(root, "demos/pf01/app.js"), "utf8"),
  fs.readFile(path.join(root, "demos/pf01/app.css"), "utf8"),
  fs.readFile(path.join(root, "demos/pf02/index.html"), "utf8"),
  fs.readFile(path.join(root, "demos/pf02/app.js"), "utf8"),
]);
if (!/data-test=["']generate["']/.test(pf01Index) || !/data-test=["']batch-id["']/.test(pf01Index) || !/data-test=["']batch-source["']/.test(pf01Index)) errors.push("pf01: generated-batch controls or disclosure missing");
if (!/crypto\.getRandomValues/.test(pf01Script) || !/function createSyntheticBatch\s*\(/.test(pf01Script) || !/BASE-001/.test(pf01Script) || !/SYN-/.test(pf01Script)) errors.push("pf01: synthetic batch generation contract missing");
if (!["custom-channel", "custom-message", "custom-submit", "custom-status"].every((hook) => pf01Index.includes(`data-test="${hook}"`))) errors.push("pf01: direct-inquiry controls missing");
if (!/규칙 기반 공개 데모/.test(pf01Index) || !/사용을 승인한 AI API.*사내 API.*온프레미스 모델/.test(pf01Index) || !/별도 협의/.test(pf01Index)) errors.push("pf01: demo-versus-delivery AI boundary missing");
if (!/data-test=["']ai-boundary["']/.test(pf01Index) || !/boundary-copy-wide/.test(pf01Index) || !/boundary-copy-compact/.test(pf01Index)) errors.push("pf01: persistent AI boundary markup missing");
if (!/\.boundary-note\.pf01-ai-boundary\s*\{[^}]*position:\s*sticky;[^}]*top:\s*var\(--pf01-topbar-height\);[^}]*font-size:\s*13\.5px;/s.test(pf01Style) || !/--pf01-topbar-height:\s*64px/.test(pf01Style)) errors.push("pf01: persistent AI boundary styling contract missing");
if (!/MAX_CUSTOM_TICKETS\s*=\s*10/.test(pf01Script) || !/MAX_CUSTOM_LENGTH\s*=\s*500/.test(pf01Script) || !/function addCustomInquiry\s*\(/.test(pf01Script) || !/matches\.length/.test(pf01Script) || !/CUSTOM-/.test(pf01Script)) errors.push("pf01: direct-inquiry classification contract missing");
if (/Math\.random\s*\(/.test(pf01Script)) errors.push("pf01: uncontrolled Math.random generation is forbidden");
if (!/data-test=["']browser-notification["']/.test(pf02Index) || !/Slack·Email 전송과 별개/.test(pf02Index)) errors.push("pf02: local notification control or external-boundary disclosure missing");
if (!/Notification\.requestPermission\s*\(/.test(pf02Script) || !/new Notification\s*\(/.test(pf02Script) || !/browserNotificationButton[^\n]+addEventListener\(["']click["']/.test(pf02Script)) errors.push("pf02: user-triggered browser notification contract missing");

const manifest = {
  status: errors.length ? "FAIL" : "PASS",
  checkedAt: new Date().toISOString(),
  products: publicIds,
  registrationProducts: registrationIds,
  demos: demoIds,
  publicFiles,
  assetHashes,
};
await fs.mkdir(path.join(root, "validation"), { recursive: true });
await fs.writeFile(path.join(root, "validation/static-validation.json"), `${JSON.stringify(manifest, null, 2)}\n`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`STATIC_SITE_VALIDATION_PASS: ${projects.length} products, ${demoIds.length} demos, ${Object.keys(assetHashes).length} media files`);
