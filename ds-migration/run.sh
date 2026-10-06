#!/usr/bin/env bash
# Runs the items of ds-migration/sprint-status.yaml in order. Per item (ds-migration/WORKFLOW.md):
# an unattended Claude Code session writes the spec, the script captures the declared screens,
# a second session implements and compares the rendering, then a deterministic validation, one
# signed commit, a push to the epic branch, a wait on the pull request's required checks, and a
# "done" comment on the pull request.
# An item starts only once its dependencies are done. When every item of an epic is done or
# blocked, the script posts the epic report and an automated epic review on the PR, then stops
# until a human sets the epic to `done`.
#
# Usage:
#   ds-migration/run.sh [--once] [--no-wait] [--dry-run]  process the items in order
#   ds-migration/run.sh issues [--yes]                    create the issues of the new-* items
#   ds-migration/run.sh status                            count the items per status
#   ds-migration/run.sh finish                            final report, remove ds-migration/
#
# Environment: DS_ITEM_TIMEOUT (seconds per session, default 5400), DS_CHECKS_TIMEOUT (seconds,
# default 5400), DS_CHECKS_INTERVAL (seconds, default 30), DS_BUDGET_USD (optional cap per session),
# DS_APP_PORT (frontend of this checkout, default 3012), DS_API_URL (default http://localhost:4002).
# Needs claude, gh (authenticated), git with commit signing, jq, perl, node, yarn, curl and lsof,
# the backend running, and Playwright's Chromium installed.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
STATUS_FILE=ds-migration/sprint-status.yaml
LOG_DIR="$(git rev-parse --git-dir)/ds-migration"
ITEM_TIMEOUT="${DS_ITEM_TIMEOUT:-5400}"
CHECKS_TIMEOUT="${DS_CHECKS_TIMEOUT:-5400}"
CHECKS_INTERVAL="${DS_CHECKS_INTERVAL:-30}"
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
MAX_BLOCKED_IN_A_ROW=3
APP_PORT="${DS_APP_PORT:-3012}"
export DS_APP_URL="http://localhost:$APP_PORT"
API_URL="${DS_API_URL:-http://localhost:4002}"
DEPS_CHANGED=false
SUBJECT_RE='^(feat|fix|chore)\(frontend\): .+ \(#[0-9]+\)$'
mkdir -p "$LOG_DIR"

log() { printf '%s %s\n' "$(date '+%H:%M:%S')" "$*" | tee -a "$LOG_DIR/run.log" >&2; }
die() { log "STOP: $*"; exit 1; }
header() { sed -n "s/^$1: *//p" "$STATUS_FILE" | tr -d '"'; }
set_header() { NAME="$1" VALUE="$2" perl -pi -e 's/^(\Q$ENV{NAME}\E:) .*/$1 $ENV{VALUE}/' "$STATUS_FILE"; }
# Changes a status line, only inside development_status (dependencies use the same keys).
set_status() {
  KEY="$1" VALUE="$2" perl -pi -e 'if (/^[^ #\n]/) { $on = /^development_status:/ ? 1 : 0 }
    s/^(  \Q$ENV{KEY}\E:) .*/$1 $ENV{VALUE}/ if $on' "$STATUS_FILE"
}

BRANCH="$(header branch)"
BASE="$(header base)"
EPIC_ISSUE="$(header epic_issue)"
REQUIRED_CHECKS="$(header required_checks | tr -d ' ')"
[ -n "$REQUIRED_CHECKS" ] || die "required_checks is missing from $STATUS_FILE"

