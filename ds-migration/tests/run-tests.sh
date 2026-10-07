#!/usr/bin/env bash
# Regression tests for ds-migration/run.sh, with fake claude, gh, yarn, curl and screenshots.
# Nothing leaves the machine.
# Usage: ds-migration/tests/run-tests.sh (macOS: the fake claude uses BSD sed).
set -uo pipefail
V="$(cd "$(dirname "$0")/../.." && pwd)"
ROOT="${TMPDIR:-/tmp}/ds-migration-tests"
PASS=0 FAIL=0
check() { if (set +o pipefail; eval "$2"); then echo "  ok   $1"; PASS=$((PASS + 1)); else echo "  FAIL $1"; FAIL=$((FAIL + 1)); fi; }

make_stubs() {
  local bin="$1/bin"
  mkdir -p "$bin"
  cat >"$bin/fake-gpg" <<'EOF'
#!/bin/sh
cat >/dev/null; echo "[GNUPG:] SIG_CREATED D 1 8 00 0 FAKE" >&2
printf -- '-----BEGIN PGP SIGNATURE-----\n\nZmFrZQ==\n-----END PGP SIGNATURE-----\n'
EOF
  printf '#!/bin/sh\necho "yarn $*" >> "$SB/calls.log"\ncase "$*" in *"next dev"*) touch "$SB/app-up" ;; esac\n' >"$bin/yarn"
  # APP_DOWN: the frontend answers only once the fake yarn has started it.
  cat >"$bin/curl" <<'EOF'
#!/bin/sh
case "$*" in *3012*) [ -z "${APP_DOWN:-}" ] || [ -f "$SB/app-up" ] || exit 7 ;; esac
exit 0
EOF
  cat >"$bin/gh" <<'EOF'
#!/bin/bash
echo "gh $*" >> "$SB/calls.log"
bodyfile() { while [ $# -gt 0 ]; do [ "$1" = --body-file ] && { echo "$2"; return; }; shift; done; }
# GH_CHECKS: space-separated stages consumed one per `pr checks` call (last one repeats):
#   missing (e2e aggregator not listed yet), pending, pass, fail
checks() {
  local stages=(${GH_CHECKS:-pass}) n
  n=$(cat "$SB/checks-count" 2>/dev/null || echo 0); echo $((n + 1)) > "$SB/checks-count"
  [ "$n" -lt "${#stages[@]}" ] || n=$((${#stages[@]} - 1))
  case "${stages[$n]}" in
    missing) echo '[{"name":"run-api-unit-tests","bucket":"pass"},{"name":"run-front-unit-tests","bucket":"pass"}]' ;;
    pending) echo '[{"name":"run-api-unit-tests","bucket":"pass"},{"name":"run-front-unit-tests","bucket":"pass"},{"name":"run-e2e-tests","bucket":"pending"}]' ;;
    pass) echo '[{"name":"run-api-unit-tests","bucket":"pass"},{"name":"run-front-unit-tests","bucket":"pass"},{"name":"run-e2e-tests","bucket":"pass"},{"name":"lint","bucket":"skipping"}]' ;;
    fail) echo '[{"name":"run-api-unit-tests","bucket":"pass"},{"name":"run-front-unit-tests","bucket":"fail"},{"name":"run-e2e-tests","bucket":"pass"}]' ;;
  esac
}
# A fake project board: one item per issue, ITEM_<issue>; moves are logged to board.log.
argval() { local k="$1"; shift; while [ $# -gt 0 ]; do case "$2" in "$k="*) echo "${2#*=}"; return ;; esac; shift; done; }
board() {
  case "$*" in
    *updateProjectV2ItemFieldValue*) echo "$(argval o "$@") $(argval i "$@")" >> "$SB/board.log" ;;
    *projectV2\(number*) printf '{"data":{"organization":{"projectV2":{"id":"P1","field":{"id":"F1","options":[{"id":"OPT_DEV","name":"Development"},{"id":"OPT_REVIEW","name":"Code review"},{"id":"OPT_DONE","name":"Done"}]}}},"repository":{"issue":{"id":"I_%s","projectItems":{"nodes":[{"id":"ITEM_%s","project":{"id":"P1"}}]}}}}}\n' "$(argval issue "$@")" "$(argval issue "$@")" ;;
  esac
  exit 0
}
case "$1 $2" in
  "issue edit") [ "$3" = 3561 ] && [ "$4" = --body-file ] && cp "$5" "$SB/issue-3561.md"; exit 0 ;;
  "api graphql") board "$@" ;;
  "issue comment") exit 0 ;;
  "pr comment") if [ "$4" = --body ]; then echo "$5" >> "$SB/pr-comments.log"; else cp "$(bodyfile "$@")" "$SB/last-pr-comment.md"; fi ;;
  "pr edit") cp "$(bodyfile "$@")" "$SB/pr-body.md" ;;
  "pr create") cp "$(bodyfile "$@")" "$SB/pr-body.md"; echo "https://github.com/XTM-Hub/xtm-hub/pull/9999" ;;
  "issue view") echo "I_$3" ;;
  "pr view")
    case "$*" in
      # PR_CONFLICT_ONCE: the PR conflicts once, while main gets a commit the branch lacks.
      *mergeable*)
        if [ -f "$SB/pr-conflict" ]; then
          rm "$SB/pr-conflict"
          (cd "$SB/other" && git pull -q && echo "export const late = 1;" > apps/frontend/src/late.ts && git add -A && git -c commit.gpgsign=false commit -qm "feat: late on main" && git push -q origin main)
          echo CONFLICTING
        else
          echo MERGEABLE
        fi ;;
      *) git rev-parse HEAD ;;
    esac ;;
  "pr checks") checks ;;
  "run list") echo 123 ;;
  "run view") echo "fake failing log" ;;
  *) echo "unexpected gh $*" >&2; exit 1 ;;
