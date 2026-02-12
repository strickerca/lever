# Bench Press Animation Fix Walkthrough

## Overview
The Bench Press animation has been transformed to a **Behind View** and refined to match specific biomechanical and aesthetic requests.

## Changes Implemented

### 1. Frontal Plane Mechanics (`BenchPoseSolver.ts`)
*   **Vertical Forearms**: The animation now strictly enforces **Vertical Forearms** (`Elbow X == Base Wrist X`).
    *   This models the "Behind View" perspective where the forearm remains in the vertical frontal plane, while the Humerus (Upper Arm) foreshortens as it rotates in the transverse plane.
*   **Wide Leg Position**:
    *   **Stance**: Feet are wide (`+/- 0.45m` from center) and planted on the floor.
    *   **Knees**: Flared out (`+/- 0.35m`), mimicking a stable powerlifting/frog stance.

### 2. Visualization (`UnifiedMovementAnimation.tsx`)
*   **Chest (Ribcage)**: Added a representational **Chest Barrel**.
    *   Drawn as a filled arc appearing between the shoulders.
    *   Provides a visual target for the bar to "touch" at the bottom of the rep.
*   **Bilateral Rendering**: Both arms and legs are drawn symmetrically.
*   **Symmetry**: Head is centered, Shoulders are level.

### 3. Layout Optimization
*   **Comparison Spacing**: Lifters are spaced at 25% and 75% of screen width to prevent overlap.

## Verification
*   **Forearms**: They should remain perfectly vertical lines throughout the movement.
*   **Legs**: Wide, stable base.
*   **Chest**: Distinct rounded shape between shoulders.
*   **Motion**: Bar touches the top of the "Chest" visual at the bottom of the rep.
