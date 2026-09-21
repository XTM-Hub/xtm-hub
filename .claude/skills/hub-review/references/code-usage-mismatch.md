# Code-Usage Mismatch Lens

**Goal:** Find a documented convention or pattern the real code no longer follows, or a convention the code has
adopted that no doc captures. This lens judges the codebase against the doc, not the doc's internal consistency.

## Evidence rules

- Never conclude drift from the doc's wording alone — sample real usage: grep for the pattern, import, or API
  across the relevant app, and read at least one representative file before making a claim.
- A convention that is mid-migration (some files follow the old pattern, some the new one) is evidence, not proof
  either way — report the split itself (with rough counts) as the finding, and let escalation decide which the doc
  should mandate. Do not silently pick a side.
- Don't chase every convention in a large file; for a full audit, prioritize instructions that make a concrete,
  checkable claim (a specific hook, helper, function, or file to use) over broad, non-checkable prose guidance.
- Recency is a signal: a pattern that shows up in recently touched files carries more weight than one only in old,
  untouched code.

## Review sequence

1. List the concrete, checkable claims in the in-scope content — e.g. "use `logApp`, never `console.log`", "new
   data fetching uses `@tanstack/react-query`", "use `@filigran/ui` first for new UI".
2. For each claim, grep the relevant app for both the documented pattern and its alternative/predecessor.
3. Compare counts and recency to judge whether the doc still matches reality: doc matches code, doc is stale (code
   has moved on), or mid-migration (both patterns coexist and the doc's stance is unclear or unenforced).
4. For a mid-migration finding, state what fraction of usages found follow which pattern, with file examples for
   both, so escalation can make an informed call.

## Output

Each finding: `lens: code-usage-mismatch`, `location` (the doc's claim), `finding` (what you found in the code —
counts, example paths, and the verdict: matches / stale / mid-migration), `status`.
