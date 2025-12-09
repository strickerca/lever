# LEVER: Biomechanical Lift Comparison Engine
## Master Implementation Specification v3.0

**Status:** Final Production Specification  
**Version:** 3.0  
**Date:** December 8, 2025  
**Purpose:** Complete specification for Claude Code implementation

---

# Document Overview

This specification provides everything needed to implement LEVER—a biomechanical comparison engine that normalizes strength performance between lifters with different anthropometric proportions. This document has been consolidated from multiple synthesis attempts and validated against peer-reviewed biomechanical research.

**Design Philosophy:** Physics accuracy over simplicity. Completeness over brevity.

**Technology Stack:**
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Visualization:** React + Canvas/SVG for stick figures
- **Deployment:** Vercel

---

# 1. Executive Summary

## 1.1 The Problem LEVER Solves

A 150kg squat by a 170cm lifter and a 150kg squat by a 200cm lifter are **not equivalent physical events.**

The taller lifter:
- Moves the bar through ~33% greater vertical displacement
- Performs significantly more mechanical work (Joules)
- May face different moment arm challenges depending on femur:torso ratio

A lifter with long femurs relative to their torso **must** lean forward more in a squat to maintain balance. This isn't a technique choice; it's physics (equilibrium constraint).

## 1.2 Key Insight: The Equilibrium Constraint

For a lifter to remain balanced during a squat or deadlift, the combined center of mass (body + barbell) must remain over the base of support (midfoot). This creates a geometric constraint that **determines** trunk angle from anthropometry—it's not a free parameter.

## 1.3 Core Outputs

| Metric | Description | Unit |
|--------|-------------|------|
| Work per Rep | Mechanical work for single repetition | Joules (J) |
| Total Work | Work × Reps | Joules (J) |
| P4P Score | Work normalized by body mass^0.67 | J/kg^0.67 |
| Equivalent Load | Load Lifter B needs to match Lifter A | kg |
| Equivalent Reps | Reps Lifter B needs at same load | integer |
| Demand Factor | Combined moment arm × √displacement | dimensionless |

## 1.4 Supported Lifts

| Category | Lifts |
|----------|-------|
| **Squat** | High Bar, Low Bar, Front Squat |
| **Deadlift** | Conventional, Sumo |
| **Press** | Overhead Press, Bench Press |
| **Bodyweight** | Pull-up, Chin-up, Push-up |
| **Compound** | Thruster |

---

# 2. Core Physics Framework

## 2.1 Fundamental Equations

### Mechanical Work
```
W = g × ΔY × M_eff

Where:
- g = 9.81 m/s²
- ΔY = Vertical displacement (meters)
- M_eff = Effective mass (kg)
```

### Allometric Normalization (P4P Score)
```
Score_P4P = W_total / (M_body^0.67)
```

Validated by powerlifting data (Vanderburgh & Batterham, 1999).

## 2.2 Effective Mass Factors

| Movement | Formula | Source |
|----------|---------|--------|
| **Squat** | `M_bar + 0.80 × M_body` | de Leva (1996) |
| **Deadlift** | `M_bar + 0.60 × M_body` | Partial COM rise |
| **Bench Press** | `M_bar` | Body supported |
| **Pull-up** | `M_body + M_added` | Full body lifts |
| **Push-up** | `0.72 × M_body` | Ebben et al. (2011) |

### Squat Effective Mass Derivation

| Segment | Mass % | COM Travel | Contribution |
|---------|--------|------------|--------------|
| HAT | 67.8% | 100% | 67.8% |
| Thighs | 20.0% | ~56% | 11.2% |
| Shanks | 9.3% | ~10% | 0.9% |
| **Total** | — | — | **79.9% ≈ 80%** |

## 2.3 The Equilibrium Constraint

### Constraint Equation (Squat)
```
L_tibia × sin(α) + L_femur × cos(θ_f) - L_torso × sin(θ_t) + x_bar_offset = 0
```

**Solving for trunk angle:**
```
θ_t = arcsin((L_tibia × sin(α) + L_femur × cos(θ_f) + x_bar_offset) / L_torso)
```

### Implications
- Long femurs → More forward lean → Larger hip moment arm → Harder squat
- Long torso → More upright → Smaller hip moment arm → Easier squat

## 2.4 The Demand Factor

```
D = d_hip × √(ΔY)
```

### Equivalent Load Calculation
```
Load_B = Load_A × (D_A / D_B)
```

If D_A > D_B, Lifter A has more demand, so Lifter B needs more weight.

---

# 3. Anthropometric Data Model

## 3.1 Segment Length Ratios (Winter, 2009)

