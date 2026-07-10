# 000003-ADOMigration - Tasks

## Braden Steiner - Last Modified: 2026-07-10

## Story Description

Move the `barcode-generator` repository from GitHub to the company Azure DevOps organization, set
up CI (which this repo does not currently have), and publish `@tecuity/barcode-generator` from an
Azure Artifacts feed instead of public npm. This task assumes the package modernization in
[000001-Node24PublishModernization.md](./000001-Node24PublishModernization.md) is complete and
merged first — do not start this migration on top of the unmodernized build. (The demo-site upgrade
[000002-DemoSiteReact19Upgrade.md](./000002-DemoSiteReact19Upgrade.md) is independent of CI and need
not block the migration.)

**Current state (as of this task file):**
- Source: GitHub (`https://github.com/tecuity/barcode-generator`).
- CI: **none** — there is no `.github/workflows` directory and no pipeline of any kind. CI is
  created fresh in Azure DevOps by this task (there is no GitHub Actions workflow to delete).
- Publishing: public npm as `@tecuity/barcode-generator` (`publishConfig.access: public`), released
  via `np`. Verify with `npm view @tecuity/barcode-generator` (Task 2).
- Package: `@tecuity/barcode-generator` (version per 000001 — expected `1.3.0`); no `.npmrc`.

**Target state:**
- Source: Azure DevOps Git repo under the company organization.
- CI: Azure Pipelines running install → build → test on **Node 24.x**.
- Publishing: Azure Artifacts private feed, replacing public npm publishing.

---

## Acceptance Criteria

1. All git history, branches, and tags are mirrored to the Azure DevOps repo without loss.
2. All developers have updated their local `origin` remote to point at the Azure DevOps repo.
3. Azure Pipelines CI passes (install, build, test) on a clean run from the ADO repo, on Node 24.x.
4. `@tecuity/barcode-generator` is published to the Azure Artifacts feed and is resolvable via
   `npm view` against that feed.
5. Every repo that consumes `@tecuity/barcode-generator` installs it from the Azure Artifacts feed
   without errors.
6. The GitHub repository is archived with a redirect notice.
7. Local developer auth for `@tecuity/*` packages from the new feed is documented.

---

## Developer Notes

**Do 000001 first.** This migration wires CI to `npm run build` and `npm run test:ci`. Both must
exist and pass (they are created in 000001 Phase 1 and Phase 3). Running this migration against the
current Rollup 1 build with a placeholder test would produce a red pipeline.

**No existing CI to migrate — CI is net-new.** Unlike a repo moving off GitHub Actions, this repo
has no pipeline today. Phase 2 creates the Azure Pipeline from scratch; there is no workflow file
to delete afterward.

**Currently on public npm — this is a publish-target change, not just an auth change.** Migrating
to an Azure Artifacts feed means the package stops being published to public npm. Confirm this is
intended (Task 2). Every consumer must be repointed at the feed (Phase 4), and the public npm
package should either be deprecated or left as-is at its last public version — decide and document.

**Scoped `.npmrc` is critical.** Use `@tecuity:registry=...` (scoped), not `registry=...` (global).
A global registry override routes *all* installs — rollup, vitest, babel, etc. — through the feed;
unless the feed has an upstream public-npm source configured, `npm ci` will fail to resolve them.
The scoped entry routes only `@tecuity/*` to the feed and leaves everything else on public npm.

**Verify publish before updating consumers.** Do not start Phase 4 until Task 16 confirms the
package is reachable from the new feed.

---

# Phase 0 — Pre-migration confirmation and feed setup

## Task 1: [ ] Confirm Azure DevOps organization and project

Identify the Azure DevOps organization URL and the project where the repo will live (e.g.
`https://dev.azure.com/<org>/<project>`). Confirm you have permissions to create repos and Artifact
feeds in that project.

**Files:** None

**Acceptance Criteria:** AC 3

**History:**

---

## Task 2: [ ] Confirm current publish target and decide the public-npm fate

Run:
```
npm view @tecuity/barcode-generator
```
- It should return package info from public npm (the repo has `publishConfig.access: public`).
- Decide what happens to the public package after migration: **deprecate** it with a pointer to the
  private feed (`npm deprecate @tecuity/barcode-generator "moved to internal Azure Artifacts feed"`),
  or leave the last public version published and simply stop publishing new versions publicly.
- Record the decision here — it affects Phase 5 and any external consumers.

**Files:** None

**Acceptance Criteria:** AC 4

**History:**

---

## Task 3: [ ] Create an Azure Artifacts feed

In the Azure DevOps project, create a new Artifacts feed named `barcode-generator` (or use an
existing company-wide feed if one exists). Set visibility to **private/organization-only**. If the
feed should also resolve public packages, add **npmjs** as an upstream source.

