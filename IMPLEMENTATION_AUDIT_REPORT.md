# LEVER Implementation Audit Report
**Date:** December 9, 2025
**Auditor:** Claude Code
**Specification:** Master Specification v3.0 + Corrections v3.1

---

## Executive Summary

⚠️ **CRITICAL ISSUES FOUND** - The implementation contains **9 critical bugs** that will cause completely incorrect biomechanical calculations. These must be fixed immediately before any production use.

**Status:**
- ✅ **Passing:** Type structure, kinematic solver algorithm, comparison engine structure
- ⚠️ **Critical Bugs:** Constants (effective mass factors, bar positions, segment ratios)
- ⚠️ **Missing Features:** SPECIFIC anthropometry mode, proper bench press formula
- ✅ **Testing:** Comprehensive test suite (61 tests passing)

---

## CRITICAL BUGS (Must Fix Immediately)

### 🔴 BUG #1: WRONG EFFECTIVE MASS FACTORS
**Severity:** CRITICAL - Causes incorrect work calculations for ALL squats and deadlifts

**Specification (Section 2.2):**
```typescript
squat: { male: 0.80, female: 0.812 }
deadlift: { male: 0.60, female: 0.608 }
```

**Current Implementation ([constants.ts:40-48](src/lib/biomechanics/constants.ts#L40-L48)):**
```typescript
squat: { male: 0.95, female: 0.95 }    // ❌ WRONG!
deadlift: { male: 0.95, female: 0.95 }  // ❌ WRONG!
```

**Impact:**
- Squat work calculations are ~19% too high (0.95 vs 0.80)
- Deadlift work calculations are ~58% too high (0.95 vs 0.60)
- All equivalent load calculations will be completely wrong
- All P4P scores will be incorrect

**Fix Required:**
```typescript
squat: { male: 0.80, female: 0.812 },
deadlift: { male: 0.60, female: 0.608 },
```

---

### 🔴 BUG #2: WRONG BAR POSITION OFFSETS
**Severity:** CRITICAL - Causes incorrect kinematic solutions and moment arms

**Specification (Section 4.1):**
```typescript
highBar: { vertical: +5, horizontal: -5 }
lowBar: { vertical: -5, horizontal: -12 }
front: { vertical: +8, horizontal: +8 }
```

**Current Implementation ([constants.ts:77-90](src/lib/biomechanics/constants.ts#L77-L90)):**
```typescript
highBar: { horizontal: -2.5, vertical: 0 }     // ❌ WRONG!
lowBar: { horizontal: -7, vertical: -8 }       // ❌ WRONG!
front: { horizontal: 2, vertical: -5 }         // ❌ WRONG!
```

**Impact:**
- Kinematic solver produces incorrect trunk angles
- Moment arms are completely wrong
- Bar position won't be over midfoot as intended
- Comparisons between variants (high bar vs low bar) are invalid

**Fix Required:**
Replace with specification values (all in cm):
```typescript
highBar: { vertical: 5, horizontal: -5 }
lowBar: { vertical: -5, horizontal: -12 }
front: { vertical: 8, horizontal: 8 }
```

---

### 🔴 BUG #3: WRONG MALE TORSO RATIO
**Severity:** CRITICAL - Affects all male lifter calculations

**Specification (Section 3.1):**
```typescript
male: {
  torso: 0.288,  // ✓ Correct
  ...
}
```

**Current Implementation ([constants.ts:14](src/lib/biomechanics/constants.ts#L14)):**
```typescript
male: {
  torso: 0.3,  // ❌ WRONG!
  ...
}
```

**Impact:**
- All male torso lengths are ~4% too long (0.3 vs 0.288)
- Affects kinematic solutions (trunk angle calculations)
- Affects all derived anthropometry
- Affects normalization process

**Fix Required:**
```typescript
torso: 0.288,
```

---

### 🔴 BUG #4: WRONG FEMALE SEGMENT RATIOS
**Severity:** CRITICAL - Affects all female lifter calculations

**Specification (Section 3.1):**
```typescript
female: {
  torso: 0.285,
  upperArm: 0.183,
  forearm: 0.143,
  hand: 0.106,
  femur: 0.245,  // Same as male per spec
  tibia: 0.246,  // Same as male per spec
  footHeight: 0.039,
}
```

**Current Implementation ([constants.ts:23-32](src/lib/biomechanics/constants.ts#L23-L32)):**
```typescript
female: {
  torso: 0.295,      // ❌ WRONG! (Should be 0.285)
  upperArm: 0.188,   // ❌ WRONG! (Should be 0.183)
  forearm: 0.145,    // ❌ WRONG! (Should be 0.143)
  hand: 0.107,       // ❌ WRONG! (Should be 0.106)
  femur: 0.248,      // ❌ WRONG! (Should be 0.245)
  tibia: 0.247,      // ❌ WRONG! (Should be 0.246)
  footHeight: 0.04,  // ❌ WRONG! (Should be 0.039)
}
```

**Impact:**
- ALL female anthropometry calculations are wrong
- Female lifters will have incorrect segment lengths
- All comparisons involving female lifters are invalid

**Fix Required:**
Replace with specification values.

---

### 🔴 BUG #5: BENCH PRESS USES WRONG ARM LENGTH
**Severity:** HIGH - Bench press calculations are incorrect

**Specification (Section 4.3 + Correction #8):**
> "Clarified that `L_press = upperArm + forearm` (not including hand)"

**Current Implementation ([physics.ts:209](src/lib/biomechanics/physics.ts#L209)):**
```typescript
const pressLength = anthropometry.derived.totalArm * Math.cos(gripAngleRad);
// totalArm = upperArm + forearm + hand  ❌ INCLUDES HAND!
```

**Impact:**
- Bench press ROM is too large (includes hand length)
- Bench press work calculations are too high
- Affects all bench press comparisons

**Fix Required:**
```typescript
const L_press = anthropometry.segments.upperArm + anthropometry.segments.forearm;
const pressLength = L_press * Math.cos(gripAngleRad);
```

---

### 🔴 BUG #6: WRONG DEFAULT HIP FLEXION
**Severity:** MEDIUM - May affect mobility-limited cases

**Specification (Section 6 & Section 7):**
```json
"defaultMobility": { "maxHipFlexion": 130 }
```

**Current Implementation ([constants.ts:129](src/lib/biomechanics/constants.ts#L129)):**
```typescript
maxHipFlexion: 120,  // ❌ Should be 130
```

**Impact:**
- Default mobility is more restrictive than specified
- May trigger mobility-limited flags incorrectly

**Fix Required:**
```typescript
maxHipFlexion: 130,
```

---

### 🔴 BUG #7: WRONG PUSHUP FEMALE FACTOR
**Severity:** LOW - Minor calculation error for female pushups

**Specification (Section 2.2):**
```typescript
pushup: { male: 0.72, female: 0.71 }
```

**Current Implementation ([constants.ts:58](src/lib/biomechanics/constants.ts#L58)):**
```typescript
pushup: { male: 0.72, female: 0.70 }  // ❌ Should be 0.71
```

**Impact:**
- Female pushup calculations ~1.4% too low

**Fix Required:**
```typescript
female: 0.71,
```

---

### 🔴 BUG #8: MISSING chestDepth IN SEGMENT RATIOS
**Severity:** MEDIUM - Bench press uses wrong chest depth

**Specification (Section 6):**
```typescript
interface SegmentLengths {
  ...
  chestDepth: number;  // ✓ Included
}

// In SEGMENT_RATIOS:
male: { ..., chestDepth: 0.035 }
female: { ..., chestDepth: 0.033 }
```

**Current Implementation:**
- Missing from SEGMENT_RATIOS ([constants.ts:12-33](src/lib/biomechanics/constants.ts#L12-L33))
- Missing from SegmentLengths interface ([types/index.ts:59-69](src/types/index.ts#L59-L69))
- Uses AVERAGE_CHEST_DEPTH = 0.23m constant instead ([constants.ts:143](src/lib/biomechanics/constants.ts#L143))

**Impact:**
- Chest depth is 0.23m (23cm) instead of ~0.035m (3.5cm) as a ratio
- Wait, this might be intentional - 0.23m is absolute chest depth, not a ratio
- But spec shows chestDepth as part of segment ratios at 0.035

**Requires Clarification:** The spec is ambiguous about whether chestDepth is:
1. A ratio (0.035 × height) - as shown in Section 6 segment ratios
2. An absolute value (0.23m average) - as implied by bench press formula

---

### 🔴 BUG #9: MOBILITY INTERFACE MISMATCH
**Severity:** LOW - Wrong mobility parameter

**Specification (Section 6):**
```typescript
interface MobilityProfile {
  maxAnkleDorsiflexion: number; // default 30
  maxHipFlexion: number;        // default 130
  maxKneeFlexion: number;       // default 145  ← Spec has this
}
```

**Current Implementation ([types/index.ts:81-85](src/types/index.ts#L81-L85)):**
```typescript
interface MobilityProfile {
  maxAnkleDorsiflexion: number;
  maxHipFlexion: number;
  maxShoulderFlexion: number;  // ❌ Spec says maxKneeFlexion
}
```

**Impact:**
- API contract doesn't match specification
- maxKneeFlexion not tracked (though not currently used)
- maxShoulderFlexion tracked but not used

**Fix Required:**
Replace `maxShoulderFlexion` with `maxKneeFlexion` and update default to 145.

---

## Missing Features

### ❌ MISSING: SPECIFIC Anthropometry Mode
**Specification (Section 3.3):**
Lists three modes:
- SIMPLE (free)
- ADVANCED (paid) - SD modifiers ✓ Implemented
- **SPECIFIC (paid)** - Direct segment measurements ❌ Missing

**Current Implementation ([types/index.ts:13-16](src/types/index.ts#L13-L16)):**
```typescript
export enum AnthropometryMode {
  SIMPLE = "simple",
  ADVANCED = "advanced",
  // SPECIFIC mode missing
}
```

**Impact:**
- Users cannot provide direct segment measurements
- Limits accuracy for users with actual measurements

**Recommendation:**
Add SPECIFIC mode in Phase 2 (post-MVP).

---

### ❌ MISSING: Bench Press Arch as User Input
**Specification (Known Limitations, Section 10 of Corrections):**
> "Bench press arch height is user-input - No formula to estimate from body proportions."

**Current Implementation:**
BenchArchStyle enum exists, but no UI component for user to select it in the UI pages.

**Impact:**
- Limited - arch style can be passed programmatically
- UI just doesn't expose it yet

**Recommendation:**
Add arch style selector to LiftSelector component.

---

## Correct Implementations ✅

### ✅ Kinematic Solver Algorithm
The kinematic solver ([kinematics.ts](src/lib/biomechanics/kinematics.ts)) correctly implements the iterative algorithm from Section 4.1:
- ✓ Iterates from max ankle dorsiflexion down
- ✓ Solves for trunk angle using equilibrium constraint
- ✓ Validates trunk angle is 20-80°
- ✓ Returns fallback when no solution found
- ✓ Calculates all positions and moment arms correctly

**However:** Due to wrong BAR_POSITIONS constants (Bug #2), the actual output will be incorrect.

---

### ✅ Comparison Engine
The comparison engine ([comparison.ts](src/lib/biomechanics/comparison.ts)) correctly:
- ✓ Calculates demand ratios
- ✓ Solves for equivalent loads
- ✓ Generates explanations
- ✓ Handles cross-lift comparisons

**However:** Due to wrong effective mass factors (Bug #1), all comparisons will be incorrect.

---

### ✅ Ape Index Formula
The ape index formula uses the corrected coefficient from v3.1:
```typescript
apeIndex: (2 * totalArm + 0.36 * torso) / height
```
✓ Correct per Correction #2.

---

### ✅ Test Coverage
Comprehensive test suite with 61 passing tests across:
- ✓ Anthropometry (14 tests)
- ✓ Kinematics (17 tests)
- ✓ Comparison (14 tests)
- ✓ Golden tests (16 tests)

**Note:** Tests are passing, but they're testing the *wrong* constants. Once constants are fixed, tests may fail and need tolerance adjustments.

---

## Performance & Constraints

### ✅ Validation Constraints
Implementation correctly validates (per Section 7):
- ✓ Height: 1.4m - 2.2m
- ✓ Mass: 40kg - 200kg
- ✓ Segments sum to height ±5%

### ✅ Kinematic Solver Convergence
- ✓ 2° ankle decrement steps
- ✓ Minimum ankle angle 10°
- ✓ Trunk angle bounds 20-80°
- ✓ Fallback displacement = 0.37 × height

---

## API Contract Mismatches

### TypeScript Schema Differences

| Item | Spec | Implementation | Match? |
|------|------|----------------|--------|
| SEGMENT_RATIOS | Section 3.1 values | Different values | ❌ |
| EFFECTIVE_MASS_FACTORS | Section 2.2 values | Different values | ❌ |
| BAR_POSITIONS | Section 4.1 values | Different values | ❌ |
| MobilityProfile | Has maxKneeFlexion | Has maxShoulderFlexion | ❌ |
| AnthropometryMode | 3 modes (includes SPECIFIC) | 2 modes | ❌ |
| chestDepth | In SegmentLengths | Missing | ❌ |
| All other interfaces | Correct | Correct | ✅ |

---

## Recommended Fix Priority

### Priority 1 (CRITICAL - Fix Before Any Use)
1. **Fix EFFECTIVE_MASS_FACTORS** (Bug #1)
2. **Fix BAR_POSITIONS** (Bug #2)
3. **Fix SEGMENT_RATIOS** (Bugs #3 & #4)

### Priority 2 (HIGH - Fix Before Production)
4. **Fix bench press arm length** (Bug #5)
5. **Clarify chestDepth usage** (Bug #8)

### Priority 3 (MEDIUM - Fix Soon)
6. **Fix DEFAULT_MOBILITY** (Bug #6)
7. **Fix MobilityProfile interface** (Bug #9)

### Priority 4 (LOW - Can Defer)
8. **Fix pushup female factor** (Bug #7)
9. **Add SPECIFIC mode** (Missing Feature)

---

## Test Impact After Fixes

Once constants are corrected, expect the following test impacts:

### Will Likely FAIL (need tolerance adjustment):
- Golden test: 170cm vs 190cm work difference
- Golden test: Long femur demand increase
- Golden test: Sumo vs conventional work difference
- Squat work per rep test (values will be ~19% lower)

### Should Still PASS:
- Identity tests (ratio = 1.0)
- Kinematic solver tests (algorithm correct, just different constants)
- Anthropometry tests (structure correct)

---

## Summary

**Total Issues Found:** 9 critical bugs + 2 missing features

**Risk Assessment:** 🔴 **CRITICAL** - Application will produce completely incorrect results due to wrong constants

**Recommendation:**
1. **STOP all production use immediately**
2. Fix Priority 1 bugs (effective mass, bar positions, segment ratios)
3. Re-run all tests and adjust tolerances
4. Validate against golden tests from specification
5. Consider adding integration tests that check actual constant values

**Estimated Fix Time:**
- Priority 1 fixes: 30 minutes (constant updates)
- Test adjustments: 1-2 hours
- Validation: 1 hour
- **Total: ~3-4 hours to restore correctness**

---

*End of Audit Report*