**Note:** These ratios are population averages from anthropometric studies. They sum to approximately 0.948, not 1.0. The `normalizeToHeight()` function scales segments proportionally to match actual height.

| Segment | Ratio (× Height) | SD |
|---------|------------------|-----|
| Femur | 0.245 | ±0.015 |
| Tibia | 0.246 | ±0.012 |
| Foot Height | 0.039 | ±0.004 |
| Torso | 0.288 | ±0.015 |
| Upper Arm | 0.186 | ±0.010 |
| Forearm | 0.146 | ±0.008 |
| Hand | 0.108 | ±0.006 |
| Head + Neck | 0.130 | ±0.008 |

**Vertical segments sum:** 0.948 (femur + tibia + footHeight + torso + headNeck)

## 3.2 Mass Fractions (de Leva, 1996)

Sex differences in mass distribution are from de Leva's adjustments to Zatsiorsky-Seluyanov's parameters.

| Segment | Male (%) | Female (%) |
|---------|----------|------------|
| Hand | 0.60 | 0.56 |
| Forearm | 1.60 | 1.38 |
| Upper Arm | 2.80 | 2.55 |
| Shank | 4.65 | 4.81 |
| Thigh | 10.00 | 11.16 |
| Trunk | 43.46 | 42.57 |
| HAT Combined | 67.80 | 66.00 |

**Note:** Female segment length ratios also differ slightly (see constants in Section 6).

## 3.3 Input Modes

### Simple Mode (Free)
- Input: Height, Weight, Sex
- Process: Apply standard ratios
- Accuracy: ±10-15%

### Advanced Mode (Paid) - SD Categories
| SD | Arms | Legs | Torso |
|----|------|------|-------|
| +3 | "Knuckle Dragger" | "Stilts" | "Long-Waisted" |
| +2 | "Long" | "Lengthy" | "Tall Torso" |
| +1 | "Above Average" | "Above Average" | "Above Average" |
| 0 | "Average" | "Average" | "Average" |
| -1 | "Below Average" | "Below Average" | "Below Average" |
| -2 | "Short" | "Compact" | "Short-Waisted" |
| -3 | "T-Rex" | "Low Rider" | "Stubby" |

**SD Multiplier:** `1 + (SD × 0.045)`

### Specific Mode (Paid)
Direct measurements with validation that segments sum to height (±5%).

---

# 4. Movement-Specific Models

## 4.1 Squat Kinematic Solver

### Bar Position Offsets (cm from shoulder)
| Variant | Vertical | Horizontal |
|---------|----------|------------|
| High Bar | +5 | -5 |
| Low Bar | -5 | -12 |
| Front Squat | +8 | +8 |

### Solver Algorithm (CRITICAL)

```typescript
function solveSquatKinematics(anthropometry, liftConfig) {
  const L_tibia = anthropometry.segments.tibia;
  const L_femur = anthropometry.segments.femur;
  const L_torso = anthropometry.segments.torso;
  const barOffset = BAR_POSITIONS[liftConfig.variant];
  
  // Femur angle at parallel depth
  let θ_femur = 0; // degrees from horizontal
  
  // Iterate from max ankle dorsiflexion down
  let α = anthropometry.mobility.maxAnkleDorsiflexion;
  let solution = null;
  
  while (α >= 10 && !solution) {
    const α_rad = α * Math.PI / 180;
    const θ_femur_rad = θ_femur * Math.PI / 180;
    
    // Joint positions (origin at ankle/midfoot)
    const knee = {
      x: L_tibia * Math.sin(α_rad),
      y: L_tibia * Math.cos(α_rad)
    };
    
    const hip = {
      x: knee.x - L_femur * Math.cos(θ_femur_rad),
      y: knee.y + L_femur * Math.sin(θ_femur_rad)
    };
    
    // Solve for trunk angle (bar over midfoot, x = 0)
    const target_x = -hip.x - barOffset.horizontal / 100;
    const sin_trunk = target_x / L_torso;
    
    if (Math.abs(sin_trunk) <= 1) {
      const θ_trunk_deg = Math.asin(sin_trunk) * 180 / Math.PI;
      
      if (θ_trunk_deg >= 20 && θ_trunk_deg <= 80) {
        // Valid solution found
        const θ_trunk_rad = θ_trunk_deg * Math.PI / 180;
        
        const shoulder = {
          x: hip.x + L_torso * Math.sin(θ_trunk_rad),
          y: hip.y + L_torso * Math.cos(θ_trunk_rad)
        };
        
        const bar = {
          x: shoulder.x + barOffset.horizontal / 100,
          y: shoulder.y + barOffset.vertical / 100
        };
        
        const momentArms = {
          hip: Math.abs(bar.x - hip.x),
          knee: Math.abs(bar.x - knee.x)
        };
        
        const hipHeight = anthropometry.derived.hipHeight;
        const Y_stand = hipHeight + L_torso + barOffset.vertical / 100;
        const displacement = Y_stand - bar.y;
        
        solution = {
          positions: { ankle: {x:0,y:0}, knee, hip, shoulder, bar },
          angles: { shank: α, thigh: θ_femur, trunk: θ_trunk_deg },
          momentArms,
          displacement,
          valid: true,
          mobilityLimited: α < anthropometry.mobility.maxAnkleDorsiflexion
        };
      }
    }
    α -= 2;
  }
  
  // Fallback if no solution
  if (!solution) {
    solution = {
      displacement: 0.37 * anthropometry.height,
      valid: false,
      mobilityLimited: true,
      warnings: ["Using approximation - could not solve kinematics"]
    };
  }
  
  return solution;
}
```

