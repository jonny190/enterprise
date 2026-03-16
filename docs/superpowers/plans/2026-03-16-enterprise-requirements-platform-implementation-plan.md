# Enterprise Requirements Platform - Detailed Implementation Plan

## Planning Context

This plan is based on the product specification in [2026-03-16-enterprise-requirements-platform-design.md](/mnt/d/enterprise/docs/superpowers/specs/2026-03-16-enterprise-requirements-platform-design.md). At the time of writing, this repository is greenfield and contains documentation only, so the plan assumes the application, infrastructure configuration, and delivery pipeline all need to be created from scratch.

## Delivery Goals

Build and deploy a multi-tenant requirements platform at `enterprise.coria.app` that allows organizations to:

- manage users and invitations
- create and share projects inside an organization
- capture project scope through a guided wizard and a freeform editor
- generate structured outputs using Claude server-side
- export outputs as Markdown, PDF, and Word
- run the application in Docker on Coolify with PostgreSQL and Resend-backed email flows

## Delivery Principles

- Keep the initial implementation aligned to the spec without adding extra product surface area.
- Build the data model and auth boundary first because every major feature depends on them.
- Ship the wizard and freeform editor on top of a stable persistence model rather than treating them as purely front-end flows.
- Treat generated outputs as versioned records from day one.
- Optimize for server-rendered Next.js pages with Server Actions for mutations and narrowly scoped client components for interaction.

## Proposed Build Order

1. Foundation and repository setup
2. Database schema and Prisma workflow
3. Authentication, session handling, and email flows
4. Organization and membership management
5. Project shell and navigation
6. Wizard persistence and guided requirements capture
7. Freeform requirements editor
8. AI generation pipeline and output history
9. Export pipeline
10. Deployment hardening, QA, and launch preparation

## Phase 1: Foundation

### Objectives

- establish the Next.js application and baseline engineering standards
- create a project structure that matches the spec routes and core domains
- set up local development, environment loading, Docker, and CI basics

### Work Items

- Initialize a Next.js 14+ app using App Router and TypeScript.
- Add Tailwind CSS and define a minimal design token layer for layout, spacing, roles, statuses, and priority tags.
- Add Prisma, PostgreSQL connection handling, and environment validation.
- Create the initial folder structure:
  - `app/(auth)`
  - `app/(dashboard)`
  - `components`
  - `lib/auth`
  - `lib/db`
  - `lib/permissions`
  - `lib/ai`
  - `lib/email`
  - `lib/export`
  - `lib/validators`
  - `prisma`
- Add linting, formatting, TypeScript strict mode, and a basic test harness.
- Add Docker assets for Coolify deployment.
- Add `.env.example` with all required variables.

### Deliverables

- bootable Next.js application
- working local database connection
- Docker build that can run the app
- baseline CI checks for install, lint, typecheck, and test

### Acceptance Criteria

- a new developer can clone the repo, install dependencies, run migrations, and start the app locally
- Docker image builds successfully with production environment variables
- route groups and shared layouts compile without placeholder errors

## Phase 2: Data Model and Persistence

### Objectives

- convert the spec data model into a stable Prisma schema
- establish migration strategy and application-level query conventions

### Work Items

- Implement Prisma models for:
  - `User`
  - `Organization`
  - `OrgMembership`
  - `OrgInvitation`
  - `Project`
  - `ProjectMeta`
  - `Objective`
  - `UserStory`
  - `RequirementCategory`
  - `Requirement`
  - `NFRMetric`
  - `ProjectWizardState`
  - `GeneratedOutput`
- Create enums for org roles, project status, requirement category type, MoSCoW priority, invitation status, and generated output type.
- Add relational constraints and indexes needed for:
  - unique org slugs
  - unique membership per user/org
  - project-level lookups
  - output history sorting
  - category and item ordering
- Implement soft-delete handling for `Project`.
- Add repository/query helpers that automatically exclude soft-deleted projects.
- Seed minimal development fixtures for one organization, several users, and one sample project.

### Key Decisions to Lock Early

