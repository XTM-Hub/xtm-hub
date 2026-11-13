#!/usr/bin/env bash
# Delivers one Filigran Flow RFC as a stack of pull requests, one chunk at a time, unattended.
# Ported from the design system migration's run.sh; the plan and the state live in the private
# repository (see rfc-delivery/README.md):
#   <private>/rfc-delivery/<RFC-ID>/chunks.yaml       the plan, reviewed by the team (BMAD stories.yaml)
#   <private>/rfc-delivery/<RFC-ID>/rfc-status.yaml   the state, written here only (BMAD sprint-status)
#   <private>/rfc-delivery/<RFC-ID>/chunks/<id>.md    one spec per chunk, written by its Spec mode
# Per chunk (rfc-delivery/WORKFLOW.md): a Spec mode session, the screens before the change when it
# declares some, a Build mode session, a deterministic validation, one signed commit on the chunk's
# own branch stacked on the one below, a draft pull request onto it, the required checks, then the
# pull request is marked ready for the team. The loop never waits for a human merge. Once every
# chunk is done, an automated RFC review goes to the tracking pull request and the loop stops.
#
# Usage (from the root of an xtm-hub checkout, the stack running):
#   rfc-delivery/run.sh <RFC-ID> [--once] [--no-wait] [--dry-run]   build the next chunks
#   rfc-delivery/run.sh <RFC-ID> status                             statuses and the next action
#   rfc-delivery/run.sh <RFC-ID> issues [--yes]                     create the RFC issue and the chunk issues
#   rfc-delivery/run.sh <RFC-ID> start                              RFC branch, its draft PR, the tracking PR
#   rfc-delivery/run.sh <RFC-ID> restack [<chunk>]                  carry a fix of a lower chunk up the stack
#   rfc-delivery/run.sh <RFC-ID> debug <chunk>                      interactive session on a blocked chunk
#   rfc-delivery/run.sh <RFC-ID> feedback <chunk>                   interactive session on a chunk PR's review
#   rfc-delivery/run.sh <RFC-ID> review                             interactive session to finish the RFC review
#   rfc-delivery/run.sh <RFC-ID> resume [<chunk>] [--once]          retry a chunk from the code it put aside
#   rfc-delivery/run.sh <RFC-ID> publish                            after a change by hand: push, bodies, checks
#
# Environment: RFC_PRIVATE_DIR (default ../xtm-hub-private), RFC_FLOW_DIR (default ../filigran-flow),
# RFC_SESSION_TIMEOUT (seconds per session, default 5400), RFC_CHECKS_TIMEOUT (default 5400),
# RFC_CHECKS_INTERVAL (default 30), RFC_BUDGET_USD (optional cap per session), RFC_APP_PORT
# (frontend of this checkout for the screens, default 3012), RFC_NO_SCREENS (set: no frontend, no
# screens, for an RFC without UI), RFC_API_URL (default http://localhost:4002),
# RFC_PROBES (extra health commands, ';'-separated, run before each chunk).
# Needs claude, gh (authenticated), git with commit signing, jq, perl, node, yarn, curl and lsof.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
RFC="${1:-}"
[[ $RFC =~ ^RFC-[A-Z]+-[0-9]+$ ]] || { sed -n '15,27p' "$0"; exit 1; }
shift
PRIVATE="$(cd "${RFC_PRIVATE_DIR:-../xtm-hub-private}" && pwd)"
FLOW="$(cd "${RFC_FLOW_DIR:-../filigran-flow}" && pwd)"
DIR_REL="rfc-delivery/$RFC"
DIR="$PRIVATE/$DIR_REL"
LOG_DIR="$(git rev-parse --absolute-git-dir)/rfc-delivery/$RFC"
SESSION_TIMEOUT="${RFC_SESSION_TIMEOUT:-5400}"
CHECKS_TIMEOUT="${RFC_CHECKS_TIMEOUT:-5400}"
CHECKS_INTERVAL="${RFC_CHECKS_INTERVAL:-30}"
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
APP_PORT="${RFC_APP_PORT:-3012}"
export RFC_APP_URL="http://localhost:$APP_PORT"
API_URL="${RFC_API_URL:-http://localhost:4002}"
NEEDS_LABEL="needs more info"
BLOCK_MARK="**RFC delivery blocked**"
SUBJECT_RE='^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9._/-]+\))?!?: .+ \(#[0-9]+\)$'
mkdir -p "$LOG_DIR"
[ -f "$DIR/chunks.yaml" ] || { echo "no plan: $DIR/chunks.yaml (run the start-rfc skill first)" >&2; exit 1; }

exec 3>&2
log() { printf '%s %s\n' "$(date '+%H:%M:%S')" "$*" | tee -a "$LOG_DIR/run.log" >&3; }
trap 'log "interrupted: run rfc-delivery/run.sh $RFC again to resume"; exit 130' INT TERM
stop_on_signal() { trap 'exit 130' INT TERM; }
die() { log "STOP: $*"; exit 1; }

cli() { node rfc-delivery/cli.mjs "$@"; }
header() { cli get "$DIR" "$1"; }
set_field() { cli set "$DIR" "$1" "$2"; }
set_status() { cli set "$DIR" "$1" "$2"; }
status_of() { cli get "$DIR" "development_status.$1"; }
fact() { cli get "$DIR" "chunks.$1.$2"; }
set_fact() { cli set "$DIR" "chunks.$1.$2" "$3"; }
chunk_field() { cli chunk "$DIR" "$1" | jq -r --arg f "$2" '.[$f] // empty | if type == "array" then join(",") else tostring end'; }
none() { [ -z "$1" ] || [ "$1" = none ]; }

REPOSITORY="$(header repository)"
PRIVATE_REPOSITORY="$(header private_repository)"
PRIVATE_BRANCH="$(header private_branch)"
BASE="$(header base)"
REQUIRED_CHECKS="$(header required_checks | tr -d ' ')"
BOARD="$(header github_project)"
IFS=, read -r BOARD_DEVELOPMENT BOARD_REVIEW BOARD_DONE <<<"$(header project_statuses | sed 's/, */,/g')"
LABELS="$(header labels)"
[ -n "$REQUIRED_CHECKS" ] || die "required_checks is missing from $DIR/rfc-status.yaml"

# ---------------------------------------------------------------- the private repository

pgit() { git -C "$PRIVATE" "$@"; }

# Commits the RFC folder of the private repository and pushes it. Every state change goes through
# here, so the tracking pull request always shows where the loop stands.
private_commit() {
  pgit add -A -- "$DIR_REL"
  pgit diff --cached --quiet && return 0
  pgit commit --quiet -m "docs(rfc-delivery): $1 ($RFC)"
  pgit push --quiet origin "HEAD:$PRIVATE_BRANCH" 2>/dev/null && return 0
  # Someone pushed to the tracking branch (an answer, an approval in a spec): take it and retry.
  pgit pull --quiet --rebase origin "$PRIVATE_BRANCH" && pgit push --quiet origin "HEAD:$PRIVATE_BRANCH" ||
    die "could not push $PRIVATE_BRANCH of $PRIVATE: resolve it by hand, then run again"
}

# The team edits the tracking branch too (answers in a spec, approved_by): take their commits.
private_pull() {
  pgit ls-remote --exit-code --heads origin "$PRIVATE_BRANCH" >/dev/null 2>&1 || return 0
  pgit pull --quiet --ff-only origin "$PRIVATE_BRANCH" || die "$PRIVATE cannot fast-forward $PRIVATE_BRANCH: resolve it by hand"
}

private_pr() { header private_pull_request; }

refresh_bodies() {
  local pr body="$LOG_DIR/pr-body.md" pbody="$LOG_DIR/private-pr-body.md"
  pr="$(header pull_request)"
  if ! none "$pr"; then
    cli pr-body "$DIR" >"$body"
    gh pr edit "$pr" --repo "$REPOSITORY" --body-file "$body" >/dev/null || log "could not update the body of PR #$pr"
  fi
  pr="$(private_pr)"
  if ! none "$pr"; then
    cli private-pr-body "$DIR" >"$pbody"
    gh pr edit "$pr" --repo "$PRIVATE_REPOSITORY" --body-file "$pbody" >/dev/null || log "could not update the tracking PR"
  fi
}