## 4.2 Deadlift

### Conventional Displacement
```typescript
function calculateConventionalDeadliftDisplacement(anthropometry) {
  const H_acromion = anthropometry.derived.acromionHeight;
  const L_arm = anthropometry.derived.totalArm;
  const Y_lockout = H_acromion - L_arm;
  const Y_start = 0.225; // Standard plate radius (m)
  return Math.max(Y_lockout - Y_start, 0.1);
}
```

**Note:** This assumes arms hang vertically at lockout. In reality, arms angle slightly back (~5°), which could add 2-3cm to actual ROM. This is a minor approximation.

### Sumo Adjustment
Research (Escamilla et al., 2000): ~20-25% less vertical displacement
```
SUMO_DISPLACEMENT_FACTOR = 0.85
SUMO_WORK_FACTOR = 0.80
```

The work factor is lower than displacement factor because sumo also provides better leverage (more vertical torso).

## 4.3 Bench Press

### Displacement Formula
```
ΔY = L_press × cos(θ_grip) - D_chest - D_arch
```

Where `L_press = upperArm + forearm` (hand grip doesn't add to vertical distance).

**Note:** The grip angle affects how much of the arm length contributes to vertical displacement. Wider grip = more horizontal arm = less vertical distance.

| Grip | Angle | cos(θ) |
|------|-------|--------|
| Narrow | 5° | 0.996 |
| Medium | 15° | 0.966 |
| Wide | 25° | 0.906 |

| Arch Style | Height (m) |
|------------|------------|
| Flat | 0.02 |
| Moderate | 0.05 |
| Competitive | 0.08 |
| Extreme | 0.12 |

Minimum displacement clamped to 0.05m to prevent unrealistic values.

## 4.4 Pull-up/Chin-up

### Grip Factors
| Grip | G_f |
|------|-----|
| Supinated (Chin-up) | 1.00 |
| Neutral | 1.08 |
| Pronated (Pull-up) | 1.15 |

### Vertical Pulling Index (VPI)
```
VPI = (M_body + M_added) × G_f / M_body^0.67
```

Where G_f is the grip difficulty factor (pronated is harder than supinated).

## 4.5 Push-up

GRF analysis (Ebben et al., 2011):
- Top: 69% body weight at hands
- Bottom: 75% body weight at hands
- Average: **72%**

## 4.6 Overhead Press (OHP)

### Displacement
```
ΔY = (upperArm + forearm) × 0.95
```
The 0.95 factor accounts for slight elbow flexion at lockout.

### Work
```
M_eff = M_bar  (body is supported)
W = g × ΔY × M_eff
```

## 4.7 Thruster

A thruster combines a front squat with an overhead press in one continuous movement.

### Displacement
```
ΔY = ΔY_frontSquat + ΔY_OHP
```

### Effective Mass
Since the bar travels the full combined distance:
```
M_eff = M_bar + 0.80 × M_body × (ΔY_squat / ΔY_total) + M_bar × (ΔY_OHP / ΔY_total)
```

Simplified approximation:
```
M_eff ≈ M_bar + 0.50 × M_body
```

This accounts for body mass contributing only during the squat portion.

---

# 5. Comparison Engine

## 5.1 Comparison Pipeline

```typescript
function compareLifts(lifterA, lifterB, configA, configB, performanceA) {
  // 1. Compute metrics for Lifter A
  const metricsA = computeLiftMetrics(lifterA.anthropometry, configA, performanceA);
  
  // 2. Compute kinematics for Lifter B
  const kinematicsB = computeKinematics(lifterB.anthropometry, configB);
  
  // 3. Calculate demand factors
  const demandA = metricsA.demandFactor;
  const demandB = kinematicsB.momentArms.hip * Math.sqrt(kinematicsB.displacement);
  
  // 4. Solve for equivalent load
  const equivalentLoad = performanceA.load * (demandA / demandB);
  
  // 5. Compute comparison
  return {
    lifterA: { metrics: metricsA },
    lifterB: { equivalentLoad: Math.round(equivalentLoad * 2) / 2 },
    comparison: {
      demandRatio: demandA / demandB,
      advantagedLifter: demandA > demandB ? "B" : "A",
      advantagePercent: Math.abs(1 - demandA / demandB) * 100
    }
  };
}
```

---

# 6. TypeScript Schema

```typescript
// CONSTANTS
const GRAVITY = 9.81;

const SEGMENT_RATIOS = {
  male: {
    femur: 0.245, tibia: 0.246, footHeight: 0.039,
    torso: 0.288, upperArm: 0.186, forearm: 0.146,
    hand: 0.108, headNeck: 0.130, chestDepth: 0.035
  },
  female: {
    femur: 0.245, tibia: 0.246, footHeight: 0.039,
    torso: 0.285, upperArm: 0.183, forearm: 0.143,
    hand: 0.106, headNeck: 0.130, chestDepth: 0.033
  }
};

const EFFECTIVE_MASS_FACTORS = {
  squat: { male: 0.80, female: 0.812 },
  deadlift: { male: 0.60, female: 0.608 },
  pullup: { male: 1.0, female: 1.0 },
  pushup: { male: 0.72, female: 0.71 }
};

const GRIP_FACTORS = {
  supinated: 1.00,
  neutral: 1.08,
  pronated: 1.15
};

// ENUMERATIONS
enum Sex { MALE = "male", FEMALE = "female" }
enum AnthropometryMode { SIMPLE = "simple", ADVANCED = "advanced", SPECIFIC = "specific" }
enum LiftFamily { SQUAT = "squat", DEADLIFT = "deadlift", BENCH = "bench", OHP = "ohp", PULLUP = "pullup", PUSHUP = "pushup", THRUSTER = "thruster" }

// INTERFACES
interface Point2D { x: number; y: number; }

interface SegmentLengths {
  femur: number; tibia: number; footHeight: number;
  torso: number; upperArm: number; forearm: number;
  hand: number; headNeck: number; chestDepth: number;
}

interface DerivedAnthropometry {
  totalArm: number;       // upperArm + forearm + hand
  totalLeg: number;       // femur + tibia + footHeight
  cruralIndex: number;    // tibia / femur
  femurTorsoRatio: number; // femur / torso
  apeIndex: number;       // armSpan / height (1.0 = average)
  acromionHeight: number; // shoulder height when standing
  hipHeight: number;      // hip height when standing
}

interface MobilityProfile {
  maxAnkleDorsiflexion: number; // default 30
  maxHipFlexion: number;        // default 130
  maxKneeFlexion: number;       // default 145
}

interface Anthropometry {
  height: number; mass: number; sex: Sex;
  segments: SegmentLengths;
  derived: DerivedAnthropometry;
  mobility: MobilityProfile;
}

interface KinematicSolution {
  positions: { ankle: Point2D; knee: Point2D; hip: Point2D; shoulder: Point2D; bar: Point2D; };
  angles: { shank: number; thigh: number; trunk: number; };
  momentArms: { hip: number; knee: number; };
  displacement: number;
  valid: boolean;
  mobilityLimited: boolean;
}

interface LiftMetrics {
  displacement: number; effectiveMass: number;
  workPerRep: number; totalWork: number;
  scoreP4P: number; demandFactor: number;
}

interface ComparisonResult {
  lifterA: { metrics: LiftMetrics; kinematics?: KinematicSolution; };
  lifterB: { equivalentLoad: number; equivalentReps: number; };
  comparison: { demandRatio: number; advantagedLifter: string; advantagePercent: number; };
}
```

---

# 7. Configuration (biomechanics_config.json)

```json
{
  "version": "3.0",
  "gravity": 9.81,
  "segmentRatios": {
    "male": { "femur": 0.245, "tibia": 0.246, "torso": 0.288, "upperArm": 0.186, "forearm": 0.146, "hand": 0.108 },
    "female": { "femur": 0.245, "tibia": 0.246, "torso": 0.285, "upperArm": 0.183, "forearm": 0.143, "hand": 0.106 }
  },
  "effectiveMassFactors": {
    "squat": { "male": 0.80, "female": 0.812 },
    "deadlift": { "male": 0.60, "female": 0.608 },
    "pushup": { "male": 0.72, "female": 0.71 }
  },
  "barPositions": {
    "highBar": { "vertical": 5, "horizontal": -5 },
    "lowBar": { "vertical": -5, "horizontal": -12 },
    "front": { "vertical": 8, "horizontal": 8 }
  },
  "archHeights": { "flat": 0.02, "moderate": 0.05, "competitive": 0.08, "extreme": 0.12 },
  "gripFactors": { "supinated": 1.00, "neutral": 1.08, "pronated": 1.15 },
  "sumoFactors": { "displacement": 0.85, "work": 0.80 },
  "defaultMobility": { "maxAnkleDorsiflexion": 30, "maxHipFlexion": 130 },
  "allometricExponent": 0.67,
  "sdMultiplierPerUnit": 0.045,
  "validation": { "minHeight": 1.40, "maxHeight": 2.20, "minMass": 40, "maxMass": 200 }
}
```

---

# 8. Validation & Testing

## 8.1 Identity Test
Same lifter vs self → Ratio = 1.0, Equivalent Load = Original Load

## 8.2 Long Femur Test
Lifter with high femur:torso ratio should have:
- More forward lean (lower trunk angle)
- Larger hip moment arm
- Higher demand factor

## 8.3 Ape Index Test
Lifter with long arms should have:
- Less deadlift ROM
- Lower work output at same load

## 8.4 Mobility Failure Test
Zero ankle dorsiflexion → mobilityLimited = true

## 8.5 Golden Tests

| Scenario | Expected |
|----------|----------|
| 170cm vs 190cm | Taller does ~18% more work |
| Long femur squat | ~12% higher demand |
| Long arm deadlift | ~5% less ROM |
| Sumo vs Conv | Sumo ~15-20% less work |

---

# 9. Implementation Guide for Claude Code

## 9.1 Project Structure

```
lever/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Landing
│   │   ├── compare/quick/page.tsx
│   │   └── compare/detailed/page.tsx
│   ├── components/
│   │   ├── anthropometry/        # Input components
│   │   ├── comparison/           # Results display
│   │   └── visualization/        # Stick figure
│   ├── lib/biomechanics/
│   │   ├── constants.ts
│   │   ├── anthropometry.ts
│   │   ├── kinematics.ts
│   │   ├── physics.ts
│   │   └── comparison.ts
│   └── types/index.ts
└── tests/
```

## 9.2 Implementation Phases

### Phase 1: Core Types (Day 1)
Create TypeScript interfaces and constants from Section 6-7.

### Phase 2: Anthropometry Service (Day 1-2)
- createSimpleProfile(height, mass, sex)
- createAdvancedProfile(height, mass, sex, sdModifiers)
- normalizeToHeight(segments, targetHeight)

### Phase 3: Kinematic Solver (Day 2-3) - CRITICAL
Implement the iterative solver from Section 4.1. Test extensively.

### Phase 4: Physics Engine (Day 3-4)
All displacement and work calculations from Section 4.

### Phase 5: Comparison Engine (Day 4-5)
Full pipeline from Section 5.

### Phase 6: UI Components (Day 5-7)
React components with Tailwind CSS.

### Phase 7: Stick Figure Visualization (Day 7-8)
Canvas-based renderer using solved kinematics.

### Phase 8: Testing (Day 8-9)
Unit tests and golden tests from Section 8.

---

# 10. Quick Reference

## Formulas
```
Work:           W = 9.81 × ΔY × M_eff
P4P Score:      W_total / M_body^0.67
Demand:         D = d_hip × √(ΔY)
Equivalent:     Load_B = Load_A × (D_A / D_B)
SD Multiplier:  1 + (SD × 0.045)
```

## Effective Mass
```
Squat:    Load + 0.80 × Bodyweight
Deadlift: Load + 0.60 × Bodyweight
Bench:    Load
Pull-up:  Bodyweight + Added
Push-up:  0.72 × Bodyweight
```

---

# References

1. de Leva, P. (1996). J Biomech, 29(9), 1223-1230. [Mass fractions]
2. Winter, D.A. (2009). Biomechanics and Motor Control. [Segment ratios]
3. Escamilla, R.F., et al. (2000). Med Sci Sports Exerc, 32(7). [Sumo vs conventional]
4. Vanderburgh & Batterham (1999). Med Sci Sports Exerc, 31(12). [Allometric exponent]
5. Ebben, W.P., et al. (2011). J Strength Cond Res, 25(10). [Push-up GRF]

---

*End of Specification v3.0*
