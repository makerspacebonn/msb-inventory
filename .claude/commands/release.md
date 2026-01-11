---
description: Commit changes, pull, push, and create a version tag (patch/minor/major)
argument-hint: [patch|minor|major]
allowed-tools: Bash(git:*), Read
---

# Release Workflow

Create a release by committing staged changes, syncing with remote, and tagging a new version.

## Arguments

- No argument or `patch`: Increment patch version (1.2.3 → 1.2.4)
- `minor`: Increment minor version (1.2.3 → 1.3.0)
- `major`: Increment major version (1.2.3 → 2.0.0)

The argument is: `$ARGUMENTS`

## Workflow Steps

Execute these steps in order. **Stop immediately if any step fails.**

### Step 1: Check for Changes

Run `git status` to see what will be committed. If there are no staged or unstaged changes, inform the user and stop.

### Step 2: Create Commit

If there are changes:
1. Run `git add -A` to stage all changes
2. Run `git diff --cached` to see what's being committed
3. Analyze the changes and create a meaningful commit message following conventional commits format
4. Create the commit using:
```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Body if needed
EOF
)"
```

**Do NOT include any co-author lines or AI attribution in the commit message.**

### Step 3: Pull Latest Changes

Run `git pull --rebase` to fetch and rebase on top of the latest remote changes.

**CRITICAL: If there are merge conflicts:**
1. Run `git status` to show the conflicting files
2. Inform the user: "There are merge conflicts that need manual resolution. Please resolve the conflicts, then run `/release` again."
3. **STOP HERE - Do not continue to push or tag**

### Step 4: Push Changes

If pull succeeded without conflicts, run `git push` to push the commit to remote.

If push fails, inform the user of the error and stop.

### Step 5: Determine Next Version Tag

1. Get the latest version tag (semantic version format X.Y.Z):
```bash
git tag --list '[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname | head -1
```

2. If no tags exist, start with `0.1.0`

3. Parse the current version and calculate the next version based on the argument:
   - **patch** (default): Increment the third number, e.g., 1.2.3 → 1.2.4
   - **minor**: Increment the second number, reset third to 0, e.g., 1.2.3 → 1.3.0
   - **major**: Increment the first number, reset second and third to 0, e.g., 1.2.3 → 2.0.0

### Step 6: Create and Push Tag

1. Create an annotated tag with the commit message as the tag message:
```bash
git tag -a X.Y.Z -m "Release X.Y.Z"
```

2. Push the tag to remote:
```bash
git push origin X.Y.Z
```

### Step 7: Summary

Report to the user:
- The commit that was created (hash and message)
- The new version tag
- Confirmation that everything was pushed successfully

## Error Handling

- **No changes**: "No changes to commit. Nothing to release."
- **Merge conflicts**: Stop and ask user to resolve manually
- **Push rejected**: "Push was rejected. Please pull and resolve any issues manually."
- **Network error**: "Network error occurred. Please check your connection and try again."

## Example Output

```
✓ Committed: feat(homepage): add inventory statistics cards
✓ Pulled latest changes (no conflicts)
✓ Pushed to origin/main
✓ Created tag 1.3.0
✓ Pushed tag to remote

Release 1.3.0 complete!
```