private_comment() {
  local pr
  pr="$(private_pr)"
  none "$pr" && return 0
  gh pr comment "$pr" --repo "$PRIVATE_REPOSITORY" --body "$1" >/dev/null || log "could not comment on the tracking PR"
}

# ---------------------------------------------------------------- preconditions

require_ready() {
  [ "$(git config --get commit.gpgsign)" = "true" ] || die "commit signing is off (git config commit.gpgsign true)"
  [ "$(pgit config --get commit.gpgsign)" = "true" ] || die "commit signing is off in $PRIVATE"
  [ -z "$(git status --porcelain --untracked-files=all)" ] || die "working tree not clean:
$(git status --porcelain --untracked-files=all | head -20)"
  [ "$(pgit branch --show-current)" = "$PRIVATE_BRANCH" ] || die "$PRIVATE is not on $PRIVATE_BRANCH"
  local dirty
  dirty="$(pgit status --porcelain --untracked-files=all | grep -v " $DIR_REL/" || true)"
  [ -z "$dirty" ] || die "$PRIVATE has changes outside $DIR_REL:
$dirty"
  private_pull
  cli validate "$DIR" >"$LOG_DIR/validate-plan.log" || die "the plan does not validate: $LOG_DIR/validate-plan.log"
}

acquire_lock() {
  local lock="$LOG_DIR/run.lock" pid
  if ! mkdir "$lock" 2>/dev/null; then
    pid="$(cat "$lock/pid" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then die "run.sh is already running on $RFC (pid $pid)"; fi
    log "taking over the lock of an interrupted run"
  fi
  echo $$ >"$lock/pid"
  trap 'rm -rf "$LOG_DIR/run.lock"' EXIT
}

running_pid() {
  local pid
  pid="$(cat "$LOG_DIR/run.lock/pid" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then echo "$pid"; fi
}

# The chunks of this repository, "<chunk> <status>" in stack order.
chunks() { cli list "$DIR" | awk '$3 != "external" { print $2, $3 }'; }

# A chunk's commit is on its branch when the branch holds a commit ending with its issue.
chunk_committed() {
  local branch issue
  branch="$(fact "$1" branch)"
  issue="$(fact "$1" issue)"
  none "$branch" && return 1
  git rev-parse --verify --quiet "$branch" >/dev/null || return 1
  git log --format=%s "$(cli base "$DIR" "$1")..$branch" 2>/dev/null | grep -E "\(#$issue\)$" >/dev/null
}

# After a crash: puts aside the code the running chunk left, and sends back to in-progress a chunk
# marked review whose commit never happened.
recover_interrupted() {
  [ ! -f "$(git rev-parse --git-dir)/MERGE_HEAD" ] || die "a merge is in progress: finish it or run 'git merge --abort'"
  local id status
  while read -r id status <&4; do
    [ "$status" = in-progress ] || [ "$status" = review ] || continue
    if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
      git stash push --include-untracked --quiet -m "rfc-delivery $id interrupted"
      log "$id: changes of an interrupted run put aside in git stash"
    fi
    if [ "$status" = review ] && ! chunk_committed "$id"; then
      set_status "$id" in-progress
      log "$id: interrupted before its commit, restarting it"
    elif [ "$status" = in-progress ] && chunk_committed "$id"; then
      # The commit happened, the status write did not: publish it rather than build it again.
      set_status "$id" review
      rm -f "$LOG_DIR/$id.spec-done"
      log "$id: interrupted after its commit, publishing it"
    fi
  done 4< <(chunks)
}

# A pull request a human merged moves its chunk to merged: the chunks above now stack on the
# RFC branch, and GitHub retargets their pull requests once the merged branch is deleted.
sync_merged() {
  local id status pr data changed=false rfc_branch
  rfc_branch="$(header branch)"
  while read -r id status <&4; do
    [ "$status" = done ] || [ "$status" = review ] || continue
    pr="$(fact "$id" pull_request)"
    none "$pr" && continue
    data="$(gh pr view "$pr" --repo "$REPOSITORY" --json state,baseRefName 2>/dev/null || echo '{}')"
    [ "$(jq -r '.state // empty' <<<"$data")" = MERGED ] || continue
    if [ "$(jq -r .baseRefName <<<"$data")" != "$rfc_branch" ]; then
      die "$id: PR #$pr was merged into $(jq -r .baseRefName <<<"$data"), not the RFC branch $rfc_branch: its code is not in the RFC yet. Merge the stack bottom-up into $rfc_branch, then run again"
    fi
    set_status "$id" merged
    log "$id: PR #$pr merged into the RFC branch"
    changed=true
  done 4< <(chunks)
  $changed || return 0
  retarget_stack
  private_commit "record the merged chunks"
  refresh_bodies
}

# Points each open chunk pull request at the branch it stacks on now. GitHub retargets a pull
# request only when the branch it targeted is deleted.
retarget_stack() {
  local id status pr want have
  while read -r id status <&4; do
    [ "$status" = merged ] && continue
    pr="$(fact "$id" pull_request)"
    none "$pr" && continue
    want="$(cli base "$DIR" "$id")"
    have="$(gh pr view "$pr" --repo "$REPOSITORY" --json baseRefName --jq .baseRefName 2>/dev/null || true)"
    if [ -n "$have" ] && [ "$have" != "$want" ]; then
      gh pr edit "$pr" --repo "$REPOSITORY" --base "$want" >/dev/null && log "$id: PR #$pr now targets $want"
    fi
  done 4< <(chunks)
}

# ---------------------------------------------------------------- environment

reachable() { curl -s -o /dev/null --max-time 10 "$1"; }

# Backend tests need PostgreSQL and the S3 store; every chunk may run them.
probe_environment() {
  reachable "$API_URL" || die "the backend does not answer on $API_URL: start docker compose and yarn dev:api"
  local probe
  IFS=';' read -ra probes <<<"${RFC_PROBES:-}"
  for probe in ${probes[@]+"${probes[@]}"}; do
    [ -n "$probe" ] || continue
    bash -c "$probe" >/dev/null 2>&1 || die "environment probe failed: $probe"
  done
}

spec_has_screens() {
  local spec="$DIR/chunks/$1.md"
  [ -f "$spec" ] || return 1
  perl -0ne 'exit((/^## Screens\n[\s\S]*?```json\n([\s\S]*?)\n```/m && $1 !~ /^\s*\[\s*\]\s*$/) ? 0 : 1)' "$spec"
}

ensure_app() {
  if ! reachable "$RFC_APP_URL/login"; then
    log "starting the frontend of this checkout on $RFC_APP_URL ($LOG_DIR/app.log)"
    (cd apps/frontend && nohup yarn next dev --turbopack -p "$APP_PORT" >"$LOG_DIR/app.log" 2>&1 &)
    touch "$LOG_DIR/app.started"
    local deadline=$(($(date +%s) + 300))
    until reachable "$RFC_APP_URL/login"; do
      [ "$(date +%s)" -lt "$deadline" ] || die "the frontend did not start on $RFC_APP_URL: see $LOG_DIR/app.log"
      sleep 5
    done
  fi
  local try
  for try in 1 2 3; do
    node rfc-delivery/screenshot.mjs --preflight >"$LOG_DIR/preflight.log" 2>&1 && return 0
    log "screenshot preflight failed (try $try of 3)"
    [ "$try" = 3 ] || sleep 20
  done
  die "screenshots cannot run: see $LOG_DIR/preflight.log (Chromium: yarn workspace @xtm-hub/test_e2e playwright install chromium)"
}

stop_app() {
  [ -f "$LOG_DIR/app.started" ] || return 0
  lsof -ti "tcp:$APP_PORT" -sTCP:LISTEN | xargs kill 2>/dev/null || true
  rm -f "$LOG_DIR/app.started"
}

# ---------------------------------------------------------------- Claude Code sessions

