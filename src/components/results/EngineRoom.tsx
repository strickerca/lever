import { useState } from "react";
import { UnifiedMovementAnimation } from "@/components/visualization/UnifiedMovementAnimation";
import { ComparisonResult, LiftData, LiftFamily } from "@/types";
import { ComparisonInputs } from "@/hooks/useLiveComparison";
import { Flame, Gauge } from "lucide-react";

interface EngineRoomProps {
    result: ComparisonResult;
    inputs: ComparisonInputs;
    onLiftDataChangeA?: (data: LiftData) => void;
    onLiftDataChangeB?: (data: LiftData) => void;
    onLiftFamilyChange?: (family: LiftFamily) => void;
}

export function EngineRoom({ result, inputs, onLiftDataChangeA, onLiftDataChangeB, onLiftFamilyChange }: EngineRoomProps) {
    const { lifterA, lifterB } = result;

    // Helper to map generic lift data to specific MovementOptions
    const mapToOptions = (data: any /* LiftData */, family: string) => {
        return {
            load: data.load,
            reps: data.reps,
            squatVariant: family === 'squat' ? data.variant : undefined,
            squatStance: family === 'squat' ? data.stance : undefined,
            squatDepth: family === 'squat' ? data.squatDepth : undefined,
            deadliftVariant: family === 'deadlift' ? data.variant : undefined,
            sumoStance: family === 'deadlift' ? data.stance : undefined,
            deadliftBarOffset: family === 'deadlift' ? data.barStartHeightOffset : undefined,
            benchGrip: family === 'bench' ? data.variant.split("-")[0] : undefined,
            benchArch: family === 'bench' ? data.variant.split("-")[1] : undefined,
            pullupGrip: family === 'pullup' ? data.variant : undefined,
            pushupWidth: family === 'pushup' ? (data.variant === "standard" ? "normal" : data.variant) : undefined,
            pushupWeight: family === 'pushup' ? data.pushupWeight : undefined,
            chestSize: (family === 'bench' || family === 'pushup') ? data.chestSize : undefined,
        };
    };

    return (
        <div className="w-full mb-8">
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative">


                <div className="p-4">
                    <UnifiedMovementAnimation
                        lifterA={{ name: lifterA.name, anthropometry: lifterA.anthropometry }}
                        lifterB={{ name: lifterB.name, anthropometry: lifterB.anthropometry }}
                        movement={inputs.liftDataA.liftFamily}
                        optionsA={mapToOptions(inputs.liftDataA, inputs.liftDataA.liftFamily) as any}
                        optionsB={mapToOptions(inputs.liftDataB, inputs.liftDataB.liftFamily) as any}
                        repsA={inputs.liftDataA.reps}
                        repsB={inputs.liftDataB.reps}
                        metricsA={lifterA.metrics}
                        metricsB={lifterB.metrics}
                        initialTime={4}
                        externalVelocityA={undefined}
                        externalVelocityB={undefined}
                        hideControls={false}
                        liftDataA={inputs.liftDataA as LiftData}
                        liftDataB={inputs.liftDataB as LiftData}
                        onLiftDataChangeA={onLiftDataChangeA}
                        onLiftDataChangeB={onLiftDataChangeB}
                        onLiftFamilyChange={onLiftFamilyChange}
                        result={result}
                    />
                </div>
            </div>
        </div>
    );
}