esac
EOF
  cat >"$bin/claude" <<'EOF'
#!/bin/bash
if [ "$1" != -p ]; then echo "claude-interactive :: $1" >> "$SB/calls.log"; exit 0; fi
if [ -n "${CLAUDE_SLEEP:-}" ]; then touch "$SB/claude-started"; sleep "$CLAUDE_SLEEP"; fi
prompt="$2"
echo "claude :: $prompt" >> "$SB/calls.log"
[ "${CLAUDE_CODE_DISABLE_BACKGROUND_TASKS:-}" = 1 ] || echo "claude with background tasks allowed" >> "$SB/calls.log"
if [[ "$prompt" == *"Sync fix mode"* ]]; then
  grep -rl "import { Textarea } from '@filigran/ui';" apps/frontend/src | while read -r f; do
    sed -i '' "s#import { Textarea } from '@filigran/ui';#import { Textarea } from '@filigran/design-system';#" "$f"; done
  echo '{"type":"result","structured_output":{"status":"DONE","summary":"Moved new usages.","commit_subject":"","commit_body":""}}'; exit 0
fi
if [[ "$prompt" == *"Merge conflict mode"* ]]; then
  for f in $(git diff --name-only --diff-filter=U); do git show ":2:$f" > "$f"; done
  echo '{"type":"result","structured_output":{"status":"DONE","summary":"Kept the migration and the change from main.","commit_subject":"","commit_body":""}}'; exit 0
fi
if [[ "$prompt" == *"Epic review mode"* ]]; then echo '{"type":"result","structured_output":{"findings":"Verdict: consistent."}}'; exit 0; fi
key="$(sed -E 's/.*for item ([a-z0-9-]+) .*/\1/' <<<"$prompt")"; kind="$(sed -E 's/.*kind ([a-z]+)\).*/\1/' <<<"$prompt")"
issue="${key%%-*}"; slug="${key#*-}"; mkdir -p ds-migration/specs
if [[ "$prompt" == *"Spec mode"* ]]; then
  legacy="[]"; module='"@filigran/design-system"'; [ "$kind" = candidate ] && module="\"@/components/ui/$slug\""
  [ "$key" = 3561-textarea ] && legacy="[Textarea]"
  printf -- '---\nkey: %s\nkind: %s\nlegacy_symbols: %s\ntarget_module: %s\ntarget_symbols: []\nlegacy_files_to_delete: []\n---\n# %s\n\n## To validate\n\n- kept the current spacing\n- [x] chosen in an epic review\n' "$key" "$kind" "$legacy" "$module" "$slug" > "ds-migration/specs/$key.md"
  [[ " ${CLAUDE_SPEC_DIRTY:-} " == *" $key "* ]] && echo early > "apps/frontend/src/$slug.early.ts"
  echo '{"type":"result","structured_output":{"status":"DONE","summary":"Spec written."}}'; exit 0