SPEC_SCHEMA='{"type":"object","additionalProperties":false,"required":["status","summary"],"properties":{"status":{"type":"string","enum":["DONE","NEEDS_HUMAN","FAILED"]},"summary":{"type":"string"},"question":{"type":"string"}}}'
ITEM_SCHEMA='{"type":"object","additionalProperties":false,"required":["status","summary","commit_subject","commit_body","pr_summary","how_to_test"],"properties":{"status":{"type":"string","enum":["DONE","NEEDS_HUMAN","FAILED"]},"summary":{"type":"string"},"commit_subject":{"type":"string"},"commit_body":{"type":"string"},"pr_summary":{"type":"string"},"how_to_test":{"type":"string"},"question":{"type":"string"}}}'
CI_SCHEMA="${ITEM_SCHEMA/\"FAILED\"]/\"FAILED\",\"FLAKY\"]}"
REVIEW_SCHEMA='{"type":"object","additionalProperties":false,"required":["findings"],"properties":{"findings":{"type":"string"}}}'

# Read-only commands, then the writes a session may make. Every part of a compound command must
# match a rule. The cli's writing commands (set, generate) stay with this script.
READ_TOOLS="Read,Glob,Grep,Agent,SendMessage,Skill,TodoWrite,\
Bash(gh issue view:*),Bash(gh pr view:*),Bash(gh pr diff:*),\
Bash(git diff:*),Bash(git status:*),Bash(git log:*),Bash(git show:*),Bash(git ls-files:*),Bash(git merge-base:*),\
Bash(git -C $PWD diff:*),Bash(git -C $PWD status:*),Bash(git -C $PWD log:*),Bash(git -C $PWD show:*),\
Bash(git -C $FLOW show:*),Bash(git -C $FLOW log:*),Bash(git -C $FLOW ls-tree:*),\
Bash(node rfc-delivery/cli.mjs parse:*),Bash(node rfc-delivery/cli.mjs chunk:*),Bash(node rfc-delivery/cli.mjs title:*),\
Bash(node rfc-delivery/cli.mjs list:*),Bash(node rfc-delivery/cli.mjs get:*),Bash(node rfc-delivery/cli.mjs check-spec:*),\
Bash(cd:*),Bash(tail:*),Bash(head:*),Bash(grep:*),Bash(cat:*),Bash(ls:*),Bash(wc:*),Bash(sort:*),Bash(echo:*)"
SPEC_TOOLS="$READ_TOOLS,Edit,Write,Bash(node rfc-delivery/screenshot.mjs:*)"
WRITE_TOOLS="$READ_TOOLS,Edit,Write,Bash(node rfc-delivery/screenshot.mjs:*),\
Bash(rm apps/*),Bash(rm $PWD/apps/*),Bash(git diff HEAD:*),\
Bash(yarn workspace @xtm-hub/backend check-ts:*),Bash(yarn workspace @xtm-hub/backend lint:*),\
Bash(yarn workspace @xtm-hub/backend format:*),Bash(yarn workspace @xtm-hub/backend test:*),\
Bash(yarn workspace @xtm-hub/backend generate:ts:*),Bash(yarn workspace @xtm-hub/backend generate:module:*),\
Bash(yarn workspace @xtm-hub/backend generate-pg-to-ts:*),Bash(yarn workspace @xtm-hub/backend migrate:make:*),\
Bash(yarn workspace @xtm-hub/backend migrate:latest:*),Bash(yarn workspace @xtm-hub/backend migrate:up:*),\
Bash(yarn workspace @xtm-hub/backend migrate:down:*),Bash(yarn workspace @xtm-hub/backend esmigrate:up:*),Bash(yarn workspace @xtm-hub/backend esmigrate:make:*),\
Bash(yarn workspace @xtm-hub/backend seed:make:*),\
Bash(yarn workspace @xtm-hub/frontend lint:*),Bash(yarn workspace @xtm-hub/frontend format:*),\
Bash(yarn workspace @xtm-hub/frontend check-ts:*),Bash(yarn workspace @xtm-hub/frontend test:*),\
Bash(yarn workspace @xtm-hub/frontend i18n:check:*),Bash(yarn workspace @xtm-hub/frontend relay:*),\
Bash(yarn workspace @xtm-hub/frontend codegen:*),Bash(yarn workspace @xtm-hub/frontend next typegen:*),\
Bash(yarn workspace @xtm-hub/test_e2e lint:*),Bash(yarn workspace @xtm-hub/test_e2e format:check:*),\
Bash(yarn workspace @xtm-hub/test_e2e prettier:format:*)"

PROGRESS_FILTER='fromjson? | select(.type == "assistant") | (.parent_tool_use_id != null) as $sub | .message.content[]?
  | if .type == "tool_use" and .name != "StructuredOutput" then
      (if $sub then "    " else "  " end) + .name + " "
        + ((.input.command // .input.file_path // .input.pattern // .input.skill // .input.description // "")
           | tostring | gsub("\\s+"; " ") | .[0:140])
    elif .type == "text" and ($sub | not) then "  > " + (.text | gsub("\\s+"; " ") | .[0:200])
    else empty end'

# Runs one session and prints its structured output, or nothing. <log name> <prompt> <schema> <tools>
claude_session() {
  stop_on_signal
  local name="$1" prompt="$2" out="$LOG_DIR/$1.json" stream="$LOG_DIR/$1.jsonl" session="" attempt=1
  : >"$stream"
  while :; do
    run_claude "$name" "$prompt" "$3" "$4" "$session"
    jq -cR 'fromjson? | select(.type == "result")' "$stream" 2>/dev/null | tail -n 1 >"$out" || true
    log "$name: session cost \$$(jq -r '.total_cost_usd // "?"' "$out" 2>/dev/null || echo '?'), resume with: claude --resume $(jq -r '.session_id // "?"' "$out" 2>/dev/null || echo '?')"
    session_lost_api "$name" || break
    if [ "$attempt" -ge 4 ] || ! wait_for_network; then
      log "$name: the API stayed out of reach, stopping; run rfc-delivery/run.sh $RFC again once the network is back"
      kill -TERM $$
      exit 130
    fi
    session="$(jq -r '.session_id // empty' "$out" 2>/dev/null || true)"
    [ -n "$session" ] || session="$(jq -rR 'fromjson? | .session_id // empty' "$stream" 2>/dev/null | head -n 1)"
    prompt="The connection to the API dropped while you were working. Continue the task from where you stopped, then return the structured result."
    attempt=$((attempt + 1))
    log "$name: the API was out of reach, resuming the session (attempt $attempt of 4)"
  done
  jq -c '.structured_output // empty' "$out" 2>/dev/null || true
}

run_claude() {
  local line
  CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1 ${TIMEOUT_BIN:+"$TIMEOUT_BIN" --foreground "$SESSION_TIMEOUT"} claude -p "$2" \
    ${5:+--resume "$5"} --add-dir "$PRIVATE" --add-dir "$FLOW" \
    --output-format stream-json --verbose --json-schema "$3" --permission-mode dontAsk \
    --allowedTools "$4" ${RFC_BUDGET_USD:+--max-budget-usd "$RFC_BUDGET_USD"} </dev/null 2>>"$LOG_DIR/$1.stderr" |
    tee -a "$LOG_DIR/$1.jsonl" | jq -rR --unbuffered "$PROGRESS_FILTER" 2>/dev/null |
    while IFS= read -r line; do log "$1 $line"; done || true
}

API_LOST_RE='API Error|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|Connection error|Overloaded|overloaded_error'
session_lost_api() {
  local out="$LOG_DIR/$1.json"
  if [ -s "$out" ]; then
    jq -e --arg re "$API_LOST_RE" '.is_error == true and ((.result // "") | test($re))' "$out" >/dev/null 2>&1
  else
    tail -n 20 "$LOG_DIR/$1.stderr" 2>/dev/null | grep -Eq "$API_LOST_RE"
  fi
}

network_up() { curl -s -o /dev/null --max-time 10 https://api.anthropic.com && curl -s -o /dev/null --max-time 10 https://api.github.com; }

wait_for_network() {
  local deadline=$(($(date +%s) + ${RFC_NETWORK_TIMEOUT:-10800})) next_note=0
  until network_up; do
    [ "$(date +%s)" -lt "$deadline" ] || return 1
    if [ "$(date +%s)" -ge "$next_note" ]; then
      log "network down: waiting for api.anthropic.com and api.github.com"
      next_note=$(($(date +%s) + 600))
    fi
    sleep 30
  done
}

# A read that failed while the network was down is made again once it is back. A write is not:
# the server may have created the issue, the pull request or the comment before the network failed.
gh() {
  local code=0
  command gh "$@" || code=$?
  [ "$code" != 0 ] || return 0
  case "$1 ${2:-}" in
    "pr view" | "pr checks" | "pr list" | "pr diff" | "issue view" | "run list" | "run view") ;;
    api*) [[ " $* " != *mutation* && " $* " != *" -X "* ]] || return "$code" ;;
    *) return "$code" ;;
  esac
  if network_up || ! wait_for_network; then return "$code"; fi
  command gh "$@"
}