Note the feed's npm registry URL:
```
https://pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/
```

**Files:** None

**Acceptance Criteria:** AC 4

**History:**

---

# Phase 1 — Repository migration (GitHub → Azure DevOps)

## Task 4: [ ] Create a new repo in Azure DevOps

In the Azure DevOps project, create a new Git repository named `barcode-generator`. Do not
initialize it with a README.

Note the clone URL:
```
https://<org>@dev.azure.com/<org>/<project>/_git/barcode-generator
```

**Files:** None

**Acceptance Criteria:** AC 1

**History:**

---

## Task 5: [ ] Mirror all history, branches, and tags from GitHub

From a bare mirror clone (preserves all refs), push a complete mirror to Azure DevOps:

```bash
git clone --mirror https://github.com/tecuity/barcode-generator.git barcode-generator-mirror
cd barcode-generator-mirror
git remote add azure https://dev.azure.com/<org>/<project>/_git/barcode-generator
git push azure --mirror
```

Verify in Azure DevOps that all branches and tags (including the release tags like `v1.2.1` and the
new `v1.3.0` from 000001) are present.

**Files:** None

**Acceptance Criteria:** AC 1

**History:**

---

## Task 6: [ ] Update local clone remotes

For every developer with the repo cloned locally:

```bash
git remote set-url origin https://dev.azure.com/<org>/<project>/_git/barcode-generator
```

Verify with `git remote -v`.

**Files:** None

**Acceptance Criteria:** AC 2

**History:**

---

## Task 7: [ ] Set the default branch in Azure DevOps

In Azure DevOps repo settings, confirm `master` is set as the default branch to match the GitHub
configuration.

**Files:** None

**Acceptance Criteria:** AC 1

**History:**

---

## Task 8: [ ] Recreate branch policies

If the GitHub repo has branch protection on `master`, recreate it as Azure DevOps branch policies
(Repo → Branches → `master` → Branch policies):
- **Require a minimum number of reviewers**
- **Build validation** — add the Azure Pipeline from Task 10 as a required check

**Files:** None

**Acceptance Criteria:** AC 3

**History:**

---

# Phase 2 — CI pipeline (net-new)

## Task 9: [ ] Create `azure-pipelines.yml` at the repo root

Create `C:\repos\barcode-generator\azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - master

pr:
  branches:
    include:
      - master

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '24.x'
    displayName: 'Install Node.js'

  - task: npmAuthenticate@0
    inputs:
      workingFile: .npmrc
    displayName: 'Authenticate with Azure Artifacts'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm run build
    displayName: 'Build'

  - script: npm run test:ci
    displayName: 'Run tests'
```

> `npm run test:ci` exists after 000001 Phase 3. `npmAuthenticate` must run before `npm ci` because
> the scoped `.npmrc` (Task 11) routes `@tecuity/*` resolution to the feed.

**Files:**
- `azure-pipelines.yml` *(new)*

**Acceptance Criteria:** AC 3

**History:**

---

## Task 10: [ ] Create the pipeline in Azure DevOps

Pipelines → New Pipeline → Azure Repos Git → select `barcode-generator` → "Existing Azure Pipelines
YAML file" → point at `azure-pipelines.yml`. Run it once manually to confirm it passes.

**Files:** None

**Acceptance Criteria:** AC 3

**History:**

---

# Phase 3 — Publishing to Azure Artifacts

## Task 11: [ ] Add `.npmrc` for the Azure Artifacts feed

Create `C:\repos\barcode-generator\.npmrc`:

```
@tecuity:registry=https://pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/
//pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/:_authToken=${AZURE_ARTIFACTS_TOKEN}
always-auth=true
```

Use a **scoped** registry (`@tecuity:registry=...`), not a global `registry=...` — see Developer
Notes.

**Files:**
- `.npmrc` *(new)*

**Acceptance Criteria:** AC 4, AC 5

**History:**

---

## Task 12: [ ] Point `publishConfig` at the feed

`package.json` currently has `publishConfig.access: public` (public npm). Change it to publish to
the Azure Artifacts feed:

```json
"publishConfig": {
  "registry": "https://pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/"
}
```

Remove `access: public` (irrelevant for a private feed). Note: `np` publishes from `dist/` with a
copied `package.json`, so confirm this `publishConfig` is present in the copied `dist/package.json`
at publish time.

**Files:**
- `package.json`

**Acceptance Criteria:** AC 4

**History:**

---

## Task 13: [ ] Create an Azure Artifacts PAT

