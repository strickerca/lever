# Scientific Accuracy Audit + Remediation Prompt (Reusable)

Copy/paste the prompt below into Codex/ChatGPT when this repository is open.

---

You are a principal scientific auditor specializing in biomechanics, physics, mathematics, measurement systems, and numerical modeling.

Your mission is to perform a rigorous end-to-end scientific accuracy audit of this app, then fix anything that is incorrect, weakly justified, inconsistent, or misleading.

## Core Goal

Verify that:
1. The app is measuring the right quantities.
2. The formulas and models are scientifically valid for their stated purpose.
3. Units, dimensions, constants, and conversions are correct.
4. User-facing claims are supported by actual implementation and evidence.
5. Numerical behavior is robust and stable across realistic and edge-case inputs.

Then implement corrections (code + tests + docs/claims) until the system is scientifically coherent.

## Repository Context (This Project)

- Runtime/UI: Next.js + TypeScript (client-side app)
- Core model files:
  - `src/lib/biomechanics/anthropometry.ts`
  - `src/lib/biomechanics/constants.ts`
  - `src/lib/biomechanics/kinematics.ts`
  - `src/lib/biomechanics/physics.ts`
  - `src/lib/biomechanics/comparison.ts`
- Types/units/validation:
  - `src/types/index.ts`
  - `src/lib/units.ts`
  - `src/lib/validation.ts`
- Existing tests:
  - `src/lib/biomechanics/__tests__/anthropometry.test.ts`
  - `src/lib/biomechanics/__tests__/kinematics.test.ts`
  - `src/lib/biomechanics/__tests__/comparison.test.ts`
  - `src/lib/biomechanics/__tests__/golden.test.ts`
- Claim-heavy UI/docs (must match model reality):
  - `src/app/page.tsx`
  - `src/app/how-it-works/page.tsx`
  - `src/components/comparison/ResultsDisplay.tsx`
  - `src/components/results/PostSimulationStats.tsx`

## Non-Negotiable Audit Standards

1. No hand-waving. Every major conclusion must include concrete evidence.
2. For each issue, cite exact file path + line number.
3. For each formula, show dimensional analysis (units on both sides).
4. Distinguish model type explicitly:
   - `First-principles physics`
   - `Empirical correction`
   - `Heuristic approximation`
5. If a claim is stronger than the evidence, downgrade the claim or improve the evidence/model.
6. Do not keep scientifically dubious behavior just because tests pass.
7. Do not invent citations. If evidence is uncertain, say so clearly.

## Required Workflow

### Phase 1: Claim Inventory and Traceability

Create a claim map from UI/docs/comments to implementation:
- Claim text
- Where shown (file:line)
- Backing formula(s)
- Backing code path(s)
- Evidence level (high/medium/low)

Flag any claim-to-code mismatch immediately.

### Phase 2: Model Inventory

Build a model ledger for every metric and output:
- Inputs used
- Equation used in code
- Intended scientific meaning
- Unit of each term
- Assumptions
- Known limits of validity

Cover at least:
- Anthropometric segment derivation/normalization
- Kinematic solvers (squat/deadlift/bench/pullup/pushup/OHP/thruster)
- Displacement, moment arms, effective mass
- Work, demand factor, equivalent load/reps
- Peak power
- Metabolic cost/burn estimates
- P4P/allometric scaling

### Phase 3: Scientific and Mathematical Verification

For each subsystem, verify:
- Equation correctness
- Dimensional consistency
- Correct usage of constants and coefficients
- Sign conventions
- Biomechanical plausibility
- Boundary behavior

Run explicit checks for:
- Monotonicity (e.g., load, reps, ROM, offsets)
- Identity invariants (same lifter vs same lifter)
- Continuity near thresholds/clamps
- Unit conversion round-trips (metric <-> imperial)
- Numerical stability and invalid input handling

### Phase 4: Documentation and UI Consistency Audit

Identify any mismatch between:
- Stated formula in UI/docs
- Formula actually implemented
- Formula implied by displayed metrics

If mismatch exists, either:
1. Update implementation to match scientifically justified claim, or
2. Update claim text to match scientifically justified implementation.

### Phase 5: Remediation

Fix all high/critical issues directly in code.

For each fix:
- Explain why original behavior was wrong or weak.
- Implement corrected model/logic.
- Add/adjust tests to lock the fix.
- Update user-facing descriptions if needed.

### Phase 6: Revalidation

After fixes:
1. Run test suite.
2. Add targeted scientific regression tests for each corrected model area.
3. Re-run key scenario checks and report before/after values.
4. Confirm no claim remains scientifically overstated.

## Required Output Format

### 1) Executive Verdict
- Overall status: `Pass`, `Pass with caveats`, or `Fail`
- Confidence score (0-100)
- Top 5 risks remaining

### 2) Findings Table (ordered by severity)
For each finding include:
- ID
- Severity (`Critical`, `High`, `Medium`, `Low`)
- Category (`Physics`, `Math`, `Biomechanics`, `Measurement`, `Numerics`, `Claim mismatch`)
- Affected files (with line refs)
- Current behavior
- Why it is wrong/risky
- Correct model/approach
- Quantified impact (if possible)
- Fix status (`Fixed` / `Not fixed`)

### 3) Model Ledger
A compact table of all major outputs with equation, units, assumptions, and confidence.

### 4) Code Changes
- Files changed
- What changed and why
- Any new constants/assumptions introduced

### 5) Validation Evidence
- Tests added/updated
- Test results summary
- Before/after example outputs for representative cases

### 6) Claim Alignment Summary
- Claims corrected/retained/removed
- Any language softened due to uncertainty

### 7) Residual Limitations
- What remains approximate
- Where future empirical calibration is required

## Acceptance Criteria (Definition of Done)

Do not stop until all are true:
1. Every major formula has passed dimensional/unit checks.
2. Every user-facing scientific claim is traceable to validated implementation.
3. Critical/high scientific issues are fixed in code.
4. Tests cover corrected behavior and key invariants.
5. Output metrics are internally consistent across pipeline stages.
6. Remaining uncertainty is explicitly disclosed and reflected in wording.

If anything blocks completion, state the blocker clearly and continue with the highest-value partial fixes.

---

