#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTFOLIO_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"
REGISTRATION_ROOT="${PORTFOLIO_ROOT}/등록 준비/00-크몽"
PRODUCT_ROOT="${PORTFOLIO_ROOT}/유형별 포트폴리오"
MANIFEST="${REGISTRATION_ROOT}/registration-manifest.json"
SCRATCH_ROOT="${PORTFOLIO_SCRATCH_ROOT:-${TMPDIR:-/tmp}}"
products=(oddroom pf01 pf02 pf03 pf04 pf06)
video_products=(pf01 pf02 pf03 pf04 pf06)
pf07_media="${ROOT_DIR}/assets/media/pf07"
pf07_refinement_asset_root="${PORTFOLIO_ROOT}/기타 세팅 및 에셋/PF07-이미지-에셋"
pf07_refinement_public_root="${pf07_refinement_asset_root}/public-assets"
pf07_refinement_ledger="${pf07_refinement_asset_root}/final-public-asset-ledger.json"

command -v jq >/dev/null || { printf 'ERROR: jq is required\n' >&2; exit 1; }
command -v rsync >/dev/null || { printf 'ERROR: rsync is required\n' >&2; exit 1; }
jq -e '.status == "REGISTRATION_READY" and (.portfolioCases | length) == 6' "${MANIFEST}" >/dev/null

mkdir -p "${SCRATCH_ROOT}"
stage="$(mktemp -d "${SCRATCH_ROOT}/portfolio-public-assets.XXXXXX")"
trap 'rm -rf "${stage}"' EXIT

for product in "${products[@]}"; do
  relative="$(jq -er --arg id "${product}" '.portfolioCases[] | select(.id == $id) | .folder' "${MANIFEST}")"
  source="${REGISTRATION_ROOT}/${relative}"
  target="${stage}/${product}"
  mkdir -p "${target}"
  cp -f "${source}/portfolio-main-image.png" "${target}/main-image.png"
  cp -f "${source}/detail-01-overview.png" "${target}/detail-01-overview.png"
  cp -f "${source}/detail-02-flow.png" "${target}/detail-02-flow.png"
  cp -f "${source}/detail-03-result.png" "${target}/detail-03-result.png"
done

for product in "${video_products[@]}"; do
  relative="$(jq -er --arg id "${product}" '.portfolioCases[] | select(.id == $id) | .folder' "${MANIFEST}")"
  cp -f "${REGISTRATION_ROOT}/${relative}/demo-video.mp4" "${stage}/${product}/demo-video.mp4"
done

cp -f "${PRODUCT_ROOT}/01-AI-고객문의-요약분류-자동화/screenshots/16-registration-trial-result.png" "${stage}/pf01/video-poster.png"
cp -f "${PRODUCT_ROOT}/02-구글폼-웹훅-시트-알림-자동화/screenshots/16-registration-trial-result.png" "${stage}/pf02/video-poster.png"
cp -f "${PRODUCT_ROOT}/03-엑셀-CSV-정리-리포트-자동화/screenshots/16-registration-trial-results.png" "${stage}/pf03/video-poster.png"
cp -f "${PRODUCT_ROOT}/04-근태-휴가-출장-미니-업무관리/screenshots/14-registration-trial-decisions.png" "${stage}/pf04/video-poster.png"

for required in main-image.png detail-01-overview.png detail-02-flow.png detail-03-result.png video-poster.png demo-video.mp4 recovery-clip.mp4 media-manifest.json; do
  test -f "${pf07_media}/${required}" || { printf 'ERROR: PF07 sanitized media missing: %s\n' "${required}" >&2; exit 1; }
done
mkdir -p "${stage}/pf07"
rsync --archive --exclude 'refinement/' --exclude 'media-allowlist.json' "${pf07_media}/" "${stage}/pf07/"
test -f "${pf07_refinement_ledger}" || { printf 'ERROR: PF07 refinement ledger missing\n' >&2; exit 1; }
test -f "${pf07_refinement_public_root}/PUBLIC-ASSET-MANIFEST.txt" || { printf 'ERROR: PF07 refinement public asset root missing\n' >&2; exit 1; }
mkdir -p "${stage}/pf07/refinement"
rsync --archive --delete "${pf07_refinement_public_root}/" "${stage}/pf07/refinement/"
node "${ROOT_DIR}/scripts/build-pf07-showcase-media-allowlist.mjs" \
  "${pf07_refinement_ledger}" \
  "${pf07_refinement_public_root}" \
  "${stage}/pf07"

rsync --archive --delete-delay --delay-updates "${stage}/" "${ROOT_DIR}/assets/media/"
echo "PUBLIC_ASSETS_SYNCED: 7 cases, PF07 refinement allowlist included, registration manifest retained at 6 cases"