fi
if [[ " ${CLAUDE_BLOCK:-} " == *" $key "* ]]; then
  echo half > "apps/frontend/src/$slug.wip.ts"
  echo '{"type":"result","structured_output":{"status":"NEEDS_HUMAN","summary":"Undecidable.","commit_subject":"","commit_body":"","question":"Which option?"}}'; exit 0
fi
if [[ "$prompt" == *"CI fix"* ]]; then
  echo "// fix" >> "apps/frontend/src/$slug.ts"
  echo "{\"type\":\"result\",\"structured_output\":{\"status\":\"DONE\",\"summary\":\"fixed\",\"commit_subject\":\"fix(frontend): repair $slug (#$issue)\",\"commit_body\":\"Fix.\"}}"; exit 0
fi
[ "$key" = 3561-textarea ] && sed -i '' "s#import { Textarea } from '@filigran/ui';#import { Textarea } from '@filigran/design-system';#" apps/frontend/src/Form.tsx
echo "{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"tool_use\",\"name\":\"Agent\",\"input\":{\"description\":\"Implement $key\"}}]}}"
echo "not json"
echo "export const v_$(echo "$slug" | tr - _) = 1;" > "apps/frontend/src/$slug.ts"
if [[ " ${CLAUDE_E2E:-} " == *" $key "* ]]; then mkdir -p apps/e2e/tests/model && echo "// $slug locator" > "apps/e2e/tests/model/$slug.pageModel.ts"; fi
if [[ " ${CLAUDE_E2E_SEEDS:-} " == *" $key "* ]]; then mkdir -p apps/e2e/seeds && echo "-- $slug" > "apps/e2e/seeds/$slug.sql"; fi
printf '\n## Deferred findings\n\n- found in review, on a bullet\n  that wraps\n' >> "ds-migration/specs/$key.md"
echo "{\"type\":\"result\",\"structured_output\":{\"status\":\"DONE\",\"summary\":\"ok\",\"commit_subject\":\"invalid\",\"commit_body\":\"Migrate $slug.\\nCo-Authored-By: x <y@z>\"}}"
EOF
  chmod +x "$bin/"*
}

# new_repo <name> <status yaml body>
new_repo() {
  SB="$ROOT/$1"; rm -rf "$SB"; mkdir -p "$SB/repo"; git init -q --bare "$SB/remote.git"; make_stubs "$SB"
  export SB PATH="$SB/bin:$ORIG_PATH" DS_CHECKS_INTERVAL=0 DS_BOARD_SETTLE=0
  cd "$SB/repo" || exit 1
  git init -q -b main && git config user.name Test && git config user.email t@t && git config commit.gpgsign true
  git config gpg.program "$SB/bin/fake-gpg" && git config user.signingkey FAKE
  mkdir -p apps/frontend/src apps/frontend/app ds-migration
  printf "import { Textarea } from '@filigran/ui';\nexport const Form = () => <Textarea />;\n" >apps/frontend/src/Form.tsx
  cp "$V/ds-migration/"{run.sh,WORKFLOW.md,DEBUG.md,REVIEW.md,spec-template.md,validate.mjs} ds-migration/ && chmod +x ds-migration/run.sh
  # SCREENSHOT_FAIL: item keys whose after screenshots fail.
  cat >ds-migration/screenshot.mjs <<'EOF'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
const [spec, phase] = process.argv.slice(2);
appendFileSync(`${process.env.SB}/calls.log`, `screenshot ${phase} ${spec ?? ''}\n`);
// PREFLIGHT_FAILS: how many preflights fail before one passes.
if (spec === '--preflight') {
  const marker = `${process.env.SB}/preflights`;
  const done = existsSync(marker) ? Number(readFileSync(marker, 'utf8')) : 0;
  writeFileSync(marker, String(done + 1));
  process.exit(done < Number(process.env.PREFLIGHT_FAILS ?? 0) ? 1 : 0);
}
const failing = (process.env.SCREENSHOT_FAIL ?? '').split(' ').filter(Boolean);
if (phase === 'after' && failing.some((key) => spec.includes(key))) process.exit(1);
// AFTER_FAIL_ONCE: item keys whose first after screenshots fail, then pass.
const once = (process.env.AFTER_FAIL_ONCE ?? '').split(' ').filter(Boolean).find((key) => spec?.includes(key));
if (phase === 'after' && once && !existsSync(`${process.env.SB}/failed-once-${once}`)) {
  writeFileSync(`${process.env.SB}/failed-once-${once}`, '');
  process.exit(1);
}
EOF
  printf 'epic_issue: 3507\nbranch: issue/3507\nbase: main\npull_request: none\nrequired_checks: run-api-unit-tests, run-front-unit-tests, run-e2e-tests\nrepository: XTM-Hub/xtm-hub\ngithub_project: XTM-Hub/1\nproject_statuses: Development, Code review, Done\n\n%s\n' "$2" >ds-migration/sprint-status.yaml
  git add -A && git commit -qm init && git remote add origin "$SB/remote.git" && git push -q origin main && git switch -qc issue/3507
}
status_of() { awk -v k="  $1:" 'index($0, k) == 1 { print $2; exit }' ds-migration/sprint-status.yaml; }
approve() { perl -pi -e "s/^  $1: .*/  $1: done/" ds-migration/sprint-status.yaml; }
run() { ds-migration/run.sh "$@" >"$SB/out.log" 2>&1; }
ORIG_PATH="$PATH"