failed() { jq -nc --arg s "$1" '{status: "FAILED", summary: $s}'; }

# The facts every prompt carries: the chunk, where the plan is, where the RFC is.
context_of() {
  printf 'chunk %s (issue #%s, slice %s) of %s. The tracking folder is %s. The RFC: git -C %s show %s:%s.' \
    "$1" "$(fact "$1" issue)" "$(chunk_field "$1" slice)" "$RFC" "$DIR" "$FLOW" "$(header source.sha)" "$(header source.path)"
}

# <chunk> <mode> [extra]
run_chunk_session() {
  stop_on_signal
  local id="$1" mode="$2" extra="${3:-}" result schema="$ITEM_SCHEMA"
  [ "$mode" != "CI fix mode" ] || schema="$CI_SCHEMA"
  result="$(claude_session "$id-$(tr ' ' '-' <<<"$mode" | tr '[:upper:]' '[:lower:]')" \
    "Read rfc-delivery/WORKFLOW.md fully and follow its $mode for $(context_of "$id")${extra:+ $extra}" \
    "$schema" "$WRITE_TOOLS")"
  [ -n "$result" ] || result="$(failed "No structured output: timeout or crash. See the session log.")"
  log "$id: $mode $(jq -r .status <<<"$result")"
  echo "$result"
}

# ---------------------------------------------------------------- one chunk

# Spec session, the screens of the untouched code, then the build session. Prints the last result.
work_chunk() {
  stop_on_signal
  local id="$1" spec="$DIR/chunks/$1.md" result
  if [ -f "$spec" ] && { [ "$(status_of "$id")" = ready-for-dev ] || [ -f "$LOG_DIR/$id.spec-done" ]; }; then
    log "$id: spec ready, resuming at the build"
  else
    result="$(claude_session "$id-spec" \
      "Read rfc-delivery/WORKFLOW.md fully and follow its Spec mode for $(context_of "$id")" \
      "$SPEC_SCHEMA" "$SPEC_TOOLS")"
    [ -n "$result" ] || result="$(failed "Spec mode produced no structured output: timeout or crash. See the session log.")"
    log "$id spec: $(jq -r .status <<<"$result")"
    if [ "$(jq -r .status <<<"$result")" != DONE ]; then
      echo "$result"
      return
    fi
    if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
      failed "Spec mode changed files of the repository: the spec and the screens need the untouched code."
      return
    fi
    if ! cli check-spec "$DIR" "$id" >"$LOG_DIR/$id-check-spec.log"; then
      failed "The spec does not meet its contract: $LOG_DIR/$id-check-spec.log."
      return
    fi
    set_status "$id" ready-for-dev
    touch "$LOG_DIR/$id.spec-done"
    private_commit "write the spec of $id"
    if [ "$(chunk_field "$id" spec_checkpoint)" = true ]; then
      private_comment "Spec of \`$id\` written: \`$DIR_REL/chunks/$id.md\`. Set \`approved_by\` in its frontmatter to let the loop build it."
      jq -nc '{status: "HOLD", summary: "spec waits for approval"}'
      return
    fi
  fi
  local hint
  if spec_has_screens "$id" && [ -z "${RFC_NO_SCREENS:-}" ]; then
    node rfc-delivery/screenshot.mjs "$spec" before >"$LOG_DIR/$id-before.log" 2>&1 ||
      { failed "The screens of the spec cannot be captured before the change: see $LOG_DIR/$id-before.log."; return; }
  fi
  set_status "$id" in-progress
  # An assignment, not an argument: a failed restore stops here instead of building on conflicts.
  hint="$(restore_put_aside "$id")" || exit 1
  run_chunk_session "$id" "Build mode" "$hint"
}

put_aside_of() {
  git stash list --format='%gd %gs' | grep -E ": rfc-delivery $1( interrupted)?$" | head -n 1 | cut -d' ' -f1
}

restore_put_aside() {
  local id="$1" ref
  [ -f "$LOG_DIR/$id.resume" ] || return 0
  rm -f "$LOG_DIR/$id.resume"
  ref="$(put_aside_of "$id")"
  [ -n "$ref" ] || return 0
  git stash pop --quiet "$ref" >/dev/null 2>&1 || die "$id: the code put aside ($ref) does not apply cleanly: apply it by hand"
  log "$id: code put aside by the earlier attempt brought back ($ref)"
  echo "The working tree already holds the changes of an earlier attempt at this chunk, put aside when it stopped. Check them against the spec, keep what is right, and finish the chunk from there."
}

# The whole suites of the workspaces the change touches, then the spec contract and the screens.
validate_chunk() {
  local id="$1" changed step
  changed="$(git status --porcelain --untracked-files=all | awk '{ print $NF }')"
  [ -n "$changed" ] || { echo "the change is empty"; return 1; }
  # A note or a summary a session left behind may quote the spec: nothing new outside these trees.
  local stray
  stray="$(git status --porcelain --untracked-files=all | awk '$1 == "??" { print $2 }' | grep -vE '^(apps|docs|chart|xtm-hub-dev)/' || true)"
  if [ -n "$stray" ]; then
    echo "new files outside apps/, docs/, chart/ and xtm-hub-dev/, refused (move or delete them): $stray"
    return 1
  fi
  if grep -q '^apps/backend/' <<<"$changed"; then
    log "$id: validating, backend test:ci"
    yarn workspace @xtm-hub/backend test:ci || return 1
  fi
  if grep -q '^apps/frontend/' <<<"$changed"; then
    for step in lint format:check i18n:check check-ts test; do
      log "$id: validating, frontend $step"
      yarn workspace @xtm-hub/frontend "$step" || return 1
    done
  fi
  if grep -q '^apps/e2e/' <<<"$changed"; then
    log "$id: validating, e2e lint and format"
    yarn workspace @xtm-hub/test_e2e lint && yarn workspace @xtm-hub/test_e2e format:check || return 1
  fi
  log "$id: validating, check-spec"
  cli check-spec "$DIR" "$id" || return 1
  if spec_has_screens "$id" && [ -z "${RFC_NO_SCREENS:-}" ]; then
    log "$id: validating, after screenshots"
    node rfc-delivery/screenshot.mjs "$DIR/chunks/$id.md" after || return 1
  fi
}

validate_with_fix() {
  stop_on_signal
  local id="$1" result="$2" log="$LOG_DIR/$1-validate.log"
  if validate_chunk "$id" >"$log" 2>&1; then
    echo "$result"
    return
  fi
  log "$id: validation failed, one validation fix session ($log)"
  cp "$log" "$LOG_DIR/$id-validate-before-fix.log"
  result="$(run_chunk_session "$id" "Validation fix mode" "The failing validation log is $LOG_DIR/$id-validate-before-fix.log.")"
  if [ "$(jq -r .status <<<"$result")" != DONE ]; then
    echo "$result" # a question stays a question
  elif validate_chunk "$id" >"$log" 2>&1; then
    echo "$result"
  else
    failed "Validation still fails after one fix session: see $log."
  fi
}

# Commits a validated result on the chunk's branch. Returns 1 when nothing could be committed.
commit_result() {
  local id="$1" result="$2" issue subject body
  issue="$(fact "$id" issue)"
  subject="$(jq -r .commit_subject <<<"$result")"
  if ! [[ $subject =~ $SUBJECT_RE ]] || [[ $subject != *"(#$issue)" ]]; then subject="$(cli title "$DIR" "$id")"; fi
  body="$(jq -r .commit_body <<<"$result" | grep -viE '^(co-authored-by|signed-off-by):' || true)"
  git add -A || return 1
  git diff --cached --quiet && { echo "nothing to commit for $id" >&2; return 1; }
  git commit --quiet -m "$subject" -m "$body" || return 1
  jq -r .pr_summary <<<"$result" >"$LOG_DIR/$id-pr-summary.md"
  jq -r .how_to_test <<<"$result" >"$LOG_DIR/$id-how-to-test.md"
  set_status "$id" review
  rm -f "$LOG_DIR/$id.spec-done"
  board_chunk "$id" "$BOARD_REVIEW"
  private_commit "build $id"
  log "$id committed: $subject"
}

