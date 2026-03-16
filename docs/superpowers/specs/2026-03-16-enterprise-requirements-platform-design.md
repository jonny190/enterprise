# Enterprise Requirements Platform - Design Spec

## Overview

A web-based system for gathering high-level requirements and project scope, including non-functional requirements with measurable targets. The system supports multiple users and organizations with project sharing. Captured requirements can generate AI-structured prompts, requirements documents, project briefs, and technical specs.

**URL:** enterprise.coria.app
**Deployment:** Coolify (Docker) + Cloudflare DNS

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (email/password with verification)
- **Styling:** Tailwind CSS
- **AI:** Claude API (server-side)
- **Export:** Markdown, PDF, Word (.docx via `docx` npm package)
- **Deployment:** Docker container on Coolify, single PostgreSQL database

## Data Model

### Users & Organizations

**User**
- id (UUID, PK)
- email (unique)
- passwordHash
- name
- emailVerified (boolean)
- createdAt
- updatedAt

**Organization**
- id (UUID, PK)
- name
- slug (unique)
- createdAt
- updatedAt

**OrgMembership**
- id (UUID, PK)
- userId (FK -> User)
- orgId (FK -> Organization)
- role (enum: owner, admin, member)
- createdAt

Constraints: unique(userId, orgId). A user can belong to multiple orgs.

**OrgInvitation**
- id (UUID, PK)
- orgId (FK -> Organization)
- email
- role (enum: owner, admin, member)
- invitedById (FK -> User)
- status (enum: pending, accepted, expired)
- createdAt
- expiresAt

Constraints: unique(orgId, email) where status = pending. Invitations expire after 7 days.

### Projects

**Project**
- id (UUID, PK)
- orgId (FK -> Organization)
- name
- description
- status (enum: draft, active, archived)
- deletedAt (timestamp, nullable -- soft delete)
- createdById (FK -> User)
- createdAt
- updatedAt

**ProjectMeta**
- id (UUID, PK)
- projectId (FK -> Project, unique)
- businessContext (text)
- visionStatement (text)
- targetUsers (text)
- technicalConstraints (text)
- timeline (text)
- stakeholders (text)
- glossary (text)

**Objective**
- id (UUID, PK)
- projectId (FK -> Project)
- title
- successCriteria (text)
- sortOrder (int)

**UserStory**
- id (UUID, PK)
- projectId (FK -> Project)
- role (text)
- capability (text)
- benefit (text)
- priority (enum: must, should, could, wont)
- sortOrder (int)

### Requirements

**RequirementCategory**
- id (UUID, PK)
- projectId (FK -> Project)
- type (enum: non_functional, constraint, assumption, dependency)
- name
- sortOrder (int)

**Requirement**
- id (UUID, PK)
- categoryId (FK -> RequirementCategory)
- title
- description (text)
- priority (enum: must, should, could, wont)
- sortOrder (int)

**NFRMetric**
- id (UUID, PK)
- requirementId (FK -> Requirement)
- metricName
- targetValue
- unit

### Wizard State

**ProjectWizardState**
- id (UUID, PK)
- projectId (FK -> Project, unique)
- currentStep (int)
- completedSteps (JSON array)
- lastUpdatedAt

### Generated Outputs

**GeneratedOutput**
- id (UUID, PK)
- projectId (FK -> Project)
- outputType (enum: ai_prompt, requirements_doc, project_brief, technical_spec)
- content (text)
- editedContent (text, nullable -- stores user edits, null if unedited)
- generatedAt
- generatedById (FK -> User)

Multiple outputs of the same type per project are allowed. Each generation creates a new row, preserving full history. The Outputs tab shows a chronological list grouped by type. Users can view any past output and see both the original generated content and their edits (if any). There is no diff/compare view between outputs -- each output stands alone.

## Application Architecture

### Route Structure