echo "A. dependencies, epic gates, unblock, cleanup, finish"
new_repo a "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3541-checkbox: backlog
  epic-3-candidates: backlog
  9001-table: backlog
  9002-data-table: backlog
  epic-4-cleanup: backlog
  9003-remove-filigran-ui: backlog

dependencies:
  9002-data-table: [3541-checkbox, 9001-table]
  9003-remove-filigran-ui: [epic-1-primitives, epic-3-candidates]

covers:
  3561-textarea: [4001, 4002]"
CLAUDE_BLOCK=3541-checkbox run
check "a blocked item stops the run" 'grep -q "STOP: 3541-checkbox blocked" "$SB/out.log" && [ "$(status_of epic-1-primitives)" = in-progress ]'
run
check "checkbox blocked, epic 1 gated" '[ "$(status_of 3541-checkbox)" = blocked ] && [ "$(status_of epic-1-primitives)" = review ]'
check "epic report posted with the automated review" 'grep -q "Verdict: consistent" "$SB/last-pr-comment.md" && grep -q "ds-migration/run.sh review" "$SB/last-pr-comment.md"'
ds-migration/run.sh review >"$SB/out.log" 2>&1
check "a review comment waits for the reviewer" 'grep -q "^## epic-1-primitives review" "$SB/pr-comments.log"'
check "review opens an interactive session on the epic waiting for review" 'grep -q "^claude-interactive :: Read ds-migration/REVIEW.md fully and follow it for epic-1-primitives (status review)" "$SB/calls.log"'
check "blocked item signalled on its issue and the PR" 'grep -q "^gh issue edit 3541 --add-label needs more info" "$SB/calls.log" && grep -qF "**Component Checkbox needs a human.** Issue #3541" "$SB/pr-comments.log" && sed -n "/^## Needs a human/,/^## /p" "$SB/pr-body.md" | grep -q "#3541"'
ds-migration/run.sh debug 3541-checkbox >"$SB/out.log" 2>&1
check "debug opens an interactive session on the item" 'grep -q "^claude-interactive :: Read ds-migration/DEBUG.md fully and follow it for item 3541-checkbox (issue #3541, status blocked)" "$SB/calls.log"'
check "default subject used for an invalid one" 'git log --format=%s | grep -qx "feat(frontend): migrate Textarea to @filigran/design-system (#3561)"'
check "no AI trailer in commits" '! git log --format=%B | grep -qi "co-authored-by"'
check "screens captured between the spec and the build" '[ "$(grep -oE "Spec mode for item 3561|screenshot before ds-migration/specs/3561|Build mode for item 3561" "$SB/calls.log" | cut -d" " -f1 | paste -sd, -)" = "Spec,screenshot,Build" ]'
check "session progress shown live in the run log" 'grep -q "3561-textarea   Agent Implement 3561-textarea" "$(git rev-parse --git-dir)/ds-migration/run.log" && [ -s "$(git rev-parse --git-dir)/ds-migration/3561-textarea.jsonl" ]'
check "issue body replaced by the spec, by the script" 'head -1 "$SB/issue-3561.md" | grep -qx "Part of #3507." && grep -qx "# textarea" "$SB/issue-3561.md" && ! grep -q "^kind:" "$SB/issue-3561.md"'
check "issue assigned and moved along the board" 'grep -q "^gh issue edit 3561 --add-assignee @me" "$SB/calls.log" && [ "$(grep " ITEM_3561$" "$SB/board.log" | cut -d" " -f1 | head -3 | paste -sd, -)" = "OPT_DEV,OPT_REVIEW,OPT_DONE" ]'
check "done items put back after the board automation" '[ "$(grep -c "^OPT_DONE ITEM_3530$" "$SB/board.log")" -ge 1 ] && [ "$(grep " ITEM_3561$" "$SB/board.log" | tail -1 | cut -d" " -f1)" = OPT_DONE ]'
check "covered issues assigned and moved with their item" 'grep -q "^gh issue edit 4001 --add-assignee @me" "$SB/calls.log" && grep -qx "OPT_DONE ITEM_4002" "$SB/board.log"'
check "issue shows the final spec, findings included" 'grep -qx "  that wraps" "$SB/issue-3561.md"'
check "wrapped spec bullets kept whole in the PR report" 'grep -qx -- "- \[ \] found in review, on a bullet that wraps" "$SB/pr-body.md"'
check "PR report grouped by issue, validated lines ticked" 'grep -qx "### #3561 Textarea" "$SB/pr-body.md" && grep -qx -- "- \[x\] chosen in an epic review" "$SB/pr-body.md" && grep -qx -- "- \[ \] kept the current spacing" "$SB/pr-body.md"'
check "sessions never run subagents in the background" '! grep -q "claude with background tasks allowed" "$SB/calls.log"'
check "validation steps logged as they run" 'grep -q "3561-textarea: validating, check-ts" "$(git rev-parse --git-dir)/ds-migration/run.log" && grep -q "3561-textarea: validating, after screenshots" "$(git rev-parse --git-dir)/ds-migration/run.log"'
check "after screenshots part of the validation" 'grep -q "^screenshot after ds-migration/specs/3561-textarea.md" "$SB/calls.log"'
check "done item announced on the PR" 'grep -qx "Component Textarea done. Issue #3561" "$SB/pr-comments.log"'
approve epic-1-primitives; run
check "data-table waits on checkbox" '[ "$(status_of 9002-data-table)" = backlog ] && [ "$(status_of 9001-table)" = done ] && grep -q "| #9002 data-table | backlog | 3541-checkbox" "$SB/last-pr-comment.md"'
perl -pi -e 's/^  3541-checkbox: blocked/  3541-checkbox: backlog/' ds-migration/sprint-status.yaml; run
check "unblocked checkbox done, epic 1 reopened for review" '[ "$(status_of 3541-checkbox)" = done ] && [ "$(status_of epic-1-primitives)" = review ]'
check "label removed and PR body cleared once unblocked" 'grep -q "^gh issue edit 3541 --remove-label needs more info" "$SB/calls.log" && ! grep -q "^## Needs a human" "$SB/pr-body.md"'
approve epic-1-primitives; run; approve epic-3-candidates; run; approve epic-4-cleanup; run
check "dependency lines intact" 'grep -q "^  9002-data-table: \[3541-checkbox, 9001-table\]" ds-migration/sprint-status.yaml'
check "candidate and cleanup default subjects" 'git log --format=%s | grep -qx "feat(frontend): rebuild DataTable on @filigran/design-system primitives (#9002)" && git log --format=%s | grep -qx "chore(frontend): remove the legacy filigran-ui copy (#9003)"'
ds-migration/run.sh finish >"$SB/out.log" 2>&1
check "covered issues closed with their item" 'grep -q "^Closes #4001$" "$SB/pr-body.md" && grep -q "^Closes #4002$" "$SB/pr-body.md" && grep -q "textarea: done (also #4001, #4002)" "$SB/pr-body.md"'
check "finish removes ds-migration and reports candidates" '[ ! -d ds-migration ] && grep -q "9002 data-table: .@/components/ui/data-table." "$SB/pr-body.md"'

