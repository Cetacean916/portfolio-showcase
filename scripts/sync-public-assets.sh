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

for required in media-manifest.json current-ui-manifest.json execution-proof.json media-allowlist.json; do
  test -f "${pf07_media}/${required}" || { printf 'ERROR: PF07 sanitized media missing: %s\n' "${required}" >&2; exit 1; }
done
for required_dir in current-ui videos posters captions proof provenance refinement; do
  test -d "${pf07_media}/${required_dir}" || { printf 'ERROR: PF07 localized media directory missing: %s\n' "${required_dir}" >&2; exit 1; }
done
mkdir -p "${stage}/pf07"
rsync --archive "${pf07_media}/" "${stage}/pf07/"

rsync --archive --delete-delay --delay-updates "${stage}/" "${ROOT_DIR}/assets/media/"
echo "PUBLIC_ASSETS_SYNCED: 7 cases, release-bound PF07 1.0.3 media preserved, registration manifest retained at 6 cases"