# One line per item, in file order: "<epic> <key> <status>".
items() {
  awk '/^development_status:/ { on = 1; next }
       /^[^ #]/ { on = 0 }
       on && /^  [a-z0-9-]+: / { key = $1; sub(/:$/, "", key)
         if (key ~ /^epic-/) epic = key; else print epic, key, $2 }' "$STATUS_FILE"
}
status_of() { awk -v k="  $1:" 'index($0, k) == 1 { print $2; exit }' "$STATUS_FILE"; }
covers_of() {
  awk -v k="  $1:" '/^covers:/ { on = 1; next } /^[^ #]/ { on = 0 }
    on && index($0, k) == 1 { sub(/^[^[]*\[/, ""); sub(/\].*$/, ""); gsub(/ /, ""); print; exit }' "$STATUS_FILE"
}
deps_of() {
  awk -v k="  $1:" '/^dependencies:/ { on = 1; next } /^[^ #]/ { on = 0 }
    on && index($0, k) == 1 { sub(/^[^[]*\[/, ""); sub(/\].*$/, ""); gsub(/ /, ""); print; exit }' "$STATUS_FILE"
}

# Decides the next action. Prints "<action> <epic> <key>":
#   ci   an item already pushed, waiting for its checks
#   run  the first item whose dependencies are done, in an approved epic or the current one
#   gate every item of the current epic is done, blocked or waiting: report, review, stop
#   hold the current epic waits for a human to set it to done
#   end  every epic is done
plan_next() {
  awk '
    function ready(key,   n, list, i) {
      n = split(deps[key], list, ",")
      for (i = 1; i <= n; i++) if (list[i] != "" && status[list[i]] != "done") return 0
      return 1
    }
    /^development_status:/ { section = "status"; next }
    /^dependencies:/ { section = "deps"; next }
    /^[^ #]/ { section = "" }
    section == "status" && /^  [a-z0-9-]+: / {
      key = $1; sub(/:$/, "", key); status[key] = $2
      if (key ~ /^epic-/) { epic = key; epics[++ne] = key } else { items[++ni] = key; epic_of[key] = epic }
    }
    section == "deps" && /^  [a-z0-9-]+: / {
      key = $1; sub(/:$/, "", key); line = $0
      sub(/^[^[]*\[/, "", line); sub(/\].*$/, "", line); gsub(/ /, "", line); deps[key] = line
    }
    END {
      for (e = 1; e <= ne; e++) if (status[epics[e]] != "done") { current = epics[e]; break }
      for (i = 1; i <= ni; i++) if (status[items[i]] == "review") { print "ci", epic_of[items[i]], items[i]; exit }
      for (i = 1; i <= ni; i++) {
        k = items[i]; ep = epic_of[k]
        if (status[ep] != "done" && ep != current) continue
        if ((status[k] == "backlog" || status[k] == "in-progress") && ready(k)) { print "run", ep, k; exit }
      }
      if (current == "") print "end - -"
      else print (status[current] == "review" ? "hold" : "gate"), current, "-"
    }' "$STATUS_FILE"
}

kind_of() {
  case "$1" in
    epic-3*) echo candidate ;;
    epic-4*) echo cleanup ;;
    epic-5*) echo adoption ;;
    *) echo ds ;;
  esac
}

issue_of() { local n="${1%%-*}"; [[ $n =~ ^[0-9]+$ ]] && echo "$n" || true; }
name_of() { perl -pe 's/(^|-)(\w)/\U$2/g' <<<"${1#*-}"; }

# ---------------------------------------------------------------- preconditions and git

dirty_outside_tooling() { git status --porcelain --untracked-files=all | grep -v ' ds-migration/' || true; }

require_ready() {
  [ "$(git branch --show-current)" = "$BRANCH" ] || die "run from branch $BRANCH"
  [ "$(git config --get commit.gpgsign)" = "true" ] || die "commit signing is off (git config commit.gpgsign true)"
  # Leftovers under ds-migration/ are expected: the status file and the specs of blocked items.
  local dirty
  dirty="$(dirty_outside_tooling)"
  [ -z "$dirty" ] || die "working tree not clean outside ds-migration/:
$dirty"
}

# ---------------------------------------------------------------- the app for the screenshots

reachable() { curl -s -o /dev/null --max-time 10 "$1"; }

# Screenshots need this checkout's frontend: a dev server started elsewhere serves another
# checkout, hence a port of its own. The backend is shared, the migration does not touch it.
ensure_app() {
  reachable "$API_URL" || die "the backend does not answer on $API_URL: start docker compose and yarn dev:api"
  if ! reachable "$DS_APP_URL/login"; then
    log "starting the frontend of this checkout on $DS_APP_URL ($LOG_DIR/app.log)"
    (cd apps/frontend && nohup yarn next dev --turbopack -p "$APP_PORT" >"$LOG_DIR/app.log" 2>&1 &)
    touch "$LOG_DIR/app.started"
    local deadline=$(($(date +%s) + 300))
    until reachable "$DS_APP_URL/login"; do
      [ "$(date +%s)" -lt "$deadline" ] || die "the frontend did not start on $DS_APP_URL: see $LOG_DIR/app.log"
      sleep 5
    done
  fi
  node ds-migration/screenshot.mjs --preflight >"$LOG_DIR/preflight.log" 2>&1 ||
    die "screenshots cannot run: see $LOG_DIR/preflight.log (Chromium: yarn workspace @xtm-hub/test_e2e playwright install chromium)"
}

# Stops the frontend only when this script started it.
stop_app() {
  [ -f "$LOG_DIR/app.started" ] || return 0
  lsof -ti "tcp:$APP_PORT" -sTCP:LISTEN | xargs kill 2>/dev/null || true
  rm -f "$LOG_DIR/app.started"
}

# Merges the base branch when it moved. Sets MERGED_BASE for check_base_merge.
sync_base() {
  MERGED_BASE=false
  git fetch --quiet origin "$BASE"
  if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; then
    git fetch --quiet origin "$BRANCH"
    git merge-base --is-ancestor "origin/$BRANCH" HEAD || die "origin/$BRANCH has commits this checkout lacks: pull first"
  fi
  if ! git merge-base --is-ancestor "origin/$BASE" HEAD; then
    log "merging origin/$BASE"
    git merge --quiet --no-edit "origin/$BASE" || { git merge --abort; die "merging $BASE conflicts: resolve by hand"; }
    MERGED_BASE=true
    if ! git diff --quiet ORIG_HEAD HEAD -- yarn.lock package.json apps/frontend/package.json; then
      log "dependencies changed on $BASE: yarn install"
      yarn install --immutable >"$LOG_DIR/yarn-install.log" 2>&1 || die "yarn install failed after merging $BASE: see $LOG_DIR/yarn-install.log"
      DEPS_CHANGED=true
    fi
  fi
}

# The checks that must still pass on the branch after a merge of the base branch. <spec paths>
sync_checks() {
  yarn workspace @xtm-hub/frontend relay &&
    yarn workspace @xtm-hub/frontend check-ts &&
    yarn workspace @xtm-hub/frontend lint &&
    { [ -z "$1" ] || node ds-migration/validate.mjs --imports-only $1; }
}

# New code from the base branch may use a component this branch already migrated, whose legacy
# file is deleted here. One sync fix session migrates those usages, in a commit of its own.
check_base_merge() {
  local no_wait="$1" specs log="$LOG_DIR/base-merge-check.log" result
  $MERGED_BASE || return 0
  specs="$(items | awk '$3 == "done" { print "ds-migration/specs/" $2 ".md" }' | while read -r f; do
    if [ -f "$f" ]; then printf '%s ' "$f"; fi
  done)"
  sync_checks "$specs" >"$log" 2>&1 && return 0
  log "the merge of $BASE breaks migrated components: one sync fix session ($log)"
  result="$(claude_session base-merge-fix \
    "Read ds-migration/WORKFLOW.md fully and follow its Sync fix mode. The failing checks are in $log." \
    "$ITEM_SCHEMA" "$WRITE_TOOLS")"
  [ -n "$result" ] || result='{"status":"FAILED","summary":"No structured output."}'
  if [ "$(jq -r .status <<<"$result")" != DONE ] || ! sync_checks "$specs" >"$log" 2>&1; then
    die "the merge of $BASE breaks migrated components and the sync fix failed: see $log"
  fi
  git add -A -- . ':(exclude)ds-migration'
  git diff --cached --quiet && die "the sync fix changed nothing: see $log"
  git commit --quiet -m "fix(frontend): move code from $BASE to the design system components already migrated (#$EPIC_ISSUE)" \
    -m "$(jq -r .summary <<<"$result")"
  log "sync fix committed"
  if ! $no_wait; then
    publish
    wait_checks || die "required checks fail after the sync fix"
  fi
}