# The public pull request of a chunk: what the build session wrote, and where it sits in the stack.
chunk_pr_body() {
  local id="$1" base_branch="$2" acs below position
  acs="$(chunk_field "$id" acceptance | sed 's/,/, /g')"
  position="$(cli chunk "$DIR" "$id" | jq -r '"\(.position) of \(.of)"')"
  below=""
  if [ "$base_branch" != "$(header branch)" ]; then
    below="$(gh pr list --repo "$REPOSITORY" --head "$base_branch" --state open --json number --jq '.[0].number // empty' 2>/dev/null || true)"
  fi
  echo "Implements: $RFC${acs:+ ($acs)}"
  echo
  echo "Part of #$(header rfc_issue). Chunk $position of the stack, slice $(chunk_field "$id" slice)."
  if [ -n "$below" ]; then echo "Stacked on #$below: review that one first."; fi
  echo
  echo "# Context"
  echo
  cat "$LOG_DIR/$id-pr-summary.md" 2>/dev/null || true
  echo
  echo "## How to test"
  echo
  cat "$LOG_DIR/$id-how-to-test.md" 2>/dev/null || true
  echo
  echo "Built by \`rfc-delivery/run.sh\`: spec, implementation, verification and a four-reviewer pass, unattended. The team's review decides."
  echo
  echo "Related to #$(fact "$id" issue)"
}

# The pull request labels of the header, one per line: `.github/LABELS.md` allows an ownership label
# and `vibe-coded` only.
pr_labels() { tr ',' '\n' <<<"$LABELS" | sed 's/^ *//; s/ *$//' | grep -v '^$' || true; }

# The type label and the issue Type that `.github/LABELS.md` (2. Type label) asks of an issue.
# <issue number> <conventional type>
label_issue() {
  local number="$1" label="" name=Task node type_id
  case "$2" in feat) label=feature name=Feature ;; fix) label=bug name=Bug ;; docs) label=documentation ;; esac
  [ -z "$label" ] || gh issue edit "$number" --repo "$REPOSITORY" --add-label "$label" </dev/null >/dev/null ||
    log "could not label #$number $label"
  node="$(gh issue view "$number" --repo "$REPOSITORY" --json id --jq .id </dev/null)"
  type_id="$(gh api graphql -f query='query($o: String!, $n: String!) { repository(owner: $o, name: $n) { issueTypes(first: 20) { nodes { id name } } } }' \
    -f o="${REPOSITORY%/*}" -f n="${REPOSITORY#*/}" --jq ".data.repository.issueTypes.nodes[] | select(.name == \"$name\") | .id" </dev/null)" || true
  if [ -z "$type_id" ]; then log "no issue type $name in $REPOSITORY: set the Type of #$number by hand"; return 0; fi
  gh api graphql -f query='mutation($i: ID!, $t: ID!) { updateIssueIssueType(input: {issueId: $i, issueTypeId: $t}) { issue { number } } }' \
    -f i="$node" -f t="$type_id" </dev/null >/dev/null || log "could not set the Type of #$number to $name"
}

# Pushes the chunk's branch and opens its draft pull request onto the branch below.
publish_chunk() {
  local id="$1" branch base_branch pr body="$LOG_DIR/$1-pr-body.md" l label_args=()
  branch="$(fact "$id" branch)"
  base_branch="$(cli base "$DIR" "$id")"
  git push --quiet origin "$branch:$branch"
  pr="$(fact "$id" pull_request)"
  chunk_pr_body "$id" "$base_branch" >"$body"
  if none "$pr"; then
    label_args=()
    while IFS= read -r l; do label_args+=(--label "$l"); done < <(pr_labels)
    pr="$(gh pr create --repo "$REPOSITORY" --draft --base "$base_branch" --head "$branch" ${label_args[@]+"${label_args[@]}"} \
      --title "$(cli title "$DIR" "$id")" --body-file "$body")" || die "could not open the pull request of $branch"
    pr="${pr##*/}"
    set_fact "$id" pull_request "$pr"
    private_commit "open the pull request of $id"
    log "$id: opened draft PR #$pr onto $base_branch"
  else
    gh pr edit "$pr" --repo "$REPOSITORY" --base "$base_branch" --body-file "$body" >/dev/null || log "could not update PR #$pr"
  fi
  refresh_bodies
}

# Returns 0 when every required check of the head of <pr> passed, 1 when one failed. <pr> <sha>
wait_checks() {
  local pr="$1" head="$2" pr_head state deadline started next_note
  deadline=$(($(date +%s) + CHECKS_TIMEOUT))
  started=$(date +%s)
  next_note=$((started + 300))
  log "waiting for the required checks of PR #$pr ($REQUIRED_CHECKS)"
  while :; do
    pr_head="$(gh pr view "$pr" --repo "$REPOSITORY" --json headRefOid --jq .headRefOid 2>/dev/null || true)"
    state=pending
    if [ "$pr_head" = "$head" ]; then
      state="$(gh pr checks "$pr" --repo "$REPOSITORY" --json name,bucket 2>/dev/null | jq -r --arg req "$REQUIRED_CHECKS" '
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
    if [ "$(date +%s)" -ge "$next_note" ]; then
      log "still waiting for the checks of PR #$pr: ${state:-no check reported yet} after $((($(date +%s) - started) / 60)) minutes"
      next_note=$((next_note + 300))
    fi
    sleep "$CHECKS_INTERVAL"
  done
}

ci_run_id() {
  gh run list --repo "$REPOSITORY" --branch "$1" --workflow dockerbuild-ci.yml --commit "$2" --limit 1 \
    --json databaseId --jq '.[0].databaseId' 2>/dev/null || true
}

failed_log() {
  local id="$1" run_id file="$LOG_DIR/$1-ci.log"
  run_id="$(ci_run_id "$(fact "$id" branch)" "$(git rev-parse "$(fact "$id" branch)")")"
  gh run view "$run_id" --repo "$REPOSITORY" --log-failed 2>/dev/null | tail -n 400 >"$file" || true
  echo "$file"
}

rerun_failed_jobs() {
  local id="$1" run_id deadline
  run_id="$(ci_run_id "$(fact "$id" branch)" "$(git rev-parse "$(fact "$id" branch)")")"
  [ -n "$run_id" ] && gh run rerun "$run_id" --repo "$REPOSITORY" --failed >/dev/null 2>&1 || return 1
  deadline=$(($(date +%s) + 300))
  while [ "$(gh run view "$run_id" --repo "$REPOSITORY" --json status --jq .status 2>/dev/null || true)" = completed ] &&
    [ "$(date +%s)" -lt "$deadline" ]; do
    sleep "$CHECKS_INTERVAL"
  done
}

# ---------------------------------------------------------------- project board (optional)

board_status() {
  local issue="$1" status="$2" data project field option item
  [ -n "$BOARD" ] && [ -n "$status" ] && ! none "$issue" || return 0
  data="$(gh api graphql -f query='query($org: String!, $number: Int!, $owner: String!, $repo: String!, $issue: Int!) {
      organization(login: $org) { projectV2(number: $number) { id
        field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } } } }
      repository(owner: $owner, name: $repo) { issue(number: $issue) { id
        projectItems(first: 20) { nodes { id project { id } } } } } }' \
    -f org="${BOARD%/*}" -F number="${BOARD#*/}" -f owner="${REPOSITORY%/*}" -f repo="${REPOSITORY#*/}" \
    -F issue="$issue" 2>/dev/null || true)"
  project="$(jq -r '.data.organization.projectV2.id // empty' <<<"$data" 2>/dev/null || true)"
  field="$(jq -r '.data.organization.projectV2.field.id // empty' <<<"$data" 2>/dev/null || true)"
  option="$(jq -r --arg s "$status" '.data.organization.projectV2.field.options[]? | select(.name == $s) | .id' <<<"$data" 2>/dev/null || true)"
  item="$(jq -r --arg p "$project" '.data.repository.issue.projectItems.nodes[]? | select(.project.id == $p) | .id' <<<"$data" 2>/dev/null || true)"
  if [ -n "$project" ] && [ -z "$item" ]; then
    item="$(gh api graphql -f query='mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: {projectId: $p, contentId: $c}) { item { id } } }' \
      -f p="$project" -f c="$(jq -r '.data.repository.issue.id // empty' <<<"$data")" --jq .data.addProjectV2ItemById.item.id 2>/dev/null || true)"
  fi
  if [ -z "$project" ] || [ -z "$field" ] || [ -z "$option" ] || [ -z "$item" ]; then
    log "board: could not move #$issue to $status"
    return 0
  fi
  gh api graphql -f query='mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
      updateProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f, value: {singleSelectOptionId: $o}}) { projectV2Item { id } } }' \
    -f p="$project" -f i="$item" -f f="$field" -f o="$option" >/dev/null 2>&1 || log "board: could not move #$issue to $status"
}

