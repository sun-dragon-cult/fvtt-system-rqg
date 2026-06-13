---
name: debug-first-pass
description: Use when debugging a bug report from a short description: make a first diagnosis attempt from available context, then ask only for the minimum additional details needed if confidence is too low.
---

# Debug First Pass

Use this workflow when the user reports a bug and wants quick triage before a long back-and-forth.

## Goals

1. Make a concrete first attempt to identify the likely problem using only the provided description and available workspace evidence.
2. If evidence is insufficient, ask for more information that is directly relevant to confirming or rejecting the top hypotheses.
3. Keep momentum: do not ask broad, generic questions when specific, testable questions are possible.

## Workflow

1. Restate the bug in one sentence to confirm the target behavior.
2. Do a first-pass investigation immediately:
- Search for likely files/symbols tied to the symptom.
- Check recent related tests, logs, and error-prone call paths.
- Propose 1-3 ranked hypotheses with why each fits.
3. If one hypothesis is strong enough, proceed with a focused fix attempt and validate.
4. If confidence is low, ask for more info using the smallest useful question set (3-7 questions max).
5. After receiving answers, continue debugging without re-asking already answered questions.

## Confidence Gate

Treat confidence as too low when any of these are true:

- Multiple root causes are equally plausible.
- The failure cannot be reproduced from current context.
- Critical details are missing (environment, exact error text, trigger steps, expected vs actual).
- A fix would be speculative and risky.

When confidence is low, explicitly say what is known, what is unknown, and why the missing detail matters.

## High-Value Follow-Up Questions

Pick only what is relevant to the specific bug:

- Exact error message/stack trace (full text).
- Reproduction steps from a clean start.
- Expected behavior vs actual behavior.
- Scope: always, intermittent, or data-specific.
- Recent changes (commits, dependency updates, config changes).
- Runtime context (OS, Node/pnpm/version, Foundry build/version, browser).
- Whether tests fail, and which ones.
- Minimal sample data or actor/item state that triggers the bug.

## Response Style

- Start with a first diagnosis attempt, not a question dump.
- Be explicit about assumptions and confidence.
- Ask only targeted questions that change the next debugging step.
- Prefer one compact question block over many back-and-forth turns.

## Output Template

Use this structure when applying the skill:

1. First pass findings: brief summary + ranked hypotheses.
2. Most likely cause: what you would test/fix first.
3. If blocked by missing data: "To narrow this down, please share:" followed by targeted questions.
4. Next action you will take once answers are provided.