In Azure DevOps, generate a PAT with **Packaging (read & write)** scope. Store it as a secret
pipeline variable named `AZURE_ARTIFACTS_TOKEN` in the pipeline from Phase 2. This replaces npm
publish auth.

**Files:** None

**Acceptance Criteria:** AC 4

**History:**

---

## Task 14: [ ] Add a CI publish step

Add a publish step to `azure-pipelines.yml` that runs on `master` after a green build/test. Since
`np` is interactive, use a non-interactive publish from `dist/` in CI:

```yaml
  - script: |
      npm run build
      node -e "require('fs').copyFileSync('package.json','dist/package.json')"
      cd dist && npm publish
    displayName: 'Publish to Azure Artifacts'
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/master'))
```

(`np` remains the tool for local, human-driven releases; CI uses the plain `npm publish` from
`dist/` to avoid interactive prompts.) The `npmAuthenticate` task from Task 9 provides publish
auth.

**Files:**
- `azure-pipelines.yml`

**Acceptance Criteria:** AC 4

**History:**

---

## Task 15: [ ] Document local developer authentication

Developers need a token to `npm install` `@tecuity/*` once the scoped `.npmrc` is in place:

```powershell
# Option 1 — vsts-npm-auth (Windows, auto-refreshes)
npx vsts-npm-auth -config .npmrc

# Option 2 — set the env var manually (PAT from Azure DevOps → User Settings → PATs)
$env:AZURE_ARTIFACTS_TOKEN = "<your-PAT>"
```

Add to team onboarding docs. Without it, `npm install` fails with 401 on any `@tecuity/*` package.

**Files:** None (onboarding doc update)

**Acceptance Criteria:** AC 7

**History:**

---

## Task 16: [ ] Verify end-to-end publish before updating consumers

1. Trigger a manual pipeline run on `master` to publish to Azure Artifacts.
2. In Azure DevOps → Artifacts → `<feed>`, confirm `@tecuity/barcode-generator` appears.
3. From a local authenticated machine:
   ```
   npm view @tecuity/barcode-generator --registry https://pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/
   ```
   Confirm it returns the expected version.

Do not proceed to Phase 4 until this passes.

**Files:** None — verification only

**Acceptance Criteria:** AC 4

**History:**

---

# Phase 4 — Repoint consumers

## Task 17: [ ] Repoint consuming repos at the feed

Identify every repo that depends on `@tecuity/barcode-generator` (search the org for the package
name in `package.json`). For each, add or update its `.npmrc` to route the `@tecuity` scope to the
Azure Artifacts feed:

```
@tecuity:registry=https://pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/
//pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/:_authToken=${AZURE_ARTIFACTS_TOKEN}
always-auth=true
```

Only proceed once Task 16 confirms the package is reachable.

**Files:**
- `.npmrc` in each consuming repo *(new or updated)*

**Acceptance Criteria:** AC 5

**History:**

---

## Task 18: [ ] Reinstall and verify in consumers

In each consuming repo, reinstall (`npm install` / `yarn install` per that repo's package manager)
and confirm `@tecuity/barcode-generator` resolves from the Azure Artifacts feed (check the lockfile
for the resolved URL). Confirm the consumer builds.

**Files:**
- Lockfile in each consuming repo — updated resolved URL

**Acceptance Criteria:** AC 5

**History:**

---

## Task 19: [ ] Update consumer CI auth

Any consuming repo's CI that installs `@tecuity/*` now needs feed auth before install:
- **Azure Pipelines:** add `npmAuthenticate@0` (pointing at that repo's `.npmrc`) before install.
- **GitHub Actions:** add `AZURE_ARTIFACTS_TOKEN` as a secret and expose it during install.

Without this, consumer CI fails with 401 on `@tecuity/barcode-generator`.

**Files:**
- CI config in each consuming repo

**Acceptance Criteria:** AC 5

**History:**

---

# Phase 5 — Decommission GitHub

## Task 20: [ ] Add a redirect notice to the GitHub repo

Add `DEPRECATED.md` at the GitHub repo root:

```markdown
# Moved

This repository has been moved to the company Azure DevOps organization.
The GitHub repo is archived and no longer maintained.

New location: https://dev.azure.com/<org>/<project>/_git/barcode-generator
```

If Task 2 decided to deprecate the public npm package, also run the `npm deprecate` command here.
Commit and push to GitHub before archiving.

**Files:**
- `DEPRECATED.md` *(new, on GitHub)*

**Acceptance Criteria:** AC 6

**History:**

---

## Task 21: [ ] Archive the GitHub repository

GitHub repo settings → Danger Zone → Archive this repository. This makes it read-only and signals
that it has moved.

**Files:** None

**Acceptance Criteria:** AC 6

**History:**