echo "B. merge of main brings a legacy usage of a migrated component"
new_repo b "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog
  3553-radio: backlog"
run --once
git clone -q "$SB/remote.git" "$SB/other"
(cd "$SB/other" && printf "import { Textarea } from '@filigran/ui';\nexport const N = () => <Textarea />;\n" >apps/frontend/src/New.tsx && git add -A && git -c commit.gpgsign=false commit -qm "feat: new on main" && git push -q origin main)
run --once
check "sync fix committed before the next item" 'git log --format=%s -3 | sed -n 2p | grep -q "^fix(frontend): move code from main"'
check "new usage moved to the design system" 'grep -q "@filigran/design-system" apps/frontend/src/New.tsx'

echo "C. required check not listed yet, then pending, then pass"
new_repo c "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog"
GH_CHECKS="missing missing pending pending pass" APP_DOWN=1 run --once
check "frontend started from apps/frontend, its log kept" 'grep -q "starting the frontend of this checkout" "$SB/out.log" && [ -f "$(git rev-parse --git-dir)/ds-migration/app.log" ]'
: >"$SB/calls.log"
ds-migration/run.sh publish >"$SB/out.log" 2>&1
check "publish refreshes the issues, pushes and waits for the checks" 'grep -q "^gh issue edit 3561 --body-file" "$SB/calls.log" && grep -q "^gh pr checks" "$SB/calls.log" && grep -q "published: the required checks of PR #9999 pass" "$SB/out.log"'
check "done item ticked in the PR body" 'grep -q "^- \[x\] #3561 textarea: done" "$SB/pr-body.md"'
check "item done only once the e2e aggregator passed" '[ "$(status_of 3561-textarea)" = done ] && [ "$(cat "$SB/checks-count")" -ge 5 ]'