- whether project creator ownership is represented only through `createdById` plus role checks, or with a dedicated project-level owner field
- how `completedSteps` is stored in Prisma for PostgreSQL JSON handling
- how invitation tokens are stored and hashed

### Acceptance Criteria

- database migrations apply cleanly from an empty database
- core relationships support the full wizard and output history lifecycle
- project queries do not accidentally return soft-deleted rows

## Phase 3: Authentication and Account Lifecycle

### Objectives

- implement secure account creation, verification, login, reset, and protected sessions

### Work Items

- Configure NextAuth.js with credentials-based authentication.
- Implement password hashing and secure credential validation.
- Build auth pages:
  - `/login`
  - `/register`
  - `/verify-email`
  - `/forgot-password`
  - `/reset-password`
- Implement email verification flow.
- Implement password reset token generation, validation, and expiration.
- Restrict login to verified users only.
- After successful verification, route first-time users into org creation or invitation completion flow.
- If an invitation token is present at registration time, persist it through verification and auto-accept after verification.

### Security Requirements

- tokens must be time-bound and single-use
- passwords must never be logged or exposed to the client
- session payload should include only what route protection needs
- server-side validation should mirror client-side form validation

### Acceptance Criteria

- an unverified user cannot access protected routes
- a verified user can log in and persist a session across refreshes
- a new invited user can register, verify, and join the correct organization without admin intervention

## Phase 4: Authorization, Middleware, and Multi-Tenant Boundaries

### Objectives

- enforce org and project access consistently across the app

### Work Items

- Implement middleware to redirect unauthenticated users.
- Resolve active organization from route params and validate membership.
- Add centralized permission helpers for:
  - invite member
  - revoke invitation
  - update member role
  - remove member
  - create project
  - edit project
  - archive project
  - delete project
  - manage org settings
- Apply permission checks in Server Actions, not just in the UI.
- Add route-level protection for all `/org/[slug]/*` and `/project/[id]/*` pages.

### Acceptance Criteria

- users cannot access org data for orgs they do not belong to
- admin and owner restrictions match the role matrix in the spec
- project archive and delete actions are blocked correctly by role

## Phase 5: Organization Workspace and Navigation Shell

### Objectives

- create the Slack-style shell the rest of the platform depends on

### Work Items

- Build the three-tier layout:
  - icon rail for org switching
  - org sidebar for project and org navigation
  - main content area with project tabs
- Implement dashboard route for recent projects overview.
- Build org pages:
  - `/org/[slug]/projects`
  - `/org/[slug]/members`
  - `/org/[slug]/settings`
- Build project shell and sub-navigation:
  - `/project/[id]/wizard`
  - `/project/[id]/requirements`
  - `/project/[id]/meta`
  - `/project/[id]/generate`
  - `/project/[id]/outputs`
  - `/project/[id]/settings`
- Implement project list filters for active, archived, and draft projects.
- Add project creation flow.

### UX Notes

- keep org switching global and persistent
- make project state visible with clear draft, active, and archived indicators
- avoid forcing users back to the wizard after completion

### Acceptance Criteria

- a user can move between organizations and projects without broken route context
- active project context is obvious across all project tabs
- archived projects are hidden by default and discoverable through a filter

## Phase 6: Wizard and Guided Requirements Capture

### Objectives

- implement the side-stepper flow with durable state and validation for each step

### Work Items

- Build `ProjectWizardState` persistence with:
  - current step
  - completed steps
  - last updated timestamp
- Implement the seven wizard steps from the spec:
  - Project Metadata
  - Vision Statement
  - Key Objectives
  - User Stories
  - Non-Functional Requirements
  - Constraints, Assumptions, Dependencies
  - Review & Finalize
- Add step-specific validation rules:
  - objectives minimum 1, maximum 5
  - user stories minimum 1, maximum 10
  - required fields for review eligibility
- Save progress incrementally through Server Actions.
- Allow navigation backward and to completed steps.
- Finalization should mark the project ready for freeform editing without deleting wizard state.

### Data Mapping Requirements

- metadata step writes to `ProjectMeta`
- objectives step writes ordered `Objective` rows
- stories step writes ordered `UserStory` rows
- NFR step writes `RequirementCategory`, `Requirement`, and `NFRMetric`
- constraints step writes categorized `RequirementCategory` and `Requirement` rows for constraint, assumption, and dependency types