board_chunk() { board_status "$(fact "$1" issue)" "$2"; }

# ---------------------------------------------------------------- blocks

mark_blocked() { printf '%s %s\n' "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$LOG_DIR/$1.blocked"; }

# Blocked chunks that wait for a human: a question with no comment on the tracking pull request
# since the block, and no change to the spec. Prints their ids, comma-separated.
waiting_chunks() {
  local id status reason since answers out="" pr
  pr="$(private_pr)"
  while read -r id status <&4; do
    [ "$status" = blocked ] || continue
    [ -f "$LOG_DIR/$id.blocked" ] || continue
    read -r reason since <"$LOG_DIR/$id.blocked"
    [ "$reason" = NEEDS_HUMAN ] || continue
    [ "$DIR/chunks/$id.md" -nt "$LOG_DIR/$id.blocked" ] && continue
    answers=0
    if ! none "$pr"; then
      # --jq would run once per page: count over all pages with jq -s.
      answers="$(gh api "repos/$PRIVATE_REPOSITORY/issues/$pr/comments" --paginate 2>/dev/null | jq -s --arg since "$since" --arg mark "$BLOCK_MARK" \
        '[.[][] | select(.created_at > $since) | select(.body | startswith($mark) | not)] | length' 2>/dev/null || echo 0)"
    fi
    [ "${answers:-0}" -gt 0 ] && continue
    out="$out${out:+,}$id"
  done 4< <(chunks)
  echo "$out"
}

retry_hint() {
  if [ "$1" = NEEDS_HUMAN ]; then
    echo "To retry, answer in this pull request or edit \`$DIR_REL/chunks/$2.md\`, then run \`rfc-delivery/run.sh $RFC\` again: it retries the chunk once it has an answer."
  else
    echo "Running \`rfc-delivery/run.sh $RFC\` again retries the chunk."
  fi
}

# The question goes to the private pull request only: it may quote the RFC. The public issue
# gets a label, nothing more.
block_chunk() {
  local id="$1" result="$2" reason="$3" details
  if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
    git stash push --include-untracked --quiet -m "rfc-delivery $id" || true
  fi
  set_status "$id" blocked
  # A question needs its answer in the spec: the next attempt writes it again.
  if [ "$reason" = NEEDS_HUMAN ]; then rm -f "$LOG_DIR/$id.spec-done"; fi
  details="$(printf '%s: %s\n\n%s' "$reason" "$(jq -r .summary <<<"$result")" "$(jq -r '.question // empty' <<<"$result")")"
  mark_blocked "$id" "$reason"
  private_commit "block $id"
  private_comment "$(printf '%s: `%s`\n\n%s\n\nRun log: `%s`. Code changes, if any, are in `git stash list` as "rfc-delivery %s". To investigate with the context loaded: `rfc-delivery/run.sh %s debug %s`. %s' \
    "$BLOCK_MARK" "$id" "$details" "$LOG_DIR" "$id" "$RFC" "$id" "$(retry_hint "$reason" "$id")")"
  gh issue edit "$(fact "$id" issue)" --repo "$REPOSITORY" --add-label "$NEEDS_LABEL" >/dev/null 2>&1 || true
  refresh_bodies
  log "$id blocked: $reason"
}

mark_done() {
  local id="$1" pr
  pr="$(fact "$id" pull_request)"
  set_status "$id" done
  gh pr ready "$pr" --repo "$REPOSITORY" >/dev/null 2>&1 || log "could not mark PR #$pr ready"
  gh issue edit "$(fact "$id" issue)" --repo "$REPOSITORY" --remove-label "$NEEDS_LABEL" >/dev/null 2>&1 || true
  board_chunk "$id" "$BOARD_DONE"
  private_commit "$id done"
  private_comment "\`$id\` done$2: ${REPOSITORY}#$pr is ready for review."
  refresh_bodies
  log "$id done$2"
}

# Waits for the checks of the pushed chunk; on failure, one CI fix session, then stop.
settle_review() {
  local id="$1" pr branch result why
  pr="$(fact "$id" pull_request)"
  branch="$(fact "$id" branch)"
  [ "$(git branch --show-current)" = "$branch" ] || git checkout --quiet "$branch"
  if wait_checks "$pr" "$(git rev-parse HEAD)"; then
    mark_done "$id" ""
    return
  fi
  log "$id: required checks failed, one CI fix attempt"
  result="$(run_chunk_session "$id" "CI fix mode" "The failing log is $(failed_log "$id").")"
  if [ "$(jq -r .status <<<"$result")" = FLAKY ]; then
    why="$(jq -r .summary <<<"$result" | head -n 1)"
    if [ -n "$(git status --porcelain)" ]; then
      log "$id: the CI fix session found the failure flaky but changed files: not rerunning"
    elif rerun_failed_jobs "$id"; then
      log "$id: the failure is not this chunk's, failed jobs rerun: $why"
      if wait_checks "$pr" "$(git rev-parse HEAD)"; then
        mark_done "$id" " after a rerun of flaky checks ($why)"
        return
      fi
    fi
  elif [ "$(jq -r .status <<<"$result")" = DONE ]; then
    result="$(validate_with_fix "$id" "$result")"
  fi
  if [ "$(jq -r .status <<<"$result")" = DONE ] && commit_result "$id" "$result"; then
    publish_chunk "$id"
    if wait_checks "$pr" "$(git rev-parse HEAD)"; then
      mark_done "$id" " after a CI fix"
      return
    fi
  fi
  block_chunk "$id" "$(failed "The required checks fail after one fix attempt. Logs: $LOG_DIR/$id-ci.log.")" CI
  die "$id: required checks still failing after a fix attempt: 'rfc-delivery/run.sh $RFC debug $id'"
}

# Puts the checkout on the chunk's branch, created on top of the branch below when it is new.
checkout_chunk() {
  local id="$1" branch base_branch
  branch="$(fact "$id" branch)"
  if none "$branch"; then branch="issue/$(fact "$id" issue)"; fi
  base_branch="$(cli base "$DIR" "$id")"
  if git rev-parse --verify --quiet "$branch" >/dev/null; then
    git checkout --quiet "$branch"
  else
    # The branch below is pushed; the RFC branch may have moved with the chunks a human merged.
    git fetch --quiet origin "$base_branch"
    git checkout --quiet -b "$branch" "origin/$base_branch"
    log "$id: branch $branch created on $base_branch"
  fi
  set_fact "$id" branch "$branch"
}

# ---------------------------------------------------------------- RFC gate

top_branch() {
  local id status top=""
  while read -r id status <&4; do
    [ "$status" = done ] && top="$(fact "$id" branch)"
  done 4< <(chunks)
  echo "${top:-$(header branch)}"
}