```
/app/(auth)/
  login
  register
  verify-email
  forgot-password
  reset-password

/app/(dashboard)/
  dashboard                    -- recent projects overview
  org/[slug]/
    projects                   -- project list
    members                    -- manage org members
    settings                   -- org settings
  project/[id]/
    wizard                     -- guided requirements wizard
    requirements               -- freeform requirements editor
    meta                       -- project metadata
    generate                   -- output generation
    outputs                    -- history of generated outputs
    settings                   -- project settings
```

### Key Architectural Decisions

- **Server Components by default.** Client components only where interactivity is needed (forms, drag-and-drop, wizard flow).
- **Server Actions for mutations.** Creating/updating requirements, generating outputs. No separate API routes for internal operations.
- **Middleware for auth.** Redirect unauthenticated users, verify org membership on org/project routes.
- **Claude API calls server-side** in Server Actions. The API key never reaches the client.

## UI Layout

### Rail + Sidebar (Slack-style)

Three-tier layout:

1. **Icon rail (far left, ~56px):** Org switcher. Each org shown as an icon/initials badge. Click to switch active org.
2. **Sidebar (~220px):** Shows projects for the active org, plus org-level navigation (Members, Settings). Active project highlighted.
3. **Main content area:** Tabbed sub-navigation (Wizard, Requirements, Meta, Generate, Outputs, Settings) with content below.

### Wizard Flow (Side Stepper)

Vertical step list on the left side of the content area, content on the right. Steps:

1. **Project Metadata** -- business context, target users, stakeholders, timeline
2. **Vision Statement** -- single clear statement of what the project achieves
3. **Key Objectives (up to 5)** -- measurable outcomes with success criteria. Minimum 1, maximum 5 enforced in wizard. Guides users to prioritize.
4. **User Stories (up to 10)** -- "As a [role], I want [capability], so that [benefit]" with priority. Minimum 1, maximum 10 enforced in wizard. Keeps initial scoping focused.
5. **Non-Functional Requirements** -- categories with metric prompts (metric name, target value, unit)
6. **Constraints, Assumptions, Dependencies** -- categorized items
7. **Review & Finalize** -- summary of all captured requirements, confirm to exit wizard

Completed steps show a checkmark. Users can jump back to any completed step. After finalizing, the project enters freeform editing mode.

### Freeform Editor (Post-Wizard)

