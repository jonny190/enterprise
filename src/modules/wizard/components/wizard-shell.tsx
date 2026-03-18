"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { updateWizardState } from "@/modules/wizard/actions";

const STEPS = [
  { number: 1, label: "Project Metadata" },
  { number: 2, label: "Vision Statement" },
  { number: 3, label: "Key Objectives" },
  { number: 4, label: "User Stories" },
  { number: 5, label: "Non-Functional Reqs" },
  { number: 6, label: "Constraints" },
  { number: 7, label: "Process Flows" },
  { number: 8, label: "Review & Finalize" },
];

export function WizardShell({
  projectId,
  initialStep,
  initialCompletedSteps,
  renderStep,
}: {
  projectId: string;
  initialStep: number;
  initialCompletedSteps: number[];
  renderStep: (step: number, onComplete: () => void) => React.ReactNode;
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>(
    initialCompletedSteps
  );

  async function goToStep(step: number) {
    setCurrentStep(step);
    await updateWizardState(projectId, {
      currentStep: step,
      completedSteps,
    });
  }

  async function completeAndNext(step: number) {
    const newCompleted = [...new Set([...completedSteps, step])].sort();
    setCompletedSteps(newCompleted);
    const nextStep = Math.min(step + 1, 8);
    setCurrentStep(nextStep);
    await updateWizardState(projectId, {
      currentStep: nextStep,
      completedSteps: newCompleted,
    });
  }

  return (
    <div className="flex h-full">
      <div className="w-60 border-r border-gray-800 py-4">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const isClickable = isCompleted || step.number <= currentStep;

          return (
            <button
              key={step.number}
              onClick={() => isClickable && goToStep(step.number)}
              disabled={!isClickable}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm",
                isCurrent && "bg-gray-800 text-white",
                !isCurrent && isClickable && "text-gray-400 hover:bg-gray-800/50",
                !isClickable && "cursor-not-allowed text-gray-600"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isCompleted && "bg-green-600 text-white",
                  isCurrent && !isCompleted && "bg-blue-600 text-white",
                  !isCurrent && !isCompleted && "bg-gray-700 text-gray-400"
                )}
              >
                {isCompleted ? "\u2713" : step.number}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {renderStep(currentStep, () => completeAndNext(currentStep))}
      </div>
    </div>
  );
}

export { STEPS };