# Commits everything outside ds-migration/, plus this item's spec and the status file.
# Called from conditions, where `set -e` does not apply: every step checks its own status.
commit_item() {
  local key="$1" subject="$2" body="$3"
  git add -A -- . ':(exclude)ds-migration' || return 1
  git add -- "ds-migration/specs/$key.md" "$STATUS_FILE" || return 1
  if git diff --cached --quiet -- . ":(exclude)$STATUS_FILE"; then
    echo "nothing to commit for $key" >&2
    return 1
  fi
  git commit --quiet -m "$subject" -m "$body" || return 1
}

commit_status() {
  git diff --quiet -- "$STATUS_FILE" && return
  git commit --quiet -m "chore(frontend): update the design system migration status (#$EPIC_ISSUE)" -- "$STATUS_FILE"
}

# ---------------------------------------------------------------- Claude Code sessions

SPEC_SCHEMA='{"type":"object","additionalProperties":false,"required":["status","summary"],"properties":{"status":{"type":"string","enum":["DONE","NEEDS_HUMAN","FAILED"]},"summary":{"type":"string"},"question":{"type":"string"}}}'
ITEM_SCHEMA='{"type":"object","additionalProperties":false,"required":["status","summary","commit_subject","commit_body"],"properties":{"status":{"type":"string","enum":["DONE","NEEDS_HUMAN","FAILED"]},"summary":{"type":"string"},"commit_subject":{"type":"string"},"commit_body":{"type":"string"},"question":{"type":"string"}}}'
REVIEW_SCHEMA='{"type":"object","additionalProperties":false,"required":["findings"],"properties":{"findings":{"type":"string"}}}'

