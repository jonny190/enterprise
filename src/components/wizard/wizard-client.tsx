"use client";

import { WizardShell } from "./wizard-shell";
import { StepMetadata } from "./step-metadata";
import { StepVision } from "./step-vision";
import { StepObjectives } from "./step-objectives";
import { StepUserStories } from "./step-user-stories";
import { StepNFR } from "./step-nfr";
import { StepConstraints } from "./step-constraints";
import { StepReview } from "./step-review";
import { StepProcessFlows } from "./step-process-flows";
import { Priority, FlowType } from "@prisma/client";

type Props = {
  projectId: string;
  initialStep: number;
  initialCompletedSteps: number[];
  meta: {
    businessContext: string;
    visionStatement: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  };
  objectives: { title: string; successCriteria: string }[];
  userStories: {
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[];
  nfrCategories: {
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: Priority;
      metrics: { metricName: string; targetValue: string; unit: string }[];
    }[];
  }[];
  constraintItems: {
    type: "constraint" | "assumption" | "dependency";
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: Priority;
    }[];
  }[];
  processFlows: {
    name: string;
    flowType: FlowType;
    diagramData: unknown;
    sortOrder: number;
  }[];
};

export function WizardClient(props: Props) {
  return (
    <WizardShell
      projectId={props.projectId}
      initialStep={props.initialStep}
      initialCompletedSteps={props.initialCompletedSteps}
      renderStep={(step, onComplete) => {
        switch (step) {
          case 1:
            return (
              <StepMetadata
                projectId={props.projectId}
                initialData={props.meta}
                onComplete={onComplete}
              />
            );
          case 2:
            return (
              <StepVision
                projectId={props.projectId}
                initialValue={props.meta.visionStatement}
                onComplete={onComplete}
              />
            );
          case 3:
            return (
              <StepObjectives
                projectId={props.projectId}
                initialObjectives={props.objectives}
                onComplete={onComplete}
              />
            );
          case 4:
            return (
              <StepUserStories
                projectId={props.projectId}
                initialStories={props.userStories}
                onComplete={onComplete}
              />
            );
          case 5:
            return (
              <StepNFR
                projectId={props.projectId}
                initialCategories={props.nfrCategories}
                onComplete={onComplete}
              />
            );
          case 6:
            return (
              <StepConstraints
                projectId={props.projectId}
                initialItems={props.constraintItems}
                onComplete={onComplete}
              />
            );
          case 7:
            return (
              <StepProcessFlows
                projectId={props.projectId}
                initialFlows={
                  props.processFlows?.map((f) => ({
                    name: f.name,
                    flowType: f.flowType,
                    diagramData: (f.diagramData as { nodes: unknown[]; edges: unknown[] }) ?? { nodes: [], edges: [] },
                  })) ?? []
                }
                onComplete={onComplete}
              />
            );
          case 8:
            return (
              <StepReview
                projectId={props.projectId}
                data={{
                  meta: props.meta,
                  objectives: props.objectives,
                  userStories: props.userStories,
                  nfrCount: props.nfrCategories.length,
                  constraintCount: props.constraintItems.length,
                }}
              />
            );
          default:
            return null;
        }
      }}
    />
  );
}
