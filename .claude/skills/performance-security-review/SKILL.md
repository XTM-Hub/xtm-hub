---
name: performance-security-review
description: Shared XTM Hub criteria for reviewing code for performance bottlenecks, security issues, and likely future failures, and for challenging assumptions as a devil's advocate.
---

# Performance & Security Review

Shared review criteria for uncovering performance bottlenecks, security
vulnerabilities, and high-probability future regressions before they reach
production. Applies when reviewing code and when writing new code that should
be judged against these standards. Act as a devil's advocate: challenge
assumptions, design choices, and "happy-path" reasoning to expose hidden risks
early.

## Core Responsibilities
- Identify CPU, memory, I/O, database, network, and rendering bottlenecks.
- Detect security weaknesses across authentication, authorization, input
  handling, secrets, dependency risk, and data exposure.
- Anticipate likely future failures caused by current design choices,
  edge-case gaps, and scalability limits.
- Recommend optimizations with clear rationale, expected impact, trade-offs,
  and implementation risk.
- Prioritize findings by severity and business impact, with actionable
  remediation steps.
- Intentionally seek counterexamples: what breaks under load spikes,
  malformed input, partial outages, race conditions, and misuse.
- Stress-test architecture decisions by asking "what if this assumption is
  wrong?" and "what fails first?".

## Devil's Advocate Mode
- Assume the current implementation can fail in production and prove or
  disprove that assumption with concrete reasoning.
- Challenge defaults (timeouts, retries, caching, batching, concurrency,
  validation, permissions, and secret handling).
- Evaluate blast radius: identify single points of failure and cross-service
  failure propagation.
- Consider attacker perspective and abuse cases, not only expected user
  behavior.
- When uncertain, state assumptions explicitly and list the fastest way to
  validate them.

## Review Standards
- Be strict, evidence-based, and explicit.
- Focus on root causes, not symptoms.
- Explain why each issue matters and what failure it can cause.
- Flag missing observability, test gaps, and regression risks.
- Avoid vague advice; each finding must be testable and verifiable.
- Prefer worst-case analysis when trade-offs are unclear.
- Include one realistic failure scenario for each High/Critical finding.

## Output Format
For every finding, provide:
1. Category: Performance | Security | Reliability/Regression Risk
2. Severity: Critical | High | Medium | Low
3. Location: File/module/function/context
4. Issue: Clear problem statement
5. Impact: User/system/business consequence
6. Evidence: Concrete signal, metric, or reasoning
7. Failure Scenario: Plausible "how this fails in production" narrative
8. Remediation: Practical steps to fix
9. Priority: Execution order recommendation

## Prioritization Policy
- Prioritize by exploitability or failure probability, impact, and breadth of
  effect.
- Escalate issues that can cause data compromise, service instability, or
  compounding technical debt.
- Highlight quick wins separately from structural fixes.
- Rank issues higher when they are hard to detect but expensive to recover
  from.
