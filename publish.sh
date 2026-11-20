#!/usr/bin/env bash
# Visual Encounters: stage, generate release version, commit, and push.
# Run from anywhere; this script operates on the Git repository beside it.
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$SCRIPT_DIR"

fatal() { printf '\n[ERROR] %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fatal "Git is not installed or not on PATH."
[[ -e .git ]] || fatal "Place publish.sh in the root of the Git repository (next to .git and index.html)."
[[ -f tools/update_site_version.py ]] || fatal "Missing tools/update_site_version.py. Install the Visual Encounters cache-update patch first."

branch="$(git symbolic-ref --quiet --short HEAD)" || fatal "You are in detached HEAD mode; check out a branch first."

if command -v python3 >/dev/null 2>&1; then
  python_cmd=python3
elif command -v python >/dev/null 2>&1; then
  python_cmd=python
else
  fatal "Python 3 is required to run tools/update_site_version.py."
fi

printf '\n[1/5] Staging existing changes...\n'
git add -A

printf '\n[2/5] Generating website version...\n'
"$python_cmd" tools/update_site_version.py || fatal "Version generation failed; nothing was committed or pushed."

printf '\n[3/5] Staging newly generated files...\n'
git add -A

if git diff --cached --quiet; then
  printf '\nNo changes to commit. Repository is already up to date locally.\n'
  exit 0
fi

printf '\nChanges that will be committed:\n'
git diff --cached --stat
printf '\nFiles staged (A=added, M=modified, D=deleted):\n'
git diff --cached --name-status
printf '\n[4/5] Commit details\n'
IFS= read -r -p 'Enter commit message: ' message || { printf '\nCancelled; changes remain staged.\n'; exit 0; }
[[ -n "${message//[[:space:]]/}" ]] || { printf 'Empty commit message. Cancelled; changes remain staged.\n'; exit 0; }
IFS= read -r -p 'Commit and push all staged changes? [y/N]: ' confirm || { printf '\nCancelled; changes remain staged.\n'; exit 0; }
case "$confirm" in
  y|Y|yes|YES|Yes) ;;
  *) printf 'Cancelled; changes remain staged.\n'; exit 0 ;;
esac

git commit -m "$message" || fatal "Commit failed; nothing was pushed. Check your Git user.name/user.email and repository status."

printf '\n[5/5] Pushing branch %s...\n' "$branch"
if git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1; then
  git push || fatal "Push failed. Your commit is saved locally. Check your remote, access, and authentication."
else
  git remote get-url origin >/dev/null 2>&1 || fatal "No upstream or origin remote configured. Commit saved locally; configure a remote and push manually."
  git push -u origin "$branch" || fatal "Push failed. Your commit is saved locally. Check your remote, access, and authentication."
fi
printf '\n[SUCCESS] Commit pushed! GitHub Pages can now deploy the new version.\n'