### Acceptance Criteria

- reloading the page restores the user to the correct step with saved data
- invalid states cannot be finalized
- the review step accurately summarizes all persisted project inputs

## Phase 7: Freeform Editor and Post-Wizard Editing

### Objectives

- let users refine project content after onboarding without wizard constraints

### Work Items

- Build the tabbed editor for:
  - Vision
  - Objectives
  - User Stories
  - NFRs
  - Constraints
- Implement inline editing for all editable project content.
- Add create/remove actions for objectives, stories, categories, requirements, and metrics.
- Allow users to exceed wizard limits after finalization.
- Implement drag-and-drop ordering for:
  - objectives
  - user stories
  - requirement categories
  - requirements within category
- Add MoSCoW priority editing where required by the spec.
- Provide a controlled re-entry path into the wizard.
- Keep `Project Meta` as a dedicated tab for longer-form context fields.

### Important Constraint

The freeform editor must not create a second, incompatible data model. It should edit the same persisted entities created by the wizard.

### Acceptance Criteria

- changes in the editor are immediately reflected in generation inputs
- ordering is preserved after refresh
- users can add more than 5 objectives and more than 10 user stories after wizard completion

## Phase 8: Invitations and Member Management

### Objectives

- complete the org collaboration model before AI and export features go live

### Work Items

- Build invite flow with role selection and expiration.
- Send invitation emails through Resend.
- Build pending invitation list and revoke action.
- Build members list with current role and allowed actions.
- Enforce role transition rules:
  - owners can promote to admin
  - admins cannot promote to owner
  - admins cannot remove admins or owners
- Handle accepted and expired invitation states cleanly.

### Acceptance Criteria

- invited users receive a valid join link
- expired links fail safely and explain the problem
- member management actions are visible only when authorized

## Phase 9: AI Generation Pipeline

### Objectives

- turn project data into saved, auditable outputs with a strong server-side boundary

### Work Items

- Build the `/project/[id]/generate` page with output type picker and preview pane.
- Add server-side context assembly that collects:
  - project metadata
  - vision statement
  - objectives
  - user stories
  - non-functional requirements with metrics
  - constraints, assumptions, and dependencies
- Create prompt templates for:
  - AI coding prompt
  - requirements document
  - project brief
  - technical spec
- Integrate Claude API calls on the server with streaming to the preview UI.
- Discard partial responses if generation fails or streaming is interrupted.
- Save successful generations to `GeneratedOutput`.
- Support editable generated content before save.

### Operational Concerns

- log failures with enough detail for debugging without leaking secrets
- define request timeout and retry behavior
- prevent duplicate saves from rapid repeat actions

### Acceptance Criteria

- each generation creates a new output history record
- users can edit content before saving
- failed generations do not produce partial persisted outputs

## Phase 10: Output History and Export

### Objectives

- make generated outputs retrievable, editable, and exportable

### Work Items

- Build the `/project/[id]/outputs` page with chronological history grouped by output type.
- Support viewing original generated content and edited content for any saved output.
- Add copy-to-clipboard for saved outputs.
- Implement export services for:
  - Markdown
  - PDF
  - Word `.docx`
- Define formatting templates so exports remain consistent across output types.
- Ensure export file names include project name, output type, and timestamp.

### Acceptance Criteria

- users can reopen older outputs without overwriting newer ones
- exports download successfully for each supported format
- edited content is exported when present; otherwise original content is used

## Phase 11: Project Settings, Archive, and Delete Flows

### Objectives

- complete the project lifecycle controls specified by the product design

### Work Items

- Build `/project/[id]/settings`.
- Add project rename, description update, and status controls where appropriate.
- Implement archive and unarchive behavior for project owners and org admins.
- Implement owner-only soft delete by setting `deletedAt`.
- Ensure all list and detail queries exclude soft-deleted projects.

### Acceptance Criteria

- archived projects disappear from the default view and can be restored
- soft-deleted projects are inaccessible through the UI and route guards
- only authorized roles can execute lifecycle actions