READ_TOOLS="Read,Glob,Grep,Agent,Skill,TodoWrite,\
Bash(gh issue view:*),Bash(gh pr view:*),Bash(gh pr diff:*),\
Bash(git diff:*),Bash(git status:*),Bash(git log:*),Bash(git show:*),Bash(git ls-files:*)"
SPEC_TOOLS="$READ_TOOLS,Edit,Write,Bash(gh issue edit:*),Bash(node ds-migration/screenshot.mjs:*)"
WRITE_TOOLS="$READ_TOOLS,Edit,Write,Bash(gh issue edit:*),Bash(gh issue comment:*),\
Bash(node ds-migration/screenshot.mjs:*),\
Bash(yarn workspace @xtm-hub/frontend lint:*),Bash(yarn workspace @xtm-hub/frontend format:*),\
Bash(yarn workspace @xtm-hub/frontend check-ts:*),Bash(yarn workspace @xtm-hub/frontend test:*),\
Bash(yarn workspace @xtm-hub/frontend i18n:check:*),Bash(node ds-migration/validate.mjs:*)"

# Runs one session and prints its structured output, or nothing. <log name> <prompt> <schema> <tools>
claude_session() {
  local out="$LOG_DIR/$1.json"
  ${TIMEOUT_BIN:+"$TIMEOUT_BIN" "$ITEM_TIMEOUT"} claude -p "$2" \
    --output-format json --json-schema "$3" --permission-mode dontAsk --allowedTools "$4" \
    ${DS_BUDGET_USD:+--max-budget-usd "$DS_BUDGET_USD"} --no-session-persistence \
    >"$out" 2>>"$LOG_DIR/$1.stderr" || true
  log "$1: session cost \$$(jq -r '.total_cost_usd // "?"' "$out" 2>/dev/null || echo '?')"
  jq -c '.structured_output // empty' "$out" 2>/dev/null || true
}

failed() { jq -nc --arg s "$1" '{status: "FAILED", summary: $s}'; }

# Prints the item's structured result, or a FAILED one when the session produced none.
# <key> <issue> <epic> <kind> <mode> [extra]
run_item_session() {
  local key="$1" issue="$2" epic="$3" kind="$4" mode="$5" extra="${6:-}" result
  result="$(claude_session "$key" \
    "Read ds-migration/WORKFLOW.md fully and follow its $mode for item $key (issue #$issue, epic $epic, kind $kind).${extra:+ $extra}" \
    "$ITEM_SCHEMA" "$WRITE_TOOLS")"
  [ -n "$result" ] || result="$(failed "No structured output: timeout or crash. See the session log.")"
  log "$key: $(jq -r .status <<<"$result")"
  echo "$result"
}

# Spec session, screenshots of the untouched code, then build session. Prints the last result.
work_item() {
  local key="$1" issue="$2" epic="$3" kind="$4" spec="ds-migration/specs/$1.md" result
  result="$(claude_session "$key-spec" \
    "Read ds-migration/WORKFLOW.md fully and follow its Spec mode for item $key (issue #$issue, epic $epic, kind $kind)." \
    "$SPEC_SCHEMA" "$SPEC_TOOLS")"
  [ -n "$result" ] || result="$(failed "Spec mode produced no structured output: timeout or crash. See the session log.")"
  log "$key spec: $(jq -r .status <<<"$result")"
  if [ "$(jq -r .status <<<"$result")" != DONE ]; then
    echo "$result"
  elif [ -n "$(dirty_outside_tooling)" ]; then
    failed "Spec mode changed files outside ds-migration/: the screenshots would not show the current rendering."
  elif ! node ds-migration/screenshot.mjs "$spec" before >"$LOG_DIR/$key-before.log" 2>&1; then
    failed "The screens of the spec cannot be captured before the change: see $LOG_DIR/$key-before.log."
  else
    run_item_session "$key" "$issue" "$epic" "$kind" "Build mode"
  fi
}

