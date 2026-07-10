# Repository Governance

## Classification

- Class: public development repository
- Purpose: deploy the curated static portfolio showcase with GitHub Pages
- Default branch: `main`
- Working branches: `feature/*`, `fix/*`, or `docs/*`

## Publication Boundary

Only public-facing static assets belong in this repository:

- HTML, CSS, and browser JavaScript
- reviewed, network-free browser trials under `demos/`
- bundled open-license fonts and their license notice
- registration-safe portfolio images
- approved PF01, PF02, PF03, PF04, and PF06 demonstration videos and reviewed posters
- public metadata, license, and repository documentation

Do not commit internal registration copy, validation reports, browser profiles,
test screenshots, build caches, dependency folders, local paths, credentials,
raw logs, archives, database files, or unreviewed media.

## Required Gates

Before every commit:

1. Review the staged inventory and complete diff.
2. Scan filenames and content for credentials, personal data, local paths, and
   unexpected binary files.
3. Verify that all published media is intentional and covered by
   `ASSET-NOTICE.md`.
4. Verify the static site locally at desktop and mobile widths.

Before every public push:

1. Re-run the checks against the complete outgoing history.
2. Confirm the GitHub remote, `PUBLIC` visibility, and target branch.
3. Obtain an independent public-security review.
4. Verify the deployed index, every case route, and representative media over
   HTTPS after GitHub Pages finishes deploying.

## Source Relationship

This repository is a curated deployment copy. It is not the editing authority
for the underlying portfolio projects or registration package. Changes to the
source projects are validated first, then explicitly copied here.
