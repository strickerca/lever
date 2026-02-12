import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { compareLifts } from "@/lib/biomechanics/comparison";
import { createProfileFromProportions, createProfileFromSegments } from "@/lib/biomechanics/anthropometry";
import { ComparisonResult, LiftFamily, Sex } from "@/types";
import { validateLifterInputs, validateLiftInputs, getErrorMessage } from "@/lib/validation";
import { TORSO_LEG_TO_SD, ARM_PROPORTION_TO_SD } from "@/lib/archetypes";
import { TorsoLegProportion, ArmProportion } from "@/components/anthropometry/BuildInput";

export interface ComparisonInputs {
    lifterA: {
        height: number;
        weight: number;
        sex: Sex;
        name: string;
        torsoLegRatio: TorsoLegProportion;
        armLength: ArmProportion;
        customSegments?: {
            enabled: boolean;
            segments: {
                torso: number;
                upperArm: number;
                forearm: number;
                femur: number;
                tibia: number;
            };
        };
    };
    lifterB: {
        height: number;
        weight: number;
        sex: Sex;
        name: string;
        torsoLegRatio: TorsoLegProportion;
        armLength: ArmProportion;
        customSegments?: {
            enabled: boolean;
            segments: {
                torso: number;
                upperArm: number;
                forearm: number;
                femur: number;
                tibia: number;
            };
        };
    };
    liftDataA: {
        liftFamily: LiftFamily;
        variant: string;
        load: number;
        reps: number;
        stance?: string;
        pushupWeight?: number;
        barStartHeightOffset?: number;
        chestSize?: string;
        squatDepth?: string;
    };
    liftDataB: {
        liftFamily: LiftFamily; // Should match A, typically
        variant: string;
        load: number;
        reps: number;
        stance?: string;
        pushupWeight?: number;
        barStartHeightOffset?: number;
        chestSize?: string;
        squatDepth?: string;
    };
}

export function useLiveComparison(inputs: ComparisonInputs) {
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Debounce the entire inputs object
    const [debouncedInputs] = useDebounce(inputs, 500);

    useEffect(() => {
        async function calculate() {
            setIsCalculating(true);
            setError(null);
            setValidationErrors([]);

            try {
                const { lifterA, lifterB, liftDataA, liftDataB } = debouncedInputs;

                // 1. Validation
                const lifterAValidation = validateLifterInputs(lifterA.height, lifterA.weight, lifterA.sex);
                const lifterBValidation = validateLifterInputs(lifterB.height, lifterB.weight, lifterB.sex);
                const liftValidationA = validateLiftInputs(liftDataA.load, liftDataA.reps, liftDataA.liftFamily !== LiftFamily.PUSHUP);
                const liftValidationB = validateLiftInputs(liftDataB.load, liftDataB.reps, liftDataB.liftFamily !== LiftFamily.PUSHUP);

                const errors = [
                    ...lifterAValidation.errors,
                    ...lifterBValidation.errors,
                    ...liftValidationA.errors,
                    ...liftValidationB.errors,
                ];

                if (errors.length > 0) {
                    setValidationErrors(errors.map((e) => e.message));
                    setIsCalculating(false);
                    return; // Stop if invalid
                }

                // 2. Profile Creation
                let anthroA;
                if (lifterA.customSegments?.enabled) {
                    anthroA = createProfileFromSegments(
                        lifterA.height,
                        lifterA.weight,
                        lifterA.sex,
                        lifterA.customSegments.segments
                    );
                } else {
                    anthroA = createProfileFromProportions(
                        lifterA.height,
                        lifterA.weight,
                        lifterA.sex,
                        TORSO_LEG_TO_SD[lifterA.torsoLegRatio].torso,
                        ARM_PROPORTION_TO_SD[lifterA.armLength],
                        TORSO_LEG_TO_SD[lifterA.torsoLegRatio].legs
                    );
                }

                let anthroB;
                if (lifterB.customSegments?.enabled) {
                    anthroB = createProfileFromSegments(
                        lifterB.height,
                        lifterB.weight,
                        lifterB.sex,
                        lifterB.customSegments.segments
                    );
                } else {
                    anthroB = createProfileFromProportions(
                        lifterB.height,
                        lifterB.weight,
                        lifterB.sex,
                        TORSO_LEG_TO_SD[lifterB.torsoLegRatio].torso,
                        ARM_PROPORTION_TO_SD[lifterB.armLength],
                        TORSO_LEG_TO_SD[lifterB.torsoLegRatio].legs
                    );
                }

                // 3. Comparison Logic
                // Simulate async if needed, or just run sync (compareLifts is sync)

                // Use setTimeout to allow UI to show loading state if calculation is heavy, 
                // though strictly sync is fine for this math. 
                // We'll wrap in a Promise to consistent with async pattern if we move to worker later.

                const comparisonResult = compareLifts(
                    { anthropometry: anthroA, name: lifterA.name },
                    { anthropometry: anthroB, name: lifterB.name },
                    liftDataA.liftFamily,
                    liftDataA.variant,
                    liftDataB.variant,
                    { load: liftDataA.load, reps: liftDataA.reps },
                    { load: liftDataB.load, reps: liftDataB.reps },
                    liftDataA.stance,
                    liftDataB.stance,
                    liftDataA.pushupWeight,
                    liftDataB.pushupWeight,
                    liftDataA.barStartHeightOffset,
                    liftDataB.barStartHeightOffset,
                    liftDataA.squatDepth,
                    liftDataB.squatDepth
                );

                setResult(comparisonResult);

            } catch (err: any) {
                console.error("Comparison calculation error:", err);
                setError(err.message || "An unexpected error occurred during calculation.");
            } finally {
                setIsCalculating(false);
            }
        }

        calculate();
    }, [debouncedInputs]);

    return { result, isCalculating, error, validationErrors };
}