validate_item() {
  local spec="ds-migration/specs/$1.md"
  [ -f "$spec" ] || { echo "Missing spec $spec"; return 1; }
  yarn workspace @xtm-hub/frontend lint &&
    yarn workspace @xtm-hub/frontend format:check &&
    yarn workspace @xtm-hub/frontend i18n:check &&
    yarn workspace @xtm-hub/frontend check-ts &&
    yarn workspace @xtm-hub/frontend test &&
    node ds-migration/validate.mjs "$spec" &&
    node ds-migration/screenshot.mjs "$spec" after
}

# ---------------------------------------------------------------- report and pull request

# Bullet lines of one `## <heading>` section in every spec, prefixed with the item.
spec_section() {
  local spec key issue
  for spec in ds-migration/specs/*.md; do
    [ -e "$spec" ] || continue
    key="$(basename "$spec" .md)"
    issue="$(issue_of "$key")"
    awk -v h="## $1" '$0 == h { on = 1; next } /^## / { on = 0 } on && /^- / { sub(/^- /, ""); print }' "$spec" |
      while IFS= read -r line; do echo "- [ ] ${issue:+#$issue }${key#*-}: $line"; done
  done
}

candidates() {
  local spec key issue module
  for spec in ds-migration/specs/*.md; do
    [ -e "$spec" ] || continue
    grep -q '^kind: candidate' "$spec" || continue
    key="$(basename "$spec" .md)"
    issue="$(issue_of "$key")"
    module="$(sed -n 's/^target_module: *//p' "$spec" | tr -d '"')"
    echo "- [ ] ${issue:+#$issue }${key#*-}: \`$module\`, upstream PR to the design system not opened yet"
  done
}

pr_body() {
  echo "Migrates the frontend from the legacy \`filigran-ui\` copy to \`@filigran/design-system\`, one commit per component. Part of #$EPIC_ISSUE."
  echo
  echo "Generated by \`ds-migration/run.sh\` from \`ds-migration/sprint-status.yaml\` and the specs. Each spec is also the body of its issue."
  echo
  echo "The first commits add that tooling under \`ds-migration/\` (workflow, script, spec template, checks, screenshots before and after each component); the last commit removes it. Each item comments here once its required checks pass."
  items | while read -r epic key status; do
    if [ "$epic" != "${current:-}" ]; then printf '\n### %s: %s\n\n' "$epic" "$(status_of "$epic")"; current="$epic"; fi
    local issue box=' ' also
    issue="$(issue_of "$key")"
    also="$(covers_of "$key" | sed 's/[0-9][0-9]*/#&/g; s/,/, /g')"
    if [ "$status" = done ]; then box=x; fi
    echo "- [$box] ${issue:+#$issue }${key#*-}: $status${also:+ (also $also)}"
  done
  printf '\n## Design system candidates\n\nRebuilt here on design system primitives, to be proposed upstream once this PR is merged.\n\n'
  candidates
  printf '\n## To validate\n\nChoices made without the design team, and review findings left out of scope.\n\n'
  spec_section "To validate"
  spec_section "Deferred findings"
  echo
  items | while read -r _ key status; do
    local issue
    issue="$(issue_of "$key")"
    if [ "$status" = done ] && [ -n "$issue" ]; then
      echo "Closes #$issue"
      covers_of "$key" | tr ',' '\n' | while read -r covered; do
        if [ -n "$covered" ]; then echo "Closes #$covered"; fi
      done
    fi
  done
}