## Phase 12: Email and Background Reliability

### Objectives

- make transactional flows dependable enough for real users

### Work Items

- Create reusable Resend email templates for:
  - verify email
  - reset password
  - organization invitation
- Add resend-safe retry handling where appropriate.
- Add structured logging for outbound email attempts and failures.
- Define how expired or invalid tokens are surfaced in the UI.

### Acceptance Criteria

- all token-driven flows provide deterministic user feedback
- email templates render correctly across verification, reset, and invite scenarios

## Phase 13: QA, Hardening, and Launch Preparation

### Objectives

- verify the product as a coherent end-to-end system before deployment

### Test Coverage Priorities

- auth registration, verification, login, reset
- invitation lifecycle and role enforcement
- middleware and route authorization
- wizard save/resume/finalize behavior
- freeform editing and reorder persistence
- AI generation save/failure handling
- export generation
- archive and delete flows

### Work Items

- Add unit tests for validation, permissions, and transformation logic.
- Add integration tests for Server Actions and database mutations.
- Add end-to-end smoke coverage for the highest-risk user journeys.
- Add seed/reset tooling for local QA and staging.
- Verify Docker deployment on Coolify with production env configuration.
- Confirm Cloudflare DNS, HTTPS, and email DNS records for Resend.

### Launch Checklist

- environment variables set in Coolify
- database migrations applied in production
- NextAuth secret configured
- Claude API key configured
- Resend domain verified with SPF and DKIM
- error monitoring and logs visible
- backup/restore approach defined for PostgreSQL

## Recommended Technical Structure

### App Layers

- `app/*`: pages, layouts, and Server Actions entry points
- `components/*`: reusable UI, form, navigation, and editor components
- `lib/db/*`: Prisma client and query helpers
- `lib/auth/*`: NextAuth config, token handling, password utilities
- `lib/permissions/*`: role and access checks
- `lib/ai/*`: prompt builders, context assembler, Claude client
- `lib/export/*`: Markdown, PDF, and `.docx` generation
- `lib/email/*`: Resend client and email templates
- `lib/validators/*`: shared Zod schemas for forms and actions

### Suggested Early Schema Extensions

These are not new product features, but they may simplify implementation:

- invitation token hash and token expiry fields separate from display state
- created and updated timestamps on all mutable child entities
- optional audit metadata for output edits if future traceability is needed

## Risks and Mitigations

### Risk: auth complexity delays product work

Mitigation:
Implement auth and invitation flows before building the main workspace UI, and keep permission logic centralized.

### Risk: wizard and freeform editor drift apart

Mitigation:
Use one persistence model and one set of validation/transformation utilities for both flows.

### Risk: AI output quality is inconsistent

Mitigation:
Version prompt templates, test against representative seeded projects, and review outputs per type before launch.

### Risk: export quality differs across formats

Mitigation:
Define canonical structured content blocks first, then map them into Markdown, PDF, and `.docx`.

### Risk: soft-delete leaks data through overlooked queries

Mitigation:
Wrap project lookups in shared query helpers and add tests specifically for deleted project access.

## Suggested Milestones

### Milestone 1: Secure Foundation

- app scaffolded
- schema implemented
- auth and middleware working
- org creation and project creation possible

### Milestone 2: Requirements Capture MVP

- workspace shell complete
- wizard complete
- freeform editor complete
- member management complete

### Milestone 3: Document Generation MVP

- Claude integration complete
- output history complete
- Markdown export complete

### Milestone 4: Launch-Ready Platform

- PDF and Word export complete
- archive/delete flows complete
- end-to-end QA complete
- Docker and Coolify deployment verified

## Recommended First Build Sprint

If implementation starts immediately, the highest-value first sprint is:

1. scaffold Next.js, Prisma, Tailwind, Docker, linting, and env validation
2. implement Prisma schema and initial migrations
3. stand up NextAuth credentials flow with verification and reset foundations
4. build middleware and permission helpers
5. implement organization creation, project creation, and workspace shell

This sprint creates the base that every later feature depends on and reduces the risk of rework in the wizard, collaboration, and generation features.