rfc_gate() {
  local review report="$DIR/rfc-review.md" top
  top="$(top_branch)"
  log "every chunk is done: automated RFC review of origin/$BASE...$top"
  review="$(claude_session rfc-review \
    "Read rfc-delivery/WORKFLOW.md fully and follow its RFC review mode for $RFC. The tracking folder is $DIR. The RFC: git -C $FLOW show $(header source.sha):$(header source.path). The whole change: git diff origin/$BASE...$top." \
    "$REVIEW_SCHEMA" "$READ_TOOLS")"
  [ -n "$review" ] || review='{"findings":"The automated review produced no output."}'
  { printf '# %s: automated RFC review\n\n%s, on `%s` at `%s`.\n\n' "$RFC" "$(date -u +%Y-%m-%d)" "$top" "$(git rev-parse --short "$top")"
    jq -r .findings <<<"$review"
    printf '\n---\nTo finish this review: `rfc-delivery/run.sh %s review` on the xtm-hub checkout. It walks through these findings with you, fixes what you approve on the right chunk, and closes the RFC.\n' "$RFC"
  } >"$report"
  set_field rfc_status review
  private_commit "post the automated review of $RFC"
  private_comment "$(cat "$report")"
  local pr
  pr="$(header pull_request)"
  none "$pr" || gh pr comment "$pr" --repo "$REPOSITORY" --body "Every chunk of the stack is built and its checks pass. The RFC review is in progress; review the chunk pull requests from the bottom of the stack up." >/dev/null || true
  refresh_bodies
  log "$RFC is ready for review: rfc-delivery/run.sh $RFC review"
}

# ---------------------------------------------------------------- main loop

process() {
  local once="$1" no_wait="$2" dry_run="$3"
  if ! $dry_run; then
    acquire_lock
    recover_interrupted
  fi
  while :; do
    local action id detail result outcome waiting
    $dry_run || require_ready
    $dry_run || sync_merged
    waiting="$(waiting_chunks)"
    read -r action id detail <<<"$(cli next "$DIR" --waiting "$waiting")"
    if $dry_run; then
      [ -z "$waiting" ] || echo "waiting for an answer: $waiting"
      echo "next: $action $id $detail"
      return
    fi
    case "$action" in
      approve) approve_plan; continue ;;
      end) log "$RFC is delivered"; return ;;
      hold) log "$RFC waits for its review: rfc-delivery/run.sh $RFC review"; return ;;
      gate) rfc_gate; return ;;
      wait) log "$id waits for an answer on the tracking PR #$(private_pr)"; return ;;
      hold-spec) log "$id: its spec waits for approved_by in $DIR_REL/chunks/$id.md"; return ;;
      stuck) die "$id depends on $detail, which is not done: build it or mark it done by hand" ;;
      ci)
        $no_wait && return
        [ -n "${RFC_NO_SCREENS:-}" ] || ensure_app # a CI fix validates with the screens
        publish_chunk "$id"
        settle_review "$id"
        ;;
      run)
        if [ "$(status_of "$id")" = blocked ]; then
          log "$id was blocked: retrying it"
          rm -f "$LOG_DIR/$id.blocked"
          if chunk_committed "$id"; then set_status "$id" review; continue; fi
        fi
        none "$(fact "$id" issue)" && die "$id has no issue yet: run 'rfc-delivery/run.sh $RFC issues' first"
        probe_environment
        # Spec mode captures the screens of the untouched code: the app runs before it starts.
        [ -n "${RFC_NO_SCREENS:-}" ] || ensure_app
        checkout_chunk "$id"
        board_chunk "$id" "$BOARD_DEVELOPMENT"
        gh issue edit "$(fact "$id" issue)" --repo "$REPOSITORY" --add-assignee @me >/dev/null 2>&1 || true
        [ "$(status_of "$id")" = ready-for-dev ] || set_status "$id" in-progress
        private_commit "start $id"
        log "== $id (issue #$(fact "$id" issue), on $(cli base "$DIR" "$id"))"
        result="$(work_chunk "$id")" || die "$id: the chunk stopped: see $LOG_DIR/run.log"
        if [ "$(jq -r .status <<<"$result")" = HOLD ]; then
          log "$id: spec written, waiting for its approval"
          return
        fi
        if [ "$(jq -r .status <<<"$result")" = DONE ]; then result="$(validate_with_fix "$id" "$result")"; fi
        outcome="$(jq -r .status <<<"$result")"
        if [ "$outcome" = DONE ] && commit_result "$id" "$result"; then
          if ! $no_wait; then
            publish_chunk "$id"
            settle_review "$id"
          fi
        else
          [ "$outcome" = DONE ] && outcome="commit failed, see $LOG_DIR/run.log"
          block_chunk "$id" "$result" "$outcome"
          die "$id blocked ($outcome): 'rfc-delivery/run.sh $RFC debug $id'; $(retry_hint "$outcome" "$id" | sed 's/`//g')"
        fi
        ;;
      *) die "cannot plan the next step: $action" ;;
    esac
    $once && return
  done
}

# The plan starts once someone other than its author approved the tracking pull request.
approve_plan() {
  local pr data
  pr="$(private_pr)"
  none "$pr" && die "no tracking pull request yet: run 'rfc-delivery/run.sh $RFC start'"
  data="$(gh pr view "$pr" --repo "$PRIVATE_REPOSITORY" --json author,reviews 2>/dev/null || echo '{}')"
  if jq -e '.author.login as $a | [.reviews[]? | select(.author.login != $a)] | group_by(.author.login)
      | map(sort_by(.submittedAt) | last) | any(.state == "APPROVED")' <<<"$data" >/dev/null; then
    set_field rfc_status in-progress
    private_commit "start the loop: plan approved"
    refresh_bodies
    log "plan approved on the tracking PR #$pr: the loop starts"
  else
    die "the plan waits for the team: approve the tracking PR $PRIVATE_REPOSITORY#$pr (someone other than its author)"
  fi
}

# ---------------------------------------------------------------- setup: issues and branches

# Creates the RFC issue and one sub-issue per chunk of this repository. Titles only: the public
# issues cite the RFC and its criteria by id.
create_issues() {
  local yes="${1:-}" id title url number parent_id child_id rfc_issue slice acs
  rfc_issue="$(header rfc_issue)"
  echo "Issues to create in $REPOSITORY:"
  none "$rfc_issue" && echo "  $(header public_title) (the RFC)"
  while read -r id _ <&4; do none "$(fact "$id" issue)" && echo "  $(cli title "$DIR" "$id")"; done 4< <(chunks)
  if [ "$yes" != "--yes" ]; then
    read -r -p "Create them? [y/N] " answer
    [ "$answer" = y ] || return 0
  fi
  if none "$rfc_issue"; then
    url="$(gh issue create --repo "$REPOSITORY" --title "$(header public_title)" \
      --body "Implements: $RFC. Delivered as a stack of pull requests, one sub-issue per chunk." </dev/null)"
    rfc_issue="${url##*/}"
    set_field rfc_issue "$rfc_issue"
    label_issue "$rfc_issue" "$(header public_title | sed -E 's/^([a-z]+).*/\1/')"
    echo "#$rfc_issue the RFC"
  fi
  parent_id="$(gh issue view "$rfc_issue" --repo "$REPOSITORY" --json id --jq .id </dev/null)"
  while read -r id _ <&4; do
    none "$(fact "$id" issue)" || continue
    title="$(cli title "$DIR" "$id")"
    slice="$(chunk_field "$id" slice)"
    acs="$(chunk_field "$id" acceptance | sed 's/,/, /g')"
    url="$(gh issue create --repo "$REPOSITORY" --title "$title" \
      --body "Part of #$rfc_issue. Implements: $RFC ($slice${acs:+; $acs})." </dev/null)"
    number="${url##*/}"
    label_issue "$number" "$(chunk_field "$id" type)"
    child_id="$(gh issue view "$number" --repo "$REPOSITORY" --json id --jq .id </dev/null)"
    gh api graphql -f query='mutation($p: ID!, $c: ID!) { addSubIssue(input: {issueId: $p, subIssueId: $c}) { issue { number } } }' \
      -f p="$parent_id" -f c="$child_id" </dev/null >/dev/null || log "could not attach #$number to #$rfc_issue"
    set_fact "$id" issue "$number"
    echo "#$number $title"
  done 4< <(chunks)
  private_commit "create the issues of $RFC"
}

