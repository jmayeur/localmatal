You are helping create a pull request for the localmatal project. The user may have provided a change description in $ARGUMENTS — use it throughout to scope commits, name the branch, and write the PR body.

---

## Step 1 — Understand the change

Run `git diff --name-only HEAD` and `git status --short` to see what's changed.

If $ARGUMENTS is provided:
- Use it as the primary description of intent.
- If it is too vague to determine the change type (fix / feat / chore) or write a meaningful branch name, ask the user one focused clarifying question before continuing. Do not ask more than one question at a time.

If $ARGUMENTS is NOT provided:
- Infer intent from the diff and recent `git log --oneline -10`.
- If you still cannot confidently determine type and branch name, ask the user to describe the change in one sentence.

**Determine the change type:**
- `fix` — corrects a bug or broken behaviour
- `feat` — adds new capability
- `chore` — tooling, config, deps, refactor, docs with no user-visible behaviour change

**Draft a branch name:** `<type>/<short-kebab-description>` (max 40 chars total, no ticket numbers needed). Show it to the user for confirmation before creating it.

---

## Step 2 — Branch check

- If already on a branch other than `main`: confirm with the user whether to use it or rename it.
- If on `main`: create the branch now (after name is confirmed).

---

## Step 3 — Quality gate

Run each check in sequence. Stop immediately on any failure — show the output and do not proceed until the user resolves it or explicitly says to skip that check.

1. `npm run typecheck`
2. `npm run lint`
3. `npm run format:check` — if this fails, offer to run `npm run format` and re-check automatically
4. `npm run test`

---

## Step 4 — Stage and commit

If $ARGUMENTS was provided:
- Show the full list of changed files from `git status --short`.
- Select only the files clearly related to the described change. Show the user which files you're staging and which you're leaving out, and ask: "Does this selection look right?"
- Wait for confirmation before staging.

If $ARGUMENTS was NOT provided:
- Stage all modified tracked files and ask: "I'm staging all changed files — does that look right?"

Draft a conventional commit message: `<type>(<scope>): <description>`. Show it for approval before committing. The scope should be the main area touched (e.g. `auth`, `admin`, `submissions`, `deps`).

---

## Step 5 — Push

Push the branch to origin with `-u` if no upstream is set.

---

## Step 6 — Draft the PR

Run:
- `git log main..HEAD --oneline`
- `git diff main...HEAD -- src/ wrangler.toml package.json`

Write a PR title (under 60 chars) and body using this template:

```
## What changed
<!-- 2–4 bullets on the WHY, not the what. Reference the problem being solved. -->

## How to test
<!-- Specific steps. For auth/admin changes: include the CF Access flow.
     For submission changes: walk the full form path.
     For deps/tooling: show the command to verify. -->

## Checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test` passes
- [ ] Tested in browser (if user-facing)
- [ ] No secrets or env vars hardcoded
- [ ] `wrangler.toml` changes are intentional (if any)
```

Show the full draft and ask: "Does this look right, or would you like to change anything before I submit?"

---

## Step 7 — Create (only after explicit approval)

Only run `gh pr create` after the user says the draft looks good. Use a HEREDOC to pass the body.