echo "D. required check fails, one CI fix, still failing: stop"
new_repo d "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog"
GH_CHECKS="fail" run --once
check "CI fix attempted, item blocked, script stopped" '[ "$(status_of 3561-textarea)" = blocked ] && grep -q "STOP: 3561-textarea: required checks still failing" "$SB/out.log" && git log --format=%s -1 | grep -q "^fix(frontend): repair textarea (#3561)"'

echo "E. spec mode touches the code, then an after screenshot fails"
new_repo e "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog
  3553-radio: backlog"
CLAUDE_SPEC_DIRTY=3561-textarea run --once
check "code changed in spec mode: blocked before the build" '[ "$(status_of 3561-textarea)" = blocked ] && ! grep -q "Build mode for item 3561" "$SB/calls.log" && [ -z "$(git status --porcelain -- apps)" ]'
SCREENSHOT_FAIL=3568-switch run --once
check "a screen that no longer renders blocks the item" '[ "$(status_of 3568-switch)" = blocked ] && ! git log --format=%s | grep -q "Switch"'

echo "G. e2e locators follow the accessible names a migration changes"
new_repo g "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog
  3553-radio: backlog"
CLAUDE_E2E=3561-textarea run --once
check "validation steps reach the terminal" 'grep -q "3561-textarea: validating, after screenshots" "$SB/out.log"'
check "e2e locator change accepted and linted" '[ "$(status_of 3561-textarea)" = done ] && git show --stat HEAD | grep -q "apps/e2e/tests/model/textarea.pageModel.ts" && grep -q "^yarn workspace @xtm-hub/test_e2e lint" "$SB/calls.log"'
CLAUDE_E2E_SEEDS=3568-switch run --once
check "e2e seeds copied from the backend stay out of scope" '[ "$(status_of 3568-switch)" = blocked ] && grep -q "Out of scope: apps/e2e/seeds/switch.sql" "$(git rev-parse --git-dir)/ds-migration/3568-switch-validate.log"'

echo "H. an item in review whose commit sits on a long history"
new_repo h "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog"
run --once
for i in $(seq 1 400); do git -c commit.gpgsign=false commit -q --allow-empty -m "chore: filler $i $(printf 'x%.0s' $(seq 1 200))"; done
echo "export const s = 1;" > apps/frontend/src/switch.ts && git add -A && git -c commit.gpgsign=false commit -q -m "feat(frontend): migrate Switch to @filigran/design-system (#3568)"
perl -pi -e 's/^  3568-switch: .*/  3568-switch: review/' ds-migration/sprint-status.yaml
: >"$SB/preflights"; rm -f "$SB/preflights"
PREFLIGHT_FAILS=1 DS_PREFLIGHT_PAUSE=0 run --once
check "committed item resumes its checks instead of restarting" '[ "$(status_of 3568-switch)" = done ] && ! grep -q "interrupted before its commit" "$SB/out.log"'
check "a failed preflight is retried" 'grep -q "screenshot preflight failed (try 1 of 3)" "$SB/out.log" && [ "$(cat "$SB/preflights")" -ge 2 ]'