publish() {
  git push --quiet origin "HEAD:$BRANCH"
  local pr body="$LOG_DIR/pr-body.md"
  pr="$(header pull_request)"
  pr_body >"$body"
  if [ "$pr" = none ]; then
    pr="$(gh pr create --draft --base "$BASE" --head "$BRANCH" --label "filigran team" --label vibe-coded \
      --title "feat(frontend): migrate to @filigran/design-system (#$EPIC_ISSUE)" --body-file "$body")"
    pr="${pr##*/}"
    set_header pull_request "$pr"
    log "opened draft PR #$pr"
  else
    gh pr edit "$pr" --body-file "$body" >/dev/null
  fi
}

# Returns 0 when every required check of the current HEAD passed, 1 when one failed. [pr number]
# Polls the names in required_checks: gh only lists a check once its job starts, and the e2e
# aggregator starts last, so `gh pr checks --required --watch` can return before it exists.
wait_checks() {
  local pr="${1:-}" head pr_head state deadline
  [ -n "$pr" ] || pr="$(header pull_request)"
  head="$(git rev-parse HEAD)"
  deadline=$(($(date +%s) + CHECKS_TIMEOUT))
  log "waiting for the required checks of PR #$pr ($REQUIRED_CHECKS)"
  while :; do
    pr_head="$(gh pr view "$pr" --json headRefOid --jq .headRefOid 2>/dev/null || true)"
    state=pending
    if [ "$pr_head" = "$head" ]; then
      state="$(gh pr checks "$pr" --json name,bucket 2>/dev/null | jq -r --arg req "$REQUIRED_CHECKS" '
        ($req | split(",")) as $names
        | [$names[] as $n | ((map(select(.name == $n)) | .[0].bucket) // "missing")] as $buckets
        | if any($buckets[]; . == "fail" or . == "cancel") then "fail"
          elif all($buckets[]; . == "pass" or . == "skipping") then "pass"
          else "pending" end' 2>/dev/null || true)"
    fi
    case "$state" in
      pass) return 0 ;;
      fail) return 1 ;;
    esac
    [ "$(date +%s)" -lt "$deadline" ] || die "required checks of PR #$pr still not done after $((CHECKS_TIMEOUT / 60)) minutes"
    sleep "$CHECKS_INTERVAL"
  done
}

failed_log() {
  local run_id file="$LOG_DIR/$1-ci.log"
  run_id="$(gh run list --branch "$BRANCH" --workflow dockerbuild-ci.yml --limit 1 --json databaseId --jq '.[0].databaseId' || true)"
  gh run view "$run_id" --log-failed 2>/dev/null | tail -n 400 >"$file" || true
  echo "$file"
}

# ---------------------------------------------------------------- one item

block_item() {
  local key="$1" issue="$2" result="$3" reason="$4"
  git stash push --include-untracked --quiet -m "ds-migration $key" -- . ':(exclude)ds-migration' || true
  set_status "$key" blocked
  gh issue comment "$issue" --body "$(printf '**Design system migration blocked** (%s)\n\n%s\n\n%s\n\nRun log: `%s`. Code changes, if any, are in `git stash list` as "ds-migration %s". To retry, answer here or edit `ds-migration/specs/%s.md`, then set the item back to `backlog`.' \
    "$reason" "$(jq -r .summary <<<"$result")" "$(jq -r '.question // empty' <<<"$result")" "$LOG_DIR/$key.json" "$key" "$key")" >/dev/null
  log "$key blocked: $reason"
}

default_subject() {
  local name
  name="$(name_of "$2")"
  case "$1" in
    candidate) echo "feat(frontend): rebuild $name on @filigran/design-system primitives (#$3)" ;;
    cleanup) echo "chore(frontend): remove the legacy filigran-ui copy (#$3)" ;;
    *) echo "feat(frontend): migrate $name to @filigran/design-system (#$3)" ;;
  esac
}

# Commits a DONE result after the deterministic validation. Returns 1 if it does not pass.
commit_result() {
  local key="$1" issue="$2" result="$3" kind="$4" subject body
  validate_item "$key" >"$LOG_DIR/$key-validate.log" 2>&1 || return 1
  subject="$(jq -r .commit_subject <<<"$result")"
  if ! [[ $subject =~ $SUBJECT_RE ]] || [[ $subject != *"(#$issue)" ]]; then
    subject="$(default_subject "$kind" "$key" "$issue")"
  fi
  body="$(jq -r .commit_body <<<"$result" | grep -viE '^(co-authored-by|signed-off-by):' || true)"
  set_status "$key" review || return 1
  commit_item "$key" "$subject" "$body" || return 1
  log "$key committed: $subject"
}

mark_done() {
  local key="$1" pr
  set_status "$key" done
  log "$key done$2"
  pr="$(header pull_request)"
  [ "$pr" = none ] || gh pr comment "$pr" --body "Component $(name_of "$key") done. Issue #$(issue_of "$key")" >/dev/null ||
    log "could not comment on PR #$pr"
}

