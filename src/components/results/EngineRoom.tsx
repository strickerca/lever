import { UnifiedMovementAnimation } from "@/components/visualization/UnifiedMovementAnimation";
import { ComparisonResult, LiftData, LiftFamily } from "@/types";
import { ComparisonInputs } from "@/hooks/useLiveComparison";
import { MovementOptions } from "@/lib/animation/types";

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
    const mapToOptions = (data: ComparisonInputs["liftDataA"]): MovementOptions => {
        const [benchGripRaw, benchArchRaw] = data.variant.split("-");

        return {
            load: data.load,
            squatVariant: data.liftFamily === LiftFamily.SQUAT ? (data.variant as MovementOptions["squatVariant"]) : undefined,
            squatStance: data.liftFamily === LiftFamily.SQUAT ? (data.stance as MovementOptions["squatStance"]) : undefined,
            squatDepth:
                data.liftFamily === LiftFamily.SQUAT
                    ? (data.squatDepth as MovementOptions["squatDepth"])
                    : undefined,
            deadliftVariant: data.liftFamily === LiftFamily.DEADLIFT ? (data.variant as MovementOptions["deadliftVariant"]) : undefined,
            sumoStance: data.liftFamily === LiftFamily.DEADLIFT ? (data.stance as MovementOptions["sumoStance"]) : undefined,
            deadliftBarOffset: data.liftFamily === LiftFamily.DEADLIFT ? data.barStartHeightOffset : undefined,
            benchGrip: data.liftFamily === LiftFamily.BENCH ? (benchGripRaw as MovementOptions["benchGrip"]) : undefined,
            benchArch: data.liftFamily === LiftFamily.BENCH ? (benchArchRaw as MovementOptions["benchArch"]) : undefined,
            pullupGrip: data.liftFamily === LiftFamily.PULLUP ? (data.variant as MovementOptions["pullupGrip"]) : undefined,
            pushupWidth:
                data.liftFamily === LiftFamily.PUSHUP
                    ? ((data.variant === "standard" ? "normal" : data.variant) as MovementOptions["pushupWidth"])
                    : undefined,
            pushupWeight: data.liftFamily === LiftFamily.PUSHUP ? data.pushupWeight : undefined,
            chestSize:
                data.liftFamily === LiftFamily.BENCH || data.liftFamily === LiftFamily.PUSHUP
                    ? (data.chestSize as MovementOptions["chestSize"])
                    : undefined,
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
                        optionsA={mapToOptions(inputs.liftDataA)}
                        optionsB={mapToOptions(inputs.liftDataB)}
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