- **Tabbed sections:** Vision, Objectives, User Stories, NFRs, Constraints
- **Inline editing:** Click any item to edit directly
- **Add/remove:** Users can exceed wizard limits (more than 5 objectives, more than 10 stories)
- **Drag-and-drop reordering** within each section
- **MoSCoW priority tagging** on user stories and requirements (must/should/could/won't)
- **Re-enter wizard:** Option to go back through the guided flow
- **Project Meta tab:** Business context, stakeholders, timeline, glossary

## Authentication & Authorization

### Auth Flow

- Register with email and password, receive verification email
- Login with email/password (verified accounts only)
- Forgot password / reset password via email link
- Sessions managed via NextAuth.js with JWT tokens

### Post-Registration

- First-time users are prompted to create a new organization after email verification
- Users join existing organizations via email invitation only (no self-service join)

### Invitations

Org owners and admins can invite users by email (see OrgInvitation in Data Model). The invitee receives an email with a link. If they already have an account, accepting creates the OrgMembership. If they don't have an account, the link goes to the registration page with the invitation token as a URL query parameter. The token is stored in a cookie during registration. After verifying their email, the system checks for a pending invitation token and creates the membership automatically.

Invitations expire after 7 days. Owners and admins can revoke pending invitations.

### Member Management

Owners and admins can:
- Invite new members by email (with role selection)
- Change a member's role (owners can promote to admin; admins cannot promote to owner)
- Remove members from the org (owners can remove anyone; admins can remove members but not other admins or owners)

### Organization Roles

| Role | Manage Members | Create Projects | Edit Projects | Archive/Delete Projects | Org Settings |
|------|---------------|----------------|--------------|------------------------|-------------|
| Owner | Yes | Yes | Yes | Archive + Delete | Yes |
| Admin | Yes | Yes | Yes | Archive only | No |
| Member | No | Yes | Yes | No | No |

### Project Permissions

- All org members can view all projects in their org
- Any member can create a project (creator becomes project owner)
- **Archive:** Project owners and org admins can archive projects. Archived projects are hidden from the default project list but remain accessible via a filter. Archiving is reversible.
- **Delete:** Only org owners can permanently delete projects. Deletion is a soft delete (sets a deletedAt timestamp). Soft-deleted projects are hidden from all views and excluded from queries. No hard delete in the application -- data cleanup is a database-level operation if ever needed.

## Prompt/Document Generation

### Flow

1. **Choose output type:** AI coding prompt, requirements document, project brief, or technical spec
2. **Preview:** System calls Claude API server-side, streams result to a preview pane
3. **Edit:** User can tweak generated output inline before saving
4. **Save/Export:** Save to output history, copy to clipboard, or download as Markdown, PDF, or Word (.docx)

### AI Integration

The system passes the full project context to Claude API:
- Project metadata (business context, target users, stakeholders, timeline)
- Vision statement
- Objectives with success criteria
- User stories with priorities
- Non-functional requirements with measurable metrics
- Constraints, assumptions, dependencies

Claude receives structured instructions to produce the chosen output type. Each type has distinct generation goals:

- **AI Coding Prompt:** Produces a structured prompt suitable for AI coding tools (Claude Code, Cursor, etc.). Focuses on technical requirements, acceptance criteria, constraints, and measurable NFRs. Output is directive and implementation-focused.
- **Requirements Document:** Produces a formal requirements document with executive summary, scope, stakeholder list, functional requirements (derived from user stories), non-functional requirements with metrics, constraints, assumptions, dependencies, and glossary. Professional tone, structured for sign-off.
- **Project Brief:** Produces a concise overview for stakeholders. Covers vision, objectives, key user stories, timeline, and high-level constraints. Less technical, more strategic. Suitable for executive communication.
- **Technical Spec:** Produces an architecture-oriented document. Derives system components, data flows, integration points, and technical constraints from the requirements. Aimed at development teams planning implementation.

The system handles prompt engineering -- users just pick what they want generated.

### Error Handling

- If the Claude API call fails (rate limit, timeout, network error), display an error message with a retry button. No partial output is saved.
- If streaming is interrupted mid-generation, the partial output is discarded and the user is prompted to retry.
- API errors are logged server-side for debugging but not exposed to users beyond a generic "generation failed" message.

## Infrastructure

### Coolify Deployment

- Single Docker container for the Next.js application
- PostgreSQL database managed alongside the app on Coolify
- Environment variables for database URL, NextAuth secret, Claude API key, email service credentials

### Cascade Behavior

- **Organization deleted:** Not supported in the application. Orgs persist indefinitely.
- **Project soft-deleted:** All associated data (ProjectMeta, Objectives, UserStories, RequirementCategories, Requirements, NFRMetrics, ProjectWizardState, GeneratedOutputs) remains in the database but is inaccessible. Queries filter by deletedAt IS NULL.
- **User removed from org:** Their OrgMembership is deleted. Projects they created remain (createdById is a historical reference, not an ownership gate). Their GeneratedOutputs remain with generatedById intact.

### Cloudflare DNS

- Domain: enterprise.coria.app
- HTTP record pointing to Coolify (Cloudflare tunnel handles HTTPS)
- SPF and DKIM records for Resend email deliverability (Resend provides the required DNS values during domain verification)

### Email Service

- Transactional email for verification and password reset
- Provider: Resend (simple API, good Next.js integration, free tier covers small scale)
- Configured via RESEND_API_KEY environment variable