# Waits for the checks of the pushed item; on failure, one CI fix session, then stop.
settle_review() {
  local epic="$1" key="$2" issue kind result
  issue="$(issue_of "$key")"
  kind="$(kind_of "$epic")"
  if wait_checks; then
    mark_done "$key" ""
    return
  fi
  log "$key: required checks failed, one CI fix attempt"
  result="$(run_item_session "$key" "$issue" "$epic" "$kind" "CI fix mode" "The failing log is $(failed_log "$key").")"
  if [ "$(jq -r .status <<<"$result")" = DONE ] && commit_result "$key" "$issue" "$result" "$kind"; then
    publish
    if wait_checks; then
      mark_done "$key" " after a CI fix"
      return
    fi
  fi
  set_status "$key" blocked
  gh issue comment "$issue" --body "**Design system migration blocked**: the pull request's required checks fail after one fix attempt. Logs: \`$LOG_DIR/$key-ci.log\`." >/dev/null
  die "$key: required checks still failing, fix the branch by hand"
}

# ---------------------------------------------------------------- epic gate

epic_report() {
  local epic="$1" issues
  issues="$(items | awk -v e="$epic" '$1 == e { split($2, p, "-"); if (p[1] ~ /^[0-9]+$/) print p[1] }' | paste -sd'|' -)"
  printf '## %s is ready for review\n\n| Item | Status | Waiting on |\n| --- | --- | --- |\n' "$epic"
  items | while read -r e key status; do
    [ "$e" = "$epic" ] || continue
    local issue waiting=''
    issue="$(issue_of "$key")"
    if [ "$status" != done ]; then
      waiting="$(deps_of "$key" | tr ',' '\n' | while read -r d; do
        if [ -n "$d" ] && [ "$(status_of "$d")" != done ]; then printf '%s ' "$d"; fi
      done)"
    fi
    echo "| ${issue:+#$issue }${key#*-} | $status | ${waiting} |"
  done
  printf '\n### Commits\n\n'
  if [ -n "$issues" ]; then git log --reverse --format='- %h %s' "origin/$BASE..HEAD" | grep -E "\(#($issues)\)$" || true; fi
  printf '\n### Automated epic review\n\n'
}

epic_gate() {
  local epic="$1" no_wait="$2" report="$LOG_DIR/$1-report.md" review shas
  set_status "$epic" review
  commit_status
  $no_wait || publish
  epic_report "$epic" >"$report"
  shas="$(grep -oE '^- [0-9a-f]{7,}' "$report" | cut -c3- | paste -sd' ' -)"
  review="$(claude_session "$epic-review" \
    "Read ds-migration/WORKFLOW.md fully and follow its Epic review mode for $epic. Its commits: ${shas:-none}." \
    "$REVIEW_SCHEMA" "$READ_TOOLS")"
  [ -n "$review" ] || review='{"findings":"The automated review produced no output."}'
  jq -r .findings <<<"$review" >>"$report"
  printf '\n---\nSet `%s: done` in `ds-migration/sprint-status.yaml` once this epic is validated, then run `ds-migration/run.sh` again.\n' "$epic" >>"$report"
  [ "$(header pull_request)" = none ] || gh pr comment "$(header pull_request)" --body-file "$report" >/dev/null
  log "$epic is ready for review: report posted on the PR ($report)"
}

# ---------------------------------------------------------------- main loop

process() {
  local once="$1" no_wait="$2" dry_run="$3" blocked_in_a_row=0
  while :; do
    require_ready
    local action epic key issue kind result outcome
    read -r action epic key <<<"$(plan_next)"
    if $dry_run; then
      echo "next: $action $epic $key"
      return
    fi
    case "$action" in
      end)
        commit_status
        log "every epic is done: run 'ds-migration/run.sh finish'"
        return
        ;;
      hold)
        commit_status
        log "$epic waits for review: set '$epic: done' in $STATUS_FILE once validated, then rerun"
        return
        ;;
      gate)
        epic_gate "$epic" "$no_wait"
        return
        ;;
      ci)
        $no_wait && return
        ensure_app # a CI fix validates with screenshots
        publish # idempotent: pushes what is missing, opens the PR if there is none
        settle_review "$epic" "$key"
        ;;
      run)
        issue="$(issue_of "$key")"
        [ -n "$issue" ] || die "$key has no issue yet: run 'ds-migration/run.sh issues' first"
        kind="$(kind_of "$epic")"
        sync_base
        check_base_merge "$no_wait"
        if $DEPS_CHANGED; then stop_app; fi
        ensure_app
        set_status "$key" in-progress
        set_status "$epic" in-progress # reopens an epic already in review or done
        log "== $key (issue #$issue, $kind)"
        result="$(work_item "$key" "$issue" "$epic" "$kind")"
        outcome="$(jq -r .status <<<"$result")"
        if [ "$outcome" = DONE ] && commit_result "$key" "$issue" "$result" "$kind"; then
          blocked_in_a_row=0
          if ! $no_wait; then
            publish
            settle_review "$epic" "$key"
          fi
        else
          [ "$outcome" = DONE ] && outcome="validation failed, see $LOG_DIR/$key-validate.log"
          block_item "$key" "$issue" "$result" "$outcome"
          blocked_in_a_row=$((blocked_in_a_row + 1))
          [ "$blocked_in_a_row" -lt "$MAX_BLOCKED_IN_A_ROW" ] || die "$MAX_BLOCKED_IN_A_ROW items blocked in a row"
        fi
        ;;
      *) die "cannot plan the next step: $action" ;;
    esac
    $once && return
  done
}