# The RFC branch with its draft pull request onto main, and the tracking pull request. Idempotent.
start_rfc() {
  local rfc_issue branch pr body="$LOG_DIR/pr-body.md" title l label_args=()
  rfc_issue="$(header rfc_issue)"
  none "$rfc_issue" && die "no RFC issue yet: run 'rfc-delivery/run.sh $RFC issues' first"
  [ -z "$(git status --porcelain --untracked-files=all)" ] || die "working tree not clean"
  branch="$(header branch)"
  if none "$branch"; then branch="issue/$rfc_issue"; set_field branch "$branch"; fi
  if ! git rev-parse --verify --quiet "$branch" >/dev/null; then
    git fetch --quiet origin "$BASE"
    git checkout --quiet -b "$branch" "origin/$BASE"
    # GitHub opens no pull request without a commit between the branches.
    git commit --quiet --allow-empty -m "chore: start the delivery of $RFC (#$rfc_issue)" \
      -m "Chunks land here as stacked pull requests; this pull request brings them to $BASE."
    log "branch $branch created on origin/$BASE"
  fi
  git push --quiet origin "$branch:$branch"
  pr="$(header pull_request)"
  if none "$pr"; then
    cli pr-body "$DIR" >"$body"
    title="$(header public_title) (#$rfc_issue)"
    while IFS= read -r l; do label_args+=(--label "$l"); done < <(pr_labels)
    pr="$(gh pr create --repo "$REPOSITORY" --draft --base "$BASE" --head "$branch" ${label_args[@]+"${label_args[@]}"} \
      --title "$title" --body-file "$body")" ||
      die "could not open the RFC pull request"
    pr="${pr##*/}"
    set_field pull_request "$pr"
    log "opened draft PR #$pr: $branch onto $BASE"
  fi
  private_commit "plan the delivery of $RFC"
  pr="$(private_pr)"
  if none "$pr"; then
    cli private-pr-body "$DIR" >"$LOG_DIR/private-pr-body.md"
    pr="$(gh pr create --repo "$PRIVATE_REPOSITORY" --base main --head "$PRIVATE_BRANCH" \
      --title "docs(rfc-delivery): plan the delivery of $RFC" --body-file "$LOG_DIR/private-pr-body.md")" ||
      die "could not open the tracking pull request"
    pr="${pr##*/}"
    set_field private_pull_request "$pr"
    private_commit "link the tracking pull request"
    log "opened the tracking PR $PRIVATE_REPOSITORY#$pr: the team reviews the split there"
  fi
  refresh_bodies
}

# Carries the chunks above <chunk> (or every chunk) onto what is below them: merges, never
# rebases, so that the reviews on their pull requests keep their place. A conflict gets one Stack
# fix session. Each chunk that moved goes back to review: the loop waits for its checks again.
restack() {
  local from="${1:-}" id status branch base_branch base_ref started=false result conflicted pr
  acquire_lock
  require_ready
  if [ -n "$from" ] && ! chunks | awk '{ print $1 }' | grep -qx "$from"; then die "no chunk $from in $RFC"; fi
  sync_merged
  git fetch --quiet origin
  while read -r id status <&4; do
    if [ -z "$from" ] || [ "$id" = "$from" ]; then started=true; fi
    $started || continue
    [ "$status" = merged ] && continue
    branch="$(fact "$id" branch)"
    none "$branch" && continue
    git rev-parse --verify --quiet "$branch" >/dev/null || git branch --quiet "$branch" "origin/$branch"
    base_branch="$(cli base "$DIR" "$id")"
    git checkout --quiet "$branch"
    git merge --ff-only --quiet "origin/$branch" >/dev/null 2>&1 || true
    base_ref="$base_branch"
    if git rev-parse --verify --quiet "origin/$base_branch" >/dev/null && ! git merge-base --is-ancestor "origin/$base_branch" "$base_branch" 2>/dev/null; then
      base_ref="origin/$base_branch"
    fi
    if ! git merge-base --is-ancestor "$base_ref" HEAD; then
      if ! git merge --quiet --no-edit "$base_ref" >/dev/null 2>&1; then
        conflicted="$(git diff --name-only --diff-filter=U)"
        [ -n "$conflicted" ] || { git merge --abort; die "$id: merging $base_branch failed"; }
        log "$id: merging $base_branch conflicts in $(echo $conflicted): one Stack fix session"
        result="$(run_chunk_session "$id" "Stack fix mode" "The conflicted files: $(echo $conflicted).")"
        if [ "$(jq -r .status <<<"$result")" != DONE ] || grep -lE '^(<<<<<<<|>>>>>>>)( |$)' $conflicted >/dev/null 2>&1; then
          git merge --abort
          die "$id: the conflicts with $base_branch need a human"
        fi
        git add -A
        git commit --quiet --no-edit
      fi
      log "$id: $base_branch merged in"
    fi
    # Nothing new on this branch: nothing to push, no check to wait for again.
    [ "$(git rev-parse HEAD)" = "$(git rev-parse --verify --quiet "origin/$branch" || true)" ] && continue
    git push --quiet origin "$branch:$branch"
    pr="$(fact "$id" pull_request)"
    none "$pr" || gh pr edit "$pr" --repo "$REPOSITORY" --base "$base_branch" >/dev/null || true
    if [ "$status" = done ]; then set_status "$id" review; fi
    log "$id: pushed, back to review"
  done 4< <(chunks)
  private_commit "restack $RFC"
  refresh_bodies
  log "restacked: run rfc-delivery/run.sh $RFC to wait for the checks again"
}

resume_chunk() {
  local id="${1:-}" ref
  if [ -z "$id" ] || [[ $id == --* ]]; then
    id="$(chunks | awk '$2 == "blocked" || $2 == "in-progress" { print $1; exit }')"
  else
    shift
  fi
  [ -n "$id" ] || die "nothing to resume: no chunk is blocked or in progress"
  ref="$(put_aside_of "$id")"
  if [ -n "$ref" ]; then
    log "$id: resuming from the code it put aside ($ref)"
    touch "$LOG_DIR/$id.resume"
  fi
  rm -f "$LOG_DIR/$id.blocked"
  main_run "$@"
}

interactive() {
  local doc="$1" prompt="$2" pid
  pid="$(running_pid)"
  [ -z "$pid" ] || die "run.sh is running on $RFC (pid $pid): let it stop first"
  exec claude --add-dir "$PRIVATE" --add-dir "$FLOW" "Read $doc fully and follow it. $prompt The tracking folder is $DIR, the RFC is git -C $FLOW show $(header source.sha):$(header source.path), the run logs are in $LOG_DIR."
}

publish_by_hand() {
  local id status
  acquire_lock
  while read -r id status <&4; do
    none "$(fact "$id" branch)" && continue
    git rev-parse --verify --quiet "$(fact "$id" branch)" >/dev/null || continue
    git push --quiet origin "$(fact "$id" branch):$(fact "$id" branch)" || log "could not push $id"
  done 4< <(chunks)
  private_commit "publish $RFC by hand"
  refresh_bodies
  log "published: rfc-delivery/run.sh $RFC waits for the checks of the chunks in review"
}

main_run() {
  local once=false no_wait=false dry_run=false arg
  for arg in "$@"; do
    case "$arg" in
      --once) once=true ;;
      --no-wait) no_wait=true ;;
      --dry-run) dry_run=true ;;
      *) die "unknown option $arg" ;;
    esac
  done
  process "$once" "$no_wait" "$dry_run"
}

case "${1:-}" in
  status)
    chunks | awk '{ print $2 }' | sort | uniq -c
    echo "rfc_status: $(header rfc_status)"
    echo "next: $(cli next "$DIR")"
    ;;
  issues) create_issues "${2:-}" ;;
  start) start_rfc ;;
  restack) restack "${2:-}" ;;
  resume) shift; resume_chunk "$@" ;;
  publish) publish_by_hand ;;
  debug)
    [ -n "${2:-}" ] || die "usage: rfc-delivery/run.sh $RFC debug <chunk>"
    interactive rfc-delivery/DEBUG.md "The chunk is $2 (status $(status_of "$2"), PR #$(fact "$2" pull_request))."
    ;;
  feedback)
    [ -n "${2:-}" ] || die "usage: rfc-delivery/run.sh $RFC feedback <chunk>"
    interactive rfc-delivery/FEEDBACK.md "The chunk is $2, its pull request $REPOSITORY#$(fact "$2" pull_request), its branch $(fact "$2" branch)."
    ;;
  review) interactive .claude/skills/review-rfc/SKILL.md "The RFC pull request is $REPOSITORY#$(header pull_request), the tracking one $PRIVATE_REPOSITORY#$(private_pr)." ;;
  *) main_run "$@" ;;
esac
