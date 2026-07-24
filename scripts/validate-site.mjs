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
const registrationRoot = path.resolve(process.env.PORTFOLIO_REGISTRATION_ROOT || path.resolve(root, "../등록 준비/00-크몽"));
const productRoot = path.resolve(process.env.PORTFOLIO_PRODUCT_ROOT || path.resolve(root, "../유형별 포트폴리오"));
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
  if (pf07MediaManifest.schema !== "pf07.localized-showcase-media-manifest.v2"
    || pf07MediaManifest.state !== "CURRENT_RELEASE_BOUND"
    || pf07MediaManifest.case_id !== "pf07"
    || pf07MediaManifest.classification !== "PUBLIC_SANITIZED_LOCALIZED_RUNTIME_MEDIA"
    || pf07MediaManifest.metadata_stripped !== true
    || pf07MediaManifest.registration_manifest_case_count !== 6
    || pf07MediaManifest.release?.release_tag !== "pf07-v1.0.3") {
    errors.push("pf07: localized media manifest identity or six-case boundary failed");
  }
} catch (error) {
  errors.push(`pf07: media manifest unavailable: ${error.message}`);
}
try {
  await validatePf07ExecutionMedia({
    mediaRoot: path.join(root, "assets/media/pf07"),
  });
} catch (error) {
  errors.push(`pf07: execution media semantics failed: ${error.message}`);
}
try {
  const proofBytes = await fs.readFile(path.join(root, "assets/media/pf07/execution-proof.json"));
  const manifestBuilder = await fs.readFile(path.join(root, "assets/media/pf07/provenance/build-v1.0.3-showcase-manifests.mjs"));
  const manifestBuilderSource = manifestBuilder.toString("utf8");
  if (pf07MediaManifest?.execution_proof?.sha256 !== sha256(proofBytes)
    || !manifestBuilderSource.includes('release_tag: "pf07-v1.0.3"')
    || !manifestBuilderSource.includes('package_build_id: "pf07-build-c14f8fe0b8e95bea97bf"')) {
    errors.push("pf07: localized execution proof or deterministic manifest builder commitment failed");
  }
} catch (error) {
  errors.push(`pf07: localized execution provenance unavailable: ${error.message}`);
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

let pf07CurrentUiManifest;
const pf07CurrentUiRoot = path.join(root, "assets/media/pf07/current-ui");
try {
  pf07CurrentUiManifest = JSON.parse(await fs.readFile(path.join(root, "assets/media/pf07/current-ui-manifest.json"), "utf8"));
  const declared = pf07CurrentUiManifest.assets || [];
  const actual = (await walk(pf07CurrentUiRoot)).map((absolute) => path.relative(pf07CurrentUiRoot, absolute).split(path.sep).join("/")).sort();
  const declaredNames = declared.map((asset) => asset.filename).sort();
  const expectedCoreSurfaces = [
    "storefront-home-desktop", "storefront-home-mobile", "storefront-shop-desktop",
    "product-detail-desktop", "cart-desktop", "checkout-desktop", "order-complete-desktop",
    "operator-console-desktop", "runtime-hub-desktop", "operator-failed-desktop",
    "operator-retrying-desktop", "operator-recovered-desktop",
  ];
  const surfaceSet = (locale) => declared.filter((asset) => asset.locale === locale).map((asset) => asset.surface).sort();
  if (pf07CurrentUiManifest.schema !== "pf07.current-ui-manifest.v3"
    || pf07CurrentUiManifest.state !== "CURRENT_RELEASE_BOUND"
    || pf07CurrentUiManifest.case_id !== "pf07"
    || pf07CurrentUiManifest.classification !== "PUBLIC_SANITIZED_RUNTIME_CAPTURE"
    || pf07CurrentUiManifest.metadata_stripped !== true
    || pf07CurrentUiManifest.release?.package_version !== "1.0.3"
    || pf07CurrentUiManifest.release?.release_tag !== "pf07-v1.0.3"
    || pf07CurrentUiManifest.release?.package_build_id !== "pf07-build-c14f8fe0b8e95bea97bf"
    || pf07CurrentUiManifest.release?.artifact_set_sha256 !== "74b458a861d51da2e681b1201f138527731a2b87cde38f2f5f47438b3d20833e"
    || pf07CurrentUiManifest.release?.linux_package_sha256 !== "cd60c8b6b280f1347123262d4895b0fdf53e8d6de07eb59020d57fb8c4c67f2e"
    || pf07CurrentUiManifest.release?.linux_package_manifest_sha256 !== "4507f33a5c79d8fdf019023fecbcffc8664c2e8078a1edbfd88b83d6d37e43aa"
    || pf07CurrentUiManifest.exact_file_count !== 24
    || declared.length !== 24
    || pf07CurrentUiManifest.locale_asset_counts?.ko !== 12
    || pf07CurrentUiManifest.locale_asset_counts?.en !== 12
    || new Set(declared.map((asset) => asset.asset_id)).size !== 24
    || JSON.stringify(surfaceSet("en")) !== JSON.stringify(expectedCoreSurfaces.slice().sort())
    || JSON.stringify(surfaceSet("ko")) !== JSON.stringify(expectedCoreSurfaces.slice().sort())
    || JSON.stringify(actual) !== JSON.stringify(declaredNames)) {
    errors.push("pf07: current UI manifest identity or exact file set failed");
  }
  for (const asset of declared) {
    const bytes = await fs.readFile(path.join(pf07CurrentUiRoot, asset.filename));
    const dimensions = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    const chunks = [];
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = bytes.readUInt32BE(offset);
      chunks.push(bytes.subarray(offset + 4, offset + 8).toString("ascii"));
      offset += 12 + length;
    }
    if (!/^(?:ko|en)\//.test(asset.filename)
      || !asset.filename.startsWith(`${asset.locale}/`)
      || !/^PF07-CURRENT-(?:KO|EN)-/.test(asset.asset_id)
      || !["ko_KR", "en_US"].includes(asset.runtime_locale)
      || !asset.source_route
      || !["still_capture", "localized_recording", "retry_state_capture"].includes(asset.source_kind)
      || !asset.capture_authority?.startsWith("assets/media/pf07/provenance/")
      || !/^[0-9a-f]{64}$/.test(asset.capture_authority_sha256 || "")
      || asset.transformation !== "capture-promoted-without-pixel-mutation"
      || !/^ACCEPTED_/.test(asset.direct_review_result || "")
      || asset.metadata_stripped !== true
      || !/^[0-9a-f]{64}$/.test(asset.sha256)
      || sha256(bytes) !== asset.sha256
      || bytes.length !== asset.bytes
      || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
      || dimensions[0] !== asset.width
      || dimensions[1] !== asset.height
      || chunks.some((type) => ["tEXt", "zTXt", "iTXt", "eXIf"].includes(type))) {
      errors.push(`pf07: current UI asset integrity failed ${asset.filename}`);
    }
  }
} catch (error) {
  errors.push(`pf07: current UI manifest unavailable: ${error.message}`);
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
        if (relative.startsWith("assets/media/pf07/refinement/")) {
          const candidateRelative = relative.replace(/^assets\/media\/pf07\/refinement\//, "");
          const committed = pf07RefinementAllowlist?.exact_file_set?.find((file) => file.relative_path === candidateRelative);
          if (!committed || committed.sha256 !== assetHashes[relative]) errors.push(`${relative}: PF07 refinement allowlist hash mismatch`);
        } else if (relative.startsWith("assets/media/pf07/current-ui/")) {
          const filename = relative.replace(/^assets\/media\/pf07\/current-ui\//, "");
          const current = pf07CurrentUiManifest?.assets?.find((asset) => asset.filename === filename);
          if (!current || current.sha256 !== assetHashes[relative]) errors.push(`${relative}: PF07 current UI manifest hash mismatch`);
        } else {
          errors.push(`${relative}: PF07 image is outside the refinement and current UI authorities`);
        }
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
    const stableReleasePrefix = "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.3/";
    const expectedReleaseAssets = [
      ["pf07-windows-x64-1.0.3.zip", "969dfb6d5dab0c9dbe82554f9329abce5f8917804754b5ad2806a1168930ad80"],
      ["pf07-windows-kvm-test-kit-1.0.3.zip", "6a8df9b9385ce0b7f85ccd192a0d716db7098641703c3d9e5d30e4474d065703"],
      ["pf07-macos-universal-1.0.3.zip", "68062ddf03ec688b37e8f17422655e889165c325d91173dd341fdf405ff7aa22"],
      ["pf07-linux-x86_64-1.0.3.tar.gz", "cd60c8b6b280f1347123262d4895b0fdf53e8d6de07eb59020d57fb8c4c67f2e"],
      ["pf07-linux-server-1.0.3.tar.gz", "33fb64edd845273ccc322fe358c0143e359c05c80ca0542fa62da2f363a1a2e4"],
    ];
    const expectedPostCandidateIds = ["CASE-017", "CASE-018", "CASE-019", "CASE-020"];
    const expectedConnectedIds = ["CASE-014", "CASE-015", "CASE-016"];
    if (!refinement?.repositoryUrl || !refinement?.mediaBase || !refinement?.locales?.ko || !refinement?.locales?.en) errors.push("pf07: bilingual refinement contract is incomplete");
    if (project.caseUrl !== "case-pf07-ko.html"
      || ![project.image, ...project.gallery].every((relative) => relative.startsWith("assets/media/pf07/current-ui/ko/"))) {
      errors.push("pf07: canonical static case or Korean card media binding failed");
    }
    if (refinement?.currentDelivery?.buildId !== "pf07-build-c14f8fe0b8e95bea97bf"
      || refinement?.currentDelivery?.artifactSetSha256 !== "74b458a861d51da2e681b1201f138527731a2b87cde38f2f5f47438b3d20833e"
      || refinement?.currentDelivery?.publicationState !== "PUBLIC_PACKAGE_RELEASE_PASS"
      || refinement?.currentDelivery?.releaseTag !== "pf07-v1.0.3"
      || refinement?.currentDelivery?.immutablePredecessorTag !== "pf07-v1.0.2") {
      errors.push("pf07: current public delivery identity or immutable predecessor boundary failed");
    }
    if (refinement?.releaseUrl !== "https://github.com/Cetacean916/oddroom-woo-orderops/releases/tag/pf07-v1.0.3") errors.push("pf07: stable release page URL is missing or incorrect");
    if (!Array.isArray(refinement?.releaseAssets)
      || refinement.releaseAssets.length !== 5
      || JSON.stringify(refinement.releaseAssets.map((asset) => [asset.filename, asset.sha256])) !== JSON.stringify(expectedReleaseAssets)
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
    if (!Array.isArray(refinement?.connectedAssets)
      || refinement.connectedAssets.length !== 3
      || JSON.stringify(refinement.connectedAssets.map((relative) => relative.match(/CASE-0(?:14|15|16)/)?.[0])) !== JSON.stringify(expectedConnectedIds)
      || refinement.connectedAssets.some((relative) => !pf07RefinementAllowlist?.exact_file_set?.some((file) => file.relative_path === relative))) {
      errors.push("pf07: connected CASE-014 through CASE-016 mapping is incomplete or unbound");
    }
    if (/[ㄱ-ㆎ가-힣]/.test(JSON.stringify(refinement?.locales?.en || {}))) errors.push("pf07: English-only copy contains Hangul");
    for (const locale of [refinement?.locales?.ko, refinement?.locales?.en]) {
      for (const field of ["title", "lead", "summary", "pathSteps", "surfaces", "recoveryLabels", "connectedLabels", "packages", "downloadLabels", "finalProofLabels", "fit", "nonFit", "boundary"]) {
        if (!locale?.[field] || (Array.isArray(locale[field]) && locale[field].length < 3)) errors.push(`pf07: incomplete localized field ${field}`);
      }
      for (const field of ["downloadAction", "finalProofTitle", "finalProofIntro"]) if (!locale?.[field]) errors.push(`pf07: incomplete localized field ${field}`);
      if (locale?.downloadLabels?.length !== 5 || locale?.finalProofLabels?.length !== 4) errors.push("pf07: localized download or final-proof cardinality failed");
      if (!locale?.orientation?.title
        || !locale?.orientation?.body
        || !locale?.overview?.title
        || !locale?.overview?.description
        || !locale?.overview?.handoff
        || locale?.overview?.shopperSteps?.length !== 3
        || locale?.overview?.operatorSteps?.length !== 3
        || locale?.media?.items?.length !== 3) {
        errors.push("pf07: buyer-first orientation, two-lane overview, or guided media contract is incomplete");
      }
      const language = locale?.htmlLang;
      const expectedMediaIds = ["guided", "purchase", "recovery"];
      if (JSON.stringify(locale?.media?.items?.map((item) => item.id)) !== JSON.stringify(expectedMediaIds)
        || locale?.media?.items?.some((item) => !item.src?.includes(`/videos/${language}/`)
          || !item.poster?.includes(`/posters/${language}/`)
          || !item.captions?.includes(`/captions/${language}/`)
          || !Array.isArray(item.chapters)
          || item.chapters.length < 5)) {
        errors.push(`pf07: ${language} localized media binding or chapter inventory failed`);
      }
    }
    const ko = refinement?.locales?.ko;
    if (ko?.orientation?.title !== "각자의 자리에서, 필요한 경험에 집중하도록."
      || ko?.orientation?.body !== "고객은 상품을 살펴보고 주문을 마치는 데 집중합니다. 운영 과정은 구매 경험과 섞이지 않으며, 운영자는 접수된 주문의 상태 확인부터 필요한 조치까지 하나의 흐름 안에서 관리합니다."
      || ko?.overview?.title !== "구매 경험과 주문 운영을 한눈에."
      || ko?.overview?.handoff !== "고객은 구매를 온전히 마치고, 운영자는 그 주문을 자연스럽게 이어받습니다.") {
      errors.push("pf07: approved buyer-oriented Korean orientation copy drifted");
    }
    for (const phrase of ["formal exactly-once", "실결제", "DEMO_MODE", "CONNECTED_MODE", "0 KRW"]) if (!JSON.stringify(project).toLowerCase().includes(phrase.toLowerCase())) errors.push(`pf07: claims boundary missing ${phrase}`);
  }
}

const rootPublicFiles = [
  "index.html", "inquiry-automation.html", "case.html", "case-pf07-ko.html", "case-pf07-en.html", "404.html", "assets/css/styles.css", "assets/css/demo-integration.css", "assets/css/pf07-case.css",
  "assets/js/projects.js", "assets/js/main.js", "assets/js/case.js", "assets/js/contact.js", "assets/media/pf07/media-manifest.json", "assets/media/pf07/media-allowlist.json", "assets/media/pf07/current-ui-manifest.json", "assets/media/pf07/execution-proof.json", "site.webmanifest", "robots.txt", "sitemap.xml",
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

const [indexPage, servicePage, contactScript, sitemap, pf07KoPage, pf07EnPage] = await Promise.all([
  fs.readFile(path.join(root, "index.html"), "utf8"),
  fs.readFile(path.join(root, "inquiry-automation.html"), "utf8"),
  fs.readFile(path.join(root, "assets/js/contact.js"), "utf8"),
  fs.readFile(path.join(root, "sitemap.xml"), "utf8"),
  fs.readFile(path.join(root, "case-pf07-ko.html"), "utf8"),
  fs.readFile(path.join(root, "case-pf07-en.html"), "utf8"),
]);
const pf07FontAssets = {
  "assets/fonts/PretendardVariable.woff2": "9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4",
  "assets/fonts/NotoSerifKR-Variable-PF07Subset.woff2": "e5c26900eed5d9b3a6ddfd2979a64637ecd5671884e3af5b6f764459383605e3",
  "assets/fonts/Pretendard-OFL.txt": "82e9c8a4b203261f10ddba1296422d64914ff3d4b7bd8a12896d03f0f088d70a",
  "assets/fonts/NotoSerifKR-OFL.txt": "5e0da210fb04058a8c0087985d2d456b931c2579811a49655721d3cf0c36b6d6",
};
for (const [relative, expectedSha256] of Object.entries(pf07FontAssets)) {
  try {
    const bytes = await fs.readFile(path.join(root, relative));
    if (sha256(bytes) !== expectedSha256) errors.push(`pf07: governed font asset hash mismatch ${relative}`);
  } catch (error) {
    errors.push(`pf07: governed font asset unavailable ${relative}: ${error.message}`);
  }
}
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
for (const [language, source, locale, ogAsset] of [
  ["ko", pf07KoPage, "ko_KR", "BRAND-007_og-ko.png"],
  ["en", pf07EnPage, "en_US", "BRAND-008_og-en.png"],
]) {
  const canonicalUrl = `https://cetacean916.github.io/portfolio-showcase/case-pf07-${language}.html`;
  if (!source.includes(`<html lang="${language}">`)
    || !source.includes(`<meta property="og:locale" content="${locale}">`)
    || !source.includes(`<meta property="og:url" content="${canonicalUrl}">`)
    || !source.includes(`<link rel="canonical" href="${canonicalUrl}">`)
    || !source.includes(`<link rel="preload" href="assets/fonts/PretendardVariable.woff2" as="font" type="font/woff2" crossorigin>`)
    || !source.includes(`<link rel="preload" href="assets/fonts/NotoSerifKR-Variable-PF07Subset.woff2" as="font" type="font/woff2" crossorigin>`)
    || !source.includes(`assets/media/pf07/refinement/brand/${ogAsset}`)
    || !source.includes(`window.PF07_STATIC_CASE_ID = "pf07"; window.PF07_STATIC_LANGUAGE = "${language}";`)) {
    errors.push(`case-pf07-${language}.html: static localized metadata or route authority failed`);
  }
  if (!sitemap.includes(canonicalUrl)) errors.push(`sitemap.xml: PF07 ${language} static case URL missing`);
}
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