# Final report on the epic issue, then removes ds-migration/: specs live on in the issues.
finish() {
  require_ready
  [ "$(plan_next | cut -d' ' -f1)" = end ] || die "some epic is not done yet: $(plan_next)"
  local pr report="$LOG_DIR/final-report.md"
  commit_status
  publish
  pr="$(header pull_request)"
  pr_body >"$report"
  gh issue comment "$EPIC_ISSUE" --body-file "$report" >/dev/null
  git rm -r --quiet ds-migration
  git commit --quiet -m "chore(frontend): remove the design system migration tooling (#$EPIC_ISSUE)"
  git push --quiet origin "HEAD:$BRANCH"
  stop_app
  wait_checks "$pr" || die "required checks fail after removing ds-migration/"
  log "final report posted on #$EPIC_ISSUE; mark PR #$pr ready for review"
}

# ---------------------------------------------------------------- issues and status

create_issues() {
  local yes="$1" pending
  pending="$(items | awk '$2 ~ /^new-/')"
  [ -n "$pending" ] || { echo "No new-* item."; return; }
  title_of() {
    local name
    name="$(perl -pe 's/(^|-)(\w)/\U$2/g' <<<"${2#new-}")"
    case "$1" in
      epic-3*) echo "feat(frontend): rebuild $name on @filigran/design-system primitives" ;;
      epic-4*) echo "chore(frontend): remove the legacy filigran-ui copy" ;;
      *) echo "feat(frontend): migrate $name to @filigran/design-system" ;;
    esac
  }
  echo "Issues to create as sub-issues of #$EPIC_ISSUE:"
  while read -r epic key _; do echo "  $(title_of "$epic" "$key")"; done <<<"$pending"
  if [ "$yes" != "--yes" ]; then
    read -r -p "Create $(wc -l <<<"$pending" | tr -d ' ') issues? [y/N] " answer
    [ "$answer" = y ] || return
  fi
  local parent_id
  parent_id="$(gh issue view "$EPIC_ISSUE" --json id --jq .id </dev/null)"
  # gh must not read the loop's stdin, hence the </dev/null on every call below.
  while read -r epic key _; do
    local title url number child_id
    title="$(title_of "$epic" "$key")"
    if [[ $title == feat* ]]; then
      url="$(gh issue create --title "$title" --body "Part of #$EPIC_ISSUE." --label feature </dev/null)"
    else
      url="$(gh issue create --title "$title" --body "Part of #$EPIC_ISSUE." </dev/null)"
    fi
    number="${url##*/}"
    child_id="$(gh issue view "$number" --json id --jq .id </dev/null)"
    gh api graphql -f query='mutation($p: ID!, $c: ID!) { addSubIssue(input: {issueId: $p, subIssueId: $c}) { issue { number } } }' \
      -f p="$parent_id" -f c="$child_id" </dev/null >/dev/null
    # Renames the key everywhere, dependencies included.
    OLD="$key" NEW="$number-${key#new-}" perl -pi -e 's/(?<![a-z0-9-])\Q$ENV{OLD}\E(?![a-z0-9-])/$ENV{NEW}/g' "$STATUS_FILE"
    echo "#$number $title"
  done <<<"$pending"
}

case "${1:-}" in
  issues) create_issues "${2:-}" ;;
  status) items | awk '{ print $3 }' | sort | uniq -c ;;
  finish) finish ;;
  *)
    once=false no_wait=false dry_run=false
    for arg in "$@"; do
      case "$arg" in
        --once) once=true ;;
        --no-wait) no_wait=true ;;
        --dry-run) dry_run=true ;;
        *) die "unknown option $arg" ;;
      esac
    done
    process "$once" "$no_wait" "$dry_run"
    ;;
esac
