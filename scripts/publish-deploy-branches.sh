#!/usr/bin/env bash
# Hostinger deploys one app per branch, with the app at the top level. After pushing main, run:
#   scripts/publish-deploy-branches.sh
# It publishes web/ to deploy-admin and backend/ to deploy-api. The droplet does not need it (it pulls main).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git fetch -q origin
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] ||
  { echo 'Push main first (git push origin main), then run this again.' >&2; exit 1; }

for pair in web:deploy-admin backend:deploy-api; do
  dir=${pair%%:*} branch=${pair#*:}
  commit=$(git subtree split --prefix="$dir" HEAD 2>/dev/null)
  if [ "$(git rev-parse -q --verify "origin/$branch" || true)" = "$commit" ]; then
    echo "$branch is already up to date."
  else
    git push -q origin "$commit:refs/heads/$branch"
    echo "$branch updated to $(git rev-parse --short "$commit")."
  fi
done