echo "I. a validation failure gets one fix session"
new_repo i "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog"
AFTER_FAIL_ONCE=3561-textarea run --once
check "validation fixed by a validation fix session, then committed" '[ "$(status_of 3561-textarea)" = done ] && grep -q "Validation fix mode for item 3561-textarea" "$SB/calls.log" && grep -q "3561-textarea: validation failed, one validation fix session" "$SB/out.log"'

echo "J. a signal stops the run during a session"
new_repo j "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog"
# Its own process group, signalled as a whole, as Ctrl-C does from a terminal.
CLAUDE_SLEEP=3 perl -e 'setpgrp(0, 0); exec @ARGV' ds-migration/run.sh --once >"$SB/out.log" 2>&1 &
runner=$!
for _ in $(seq 1 50); do [ -e "$SB/claude-started" ] && break; sleep 0.2; done
kill -TERM -- "-$runner"; wait "$runner"
check "interrupted run stops and frees its lock" 'grep -q "interrupted: run ds-migration/run.sh again to resume" "$SB/out.log" && [ ! -d "$(git rev-parse --git-dir)/ds-migration/run.lock" ] && ! grep -q "Build mode" "$SB/calls.log"'

echo "K. conflicts with main"
new_repo k "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog
  3553-radio: backlog"
run --once
git clone -q "$SB/remote.git" "$SB/other"
(cd "$SB/other" && printf "import { Textarea } from '@filigran/ui/legacy';\nexport const Form = () => <Textarea />;\n" >apps/frontend/src/Form.tsx && git add -A && git -c commit.gpgsign=false commit -qm "feat: change Form on main" && git push -q origin main)
run --once
check "a conflict with main at the start of an item is resolved by a session" '[ "$(status_of 3568-switch)" = done ] && grep -q "merge conflicts with main resolved" "$SB/out.log" && ! grep -q "^<<<<<<<" apps/frontend/src/Form.tsx && git log --merges --format=%s -1 | grep -q "origin/main"'
touch "$SB/pr-conflict"
run --once
check "a PR that conflicts while waiting for checks merges main instead of waiting" '[ "$(status_of 3553-radio)" = done ] && grep -q "conflicted with main, which no check runs on: main merged" "$SB/out.log" && [ -f apps/frontend/src/late.ts ]'

echo "F. crash recovery and lock"
new_repo f "development_status:
  epic-1-primitives: backlog
  3530-button: done
  3561-textarea: backlog
  3568-switch: backlog
  3553-radio: backlog
  3541-checkbox: backlog"
perl -pi -e 's/^  3561-textarea: .*/  3561-textarea: in-progress/' ds-migration/sprint-status.yaml
echo half > apps/frontend/src/half-done.ts
run --once
check "interrupted item: code put aside, item redone" '[ "$(status_of 3561-textarea)" = done ] && git stash list | grep -q "ds-migration 3561-textarea interrupted" && [ ! -e apps/frontend/src/half-done.ts ]'
perl -pi -e 's/^  3568-switch: .*/  3568-switch: review/' ds-migration/sprint-status.yaml
run --once
check "item in review without its commit restarted, not marked done" '[ "$(status_of 3568-switch)" = done ] && git log --format=%s | grep -qx "feat(frontend): migrate Switch to @filigran/design-system (#3568)"'
touch "$(git rev-parse --git-dir)/ds-migration/base-merge.pending"
echo half > apps/frontend/src/sync-half.ts
: >"$SB/calls.log"
run --once
check "radio done after the sync checks" '[ "$(status_of 3553-radio)" = done ]'
check "interrupted sync fix: changes put aside, sync checks run again" 'git stash list | grep -q "ds-migration base merge fix interrupted" && grep -q "^yarn workspace @xtm-hub/frontend relay" "$SB/calls.log" && [ ! -e "$(git rev-parse --git-dir)/ds-migration/base-merge.pending" ]'
mkdir -p "$(git rev-parse --git-dir)/ds-migration/run.lock" && echo $$ >"$(git rev-parse --git-dir)/ds-migration/run.lock/pid"
run --once
check "second run refused while one is running" 'grep -q "STOP: run.sh is already running (pid $$)" "$SB/out.log" && [ "$(status_of 3541-checkbox)" = backlog ]'
echo 999999 >"$(git rev-parse --git-dir)/ds-migration/run.lock/pid"
run --once
check "lock of a dead run taken over" '[ "$(status_of 3541-checkbox)" = done ] && [ ! -d "$(git rev-parse --git-dir)/ds-migration/run.lock" ]'

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
