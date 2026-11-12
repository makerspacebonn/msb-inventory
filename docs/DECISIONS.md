# Decisions

One entry per decision between options: context, options, decision, evidence, revisit-when. Numbers follow the cross-project playbook where a decision was made there.

## D3: Container registry stays Docker Hub (2026-11-12)

- **Context:** The playbook moves new projects to GitHub Container Registry (GHCR). msb-inventory already publishes to Docker Hub from `.github/workflows/main.yml`, and production pulls from there.
- **Options:** migrate to GHCR; stay on Docker Hub.
- **Decision:** stay on Docker Hub. GHCR is only for new projects.
- **Evidence:** working pipeline and deployment; migrating changes the image name on the server and the CI secrets for no user-visible gain.
- **Revisit when:** Docker Hub limits or pricing affect pulls or pushes, or the deployment is rebuilt anyway.
