import { Sex } from "@/types";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateHeight(height: number): ValidationError | null {
  if (isNaN(height) || height <= 0) {
    return { field: "height", message: "Height must be a positive number" };
  }
  if (height < 1.4) {
    return { field: "height", message: "Height must be at least 1.4m (4'7\")" };
  }
  if (height > 2.2) {
    return { field: "height", message: "Height must be at most 2.2m (7'3\")" };
  }
  return null;
}

export function validateWeight(weight: number): ValidationError | null {
  if (isNaN(weight) || weight <= 0) {
    return { field: "weight", message: "Weight must be a positive number" };
  }
  if (weight < 40) {
    return { field: "weight", message: "Weight must be at least 40kg (88 lbs)" };
  }
  if (weight > 200) {
    return { field: "weight", message: "Weight must be at most 200kg (440 lbs)" };
  }
  return null;
}

export function validateLoad(load: number): ValidationError | null {
  if (isNaN(load) || load < 0) {
    return { field: "load", message: "Load must be a non-negative number" };
  }
  if (load > 500) {
    return { field: "load", message: "Load must be at most 500kg (1100 lbs)" };
  }
  return null;
}

export function validateReps(reps: number): ValidationError | null {
  if (isNaN(reps) || reps < 1) {
    return { field: "reps", message: "Reps must be at least 1" };
  }
  if (reps > 100) {
    return { field: "reps", message: "Reps must be at most 100" };
  }
  return null;
}

export function validateLifterInputs(
  height: number,
  weight: number,
  sex: Sex
): ValidationResult {
  const errors: ValidationError[] = [];

  const heightError = validateHeight(height);
  if (heightError) errors.push(heightError);

  const weightError = validateWeight(weight);
  if (weightError) errors.push(weightError);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateLiftInputs(
  load: number,
  reps: number,
  needsLoad: boolean = true
): ValidationResult {
  const errors: ValidationError[] = [];

  if (needsLoad) {
    const loadError = validateLoad(load);
    if (loadError) errors.push(loadError);
  }

  const repsError = validateReps(reps);
  if (repsError) errors.push(repsError);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getErrorMessage(errors: ValidationError[]): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) return errors[0]!.message;
  return `Multiple errors: ${errors.map((e) => e.message).join(", ")}`;
}
