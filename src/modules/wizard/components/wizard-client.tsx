"use client";

import { useState, useCallback } from "react";
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
import type { ImportedData } from "@/modules/import/lib/analyse-document";

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
  const [importedData, setImportedData] = useState<ImportedData | null>(null);

  const handleImportComplete = useCallback((data: ImportedData) => {
    setImportedData(data);
  }, []);

  // Merge imported data with props (imported takes precedence for non-empty values)
  const meta = importedData
    ? {
        businessContext: importedData.meta.businessContext || props.meta.businessContext,
        visionStatement: importedData.visionStatement || props.meta.visionStatement,
        targetUsers: importedData.meta.targetUsers || props.meta.targetUsers,
        technicalConstraints: importedData.meta.technicalConstraints || props.meta.technicalConstraints,
        timeline: importedData.meta.timeline || props.meta.timeline,
        stakeholders: importedData.meta.stakeholders || props.meta.stakeholders,
        glossary: importedData.meta.glossary || props.meta.glossary,
      }
    : props.meta;

  const objectives = importedData?.objectives.length
    ? importedData.objectives
    : props.objectives;

  const userStories = importedData?.userStories.length
    ? importedData.userStories.map((s) => ({
        ...s,
        priority: s.priority as Priority,
      }))
    : props.userStories;

  const nfrCategories = importedData?.nfrCategories.length
    ? importedData.nfrCategories.map((cat) => ({
        ...cat,
        requirements: cat.requirements.map((r) => ({
          ...r,
          priority: r.priority as Priority,
        })),
      }))
    : props.nfrCategories;

  const constraintItems = importedData?.constraints.length
    ? importedData.constraints.map((c) => ({
        ...c,
        requirements: c.requirements.map((r) => ({
          ...r,
          priority: r.priority as Priority,
        })),
      }))
    : props.constraintItems;

  const importNotes = importedData?.importNotes ?? "";

  // Force remount of steps when import data arrives
  const stepKey = importedData ? "imported" : "manual";

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
                key={stepKey}
                projectId={props.projectId}
                initialData={meta}
                importNotes={importNotes}
                onImportComplete={handleImportComplete}
                onComplete={onComplete}
              />
            );
          case 2:
            return (
              <StepVision
                key={stepKey}
                projectId={props.projectId}
                initialValue={meta.visionStatement}
                onComplete={onComplete}
              />
            );
          case 3:
            return (
              <StepObjectives
                key={stepKey}
                projectId={props.projectId}
                initialObjectives={objectives}
                onComplete={onComplete}
              />
            );
          case 4:
            return (
              <StepUserStories
                key={stepKey}
                projectId={props.projectId}
                initialStories={userStories}
                onComplete={onComplete}
              />
            );
          case 5:
            return (
              <StepNFR
                key={stepKey}
                projectId={props.projectId}
                initialCategories={nfrCategories}
                onComplete={onComplete}
              />
            );
          case 6:
            return (
              <StepConstraints
                key={stepKey}
                projectId={props.projectId}
                initialItems={constraintItems}
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
                  meta: meta,
                  objectives: objectives,
                  userStories: userStories,
                  nfrCount: nfrCategories.length,
                  constraintCount: constraintItems.length,
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
