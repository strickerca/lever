# LEVER Specification - Corrections Applied (v3.1)

This document lists all corrections made during the accuracy review.

## Corrections Applied

### 1. Segment Ratio Sum Note (Section 3.1)
**Issue:** Winter's segment ratios sum to 0.948, not 1.0.
**Fix:** Added explanatory note that `normalizeToHeight()` handles this discrepancy.

### 2. Ape Index Formula (Section 6 / Implementation Guide)
**Issue:** Formula `(2 * totalArm + 0.25 * torso) / height` gave 0.952 for average person.
**Fix:** Updated coefficient to `0.36` so average person has ape index = 1.0.
**New Formula:** `apeIndex = (2 * totalArm + 0.36 * torso) / height`

### 3. VPI Formula (Section 4.4)
**Issue:** Undefined variable `A_f` in formula.
**Fix:** Removed `A_f` from formula. New formula: `VPI = (M_body + M_added) × G_f / M_body^0.67`

### 4. Missing OHP Formula (Added Section 4.6)
**Issue:** OHP listed as supported but no formula provided.
**Fix:** Added complete OHP section with displacement and work formulas.

### 5. Missing Thruster Model (Added Section 4.7)
**Issue:** Thruster listed as supported but no model provided.
**Fix:** Added complete Thruster section combining front squat + OHP.

### 6. Female Ratios Source (Section 3.2)
**Issue:** Source for sex differences not explicitly cited.
**Fix:** Added note citing de Leva (1996) for sex-specific mass distributions.

### 7. Deadlift Approximation Note (Section 4.2)
**Issue:** Formula assumes arms hang vertically at lockout, which is an approximation.
**Fix:** Added note explaining the ~2-3cm approximation.

### 8. Bench Press Formula Clarification (Section 4.3)
**Issue:** `L_arm` ambiguous - includes hand which doesn't contribute to vertical press.
**Fix:** Clarified that `L_press = upperArm + forearm` (not including hand).

### 9. THRUSTER Added to Enum (Section 6)
**Issue:** THRUSTER missing from LiftFamily enum.
**Fix:** Added `THRUSTER = "thruster"` to enum.

### 10. DerivedAnthropometry Comments (Section 6)
**Issue:** Interface fields had no documentation.
**Fix:** Added inline comments explaining each field.

## Verification Status

| Component | Status | Notes |
|-----------|--------|-------|
| Segment Ratios | ✅ Validated | Sum to 0.948, normalization handles this |
| Effective Mass Factors | ✅ Validated | de Leva (1996) sourced |
| Allometric Exponent | ✅ Validated | 0.67 from Vanderburgh & Batterham (1999) |
| Push-up GRF | ✅ Validated | 72% from Ebben et al. (2011) |
| Sumo Factors | ✅ Validated | Escamilla et al. (2000) sourced |
| Kinematic Solver | ✅ Validated | Math verified numerically |
| Demand Factor | ✅ Validated | √(ΔY) dampening is appropriate |

## Known Limitations

1. **Segment ratios are population averages** - Individual variation can be significant (±1-2 SD per segment).

2. **Kinematic solver uses 2D sagittal plane** - Ignores frontal plane mechanics (stance width, knee tracking).

3. **Sumo deadlift uses fixed factors** - Actual benefit varies with limb proportions.

4. **Bench press arch height is user-input** - No formula to estimate from body proportions.

5. **Deadlift lockout assumes vertical arms** - Minor approximation (~2-3cm).

## Recommendations for Future Versions

1. Add arm span as direct measurement option in Specific mode
2. Add stance width parameter for sumo deadlift personalization
3. Add 3D kinematic model for more accurate moment arm calculations
4. Add belt/equipment modifiers for equipped lifting comparisons
5. Add tempo/time-under-tension calculations for hypertrophy metrics
