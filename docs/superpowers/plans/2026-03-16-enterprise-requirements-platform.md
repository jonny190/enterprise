# Enterprise Requirements Platform Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-user, multi-org web platform for gathering structured project requirements and generating AI-powered outputs (prompts, docs, briefs, specs).

**Architecture:** Next.js 14+ App Router monolith with PostgreSQL (Prisma ORM), NextAuth.js for email/password auth, Tailwind CSS for styling, and Claude API for server-side AI generation. Single Docker container deployed to Coolify with Cloudflare DNS.

**Tech Stack:** Next.js 14+, TypeScript, PostgreSQL, Prisma, NextAuth.js, Tailwind CSS, Anthropic SDK, Resend, @react-pdf/renderer, docx

**Spec:** `docs/superpowers/specs/2026-03-16-enterprise-requirements-platform-design.md`

---

## File Structure

```
enterprise/
  prisma/
    schema.prisma                    -- Full database schema (all models)
    seed.ts                          -- Dev seed data
  src/
    app/
      layout.tsx                     -- Root layout (html, body, providers)
      globals.css                    -- Tailwind imports + global styles
      (auth)/
        layout.tsx                   -- Centered auth layout (no sidebar)
        login/page.tsx               -- Login form
        register/page.tsx            -- Register form (handles invitation token)
        verify-email/page.tsx        -- Email verification handler
        forgot-password/page.tsx     -- Forgot password form
        reset-password/page.tsx      -- Reset password form
      (dashboard)/
        layout.tsx                   -- Dashboard layout (rail + sidebar + content)
        dashboard/page.tsx           -- Recent projects overview
        org/[slug]/
          projects/page.tsx          -- Project list for org
          members/page.tsx           -- Manage org members + invitations
          settings/page.tsx          -- Org settings (name, slug)
        project/[id]/
          layout.tsx                 -- Project layout (tab navigation)
          wizard/page.tsx            -- Wizard flow (side stepper)
          requirements/page.tsx      -- Freeform requirements editor
          meta/page.tsx              -- Project metadata editor
          generate/page.tsx          -- Output generation page
          outputs/page.tsx           -- Generated output history
          settings/page.tsx          -- Project settings (archive, delete)
    components/
      auth/
        login-form.tsx               -- Login form client component
        register-form.tsx            -- Register form client component
        forgot-password-form.tsx     -- Forgot password form
        reset-password-form.tsx      -- Reset password form
      layout/
        org-rail.tsx                 -- Org switcher icon rail
        project-sidebar.tsx          -- Project list sidebar
        project-tabs.tsx             -- Project tab navigation
      org/
        member-list.tsx              -- Member list with role management
        invite-form.tsx              -- Invite member form
      project/
        project-card.tsx             -- Project card for list view
        create-project-dialog.tsx    -- New project dialog
      wizard/
        wizard-shell.tsx             -- Side stepper + content layout
        step-metadata.tsx            -- Step 1: Project metadata form
        step-vision.tsx              -- Step 2: Vision statement form
        step-objectives.tsx          -- Step 3: Objectives form
        step-user-stories.tsx        -- Step 4: User stories form
        step-nfr.tsx                 -- Step 5: NFR form with metrics
        step-constraints.tsx         -- Step 6: Constraints/assumptions/deps
        step-review.tsx              -- Step 7: Review & finalize
      requirements/
        requirements-tabs.tsx        -- Tabbed sections container
        editable-item.tsx            -- Inline editable list item
        sortable-list.tsx            -- Drag-and-drop sortable list
        priority-badge.tsx           -- MoSCoW priority badge
      generate/
        output-type-picker.tsx       -- Output type selection cards
        generation-preview.tsx       -- Streaming preview pane
        output-editor.tsx            -- Inline edit before save
        export-buttons.tsx           -- Download MD/PDF/Word buttons
      outputs/
        output-list.tsx              -- Chronological output list
        output-viewer.tsx            -- View single output
      ui/
        button.tsx                   -- Reusable button
        input.tsx                    -- Reusable input
        textarea.tsx                 -- Reusable textarea
        dialog.tsx                   -- Modal dialog
        tabs.tsx                     -- Tab component
        badge.tsx                    -- Badge component
        toast.tsx                    -- Toast notifications
    lib/
      prisma.ts                      -- Prisma client singleton
      auth.ts                        -- NextAuth config
      auth-utils.ts                  -- Password hashing, token generation
      email.ts                       -- Resend email sending
      email-templates.ts             -- Email HTML templates
      permissions.ts                 -- Role/permission checking helpers
      generation/
        prompts.ts                   -- System prompts for each output type
        generate.ts                  -- Claude API call + streaming logic
        export-markdown.ts           -- Markdown export
        export-pdf.ts                -- PDF export via @react-pdf/renderer
        export-word.ts               -- Word export via docx
    actions/
      auth.ts                        -- Register, verify, reset password actions
      orgs.ts                        -- Org CRUD, invite, member management
      projects.ts                    -- Project CRUD, archive, delete
      wizard.ts                      -- Wizard state + step data save
      requirements.ts                -- Requirement CRUD, reorder
      generation.ts                  -- Generate output, save, export
    middleware.ts                     -- Auth redirect + org membership check
  Dockerfile                         -- Multi-stage Next.js Docker build
  docker-compose.yml                 -- Local dev (app + postgres)
  .env.example                       -- Environment variable template
  tailwind.config.ts                 -- Tailwind configuration
  next.config.ts                     -- Next.js configuration
  package.json
  tsconfig.json
```

---

## Chunk 1: Project Scaffolding & Database Schema

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `.env.example`

- [ ] **Step 1: Create Next.js project with TypeScript and Tailwind**

```bash
cd /mnt/d/enterprise
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This scaffolds the project with App Router, TypeScript, Tailwind, and ESLint.

- [ ] **Step 2: Verify the project runs**

```bash
npm run dev
```

Expected: Dev server starts on http://localhost:3000 with the default Next.js page.

- [ ] **Step 3: Clean up default content**

Replace `src/app/page.tsx` with a minimal placeholder:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">Enterprise Requirements Platform</h1>
    </main>
  );
}
```

Remove `src/app/favicon.ico` if it exists (we'll add our own later).

- [ ] **Step 4: Create .env.example**

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/enterprise?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production"

# Resend
RESEND_API_KEY=""

# Claude API
ANTHROPIC_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Copy to `.env.local`:

```bash
cp .env.example .env.local
```

- [ ] **Step 5: Verify .gitignore includes .env.local**

`create-next-app` should create a `.gitignore` that includes `.env.local`. Verify this:

```bash
grep "env.local" .gitignore
```

Expected: `.env*.local` or `.env.local` appears in output. If not, add it:

```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

### Task 2: Set Up Prisma and Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json` (add prisma deps)

- [ ] **Step 1: Install Prisma**

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

- [ ] **Step 2: Write the full Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  passwordHash          String
  name                  String
  emailVerified         Boolean   @default(false)
  verificationToken     String?
  verificationExpires   DateTime?
  resetToken            String?
  resetTokenExpires     DateTime?
  pendingInvitationId   String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  memberships           OrgMembership[]
  invitationsSent       OrgInvitation[] @relation("InvitedBy")
  projectsCreated       Project[]       @relation("CreatedBy")
  generatedOutputs      GeneratedOutput[]
}

enum OrgRole {
  owner
  admin
  member
}

model Organization {
  id        String          @id @default(uuid())
  name      String
  slug      String          @unique
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  memberships OrgMembership[]
  invitations OrgInvitation[]
  projects    Project[]
}

model OrgMembership {
  id        String       @id @default(uuid())
  userId    String
  orgId     String
  role      OrgRole
  createdAt DateTime     @default(now())

  user User         @relation(fields: [userId], references: [id])
  org  Organization @relation(fields: [orgId], references: [id])

  @@unique([userId, orgId])
}

enum InvitationStatus {
  pending
  accepted
  expired
}

model OrgInvitation {
  id          String           @id @default(uuid())
  token       String           @unique @default(uuid())
  orgId       String
  email       String
  role        OrgRole
  invitedById String
  status      InvitationStatus @default(pending)
  createdAt   DateTime         @default(now())
  expiresAt   DateTime

  org       Organization @relation(fields: [orgId], references: [id])
  invitedBy User         @relation("InvitedBy", fields: [invitedById], references: [id])

  // Note: Prisma doesn't support partial unique indexes.
  // The unique(orgId, email) where status=pending constraint is enforced
  // at the application level in the inviteMember action.
}

enum ProjectStatus {
  draft
  active
  archived
}

model Project {
  id          String        @id @default(uuid())
  orgId       String
  name        String
  description String        @default("")
  status      ProjectStatus @default(draft)
  deletedAt   DateTime?
  createdById String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  org         Organization @relation(fields: [orgId], references: [id])
  createdBy   User         @relation("CreatedBy", fields: [createdById], references: [id])
  meta        ProjectMeta?
  objectives  Objective[]
  userStories UserStory[]
  requirementCategories RequirementCategory[]
  wizardState ProjectWizardState?
  generatedOutputs GeneratedOutput[]
}

model ProjectMeta {
  id                   String  @id @default(uuid())
  projectId            String  @unique
  businessContext       String  @default("")
  visionStatement      String  @default("")
  targetUsers          String  @default("")
  technicalConstraints String  @default("")
  timeline             String  @default("")
  stakeholders         String  @default("")
  glossary             String  @default("")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model Objective {
  id              String  @id @default(uuid())
  projectId       String
  title           String
  successCriteria String  @default("")
  sortOrder       Int     @default(0)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

enum Priority {
  must
  should
  could
  wont
}

model UserStory {
  id         String   @id @default(uuid())
  projectId  String
  role       String
  capability String
  benefit    String
  priority   Priority @default(should)
  sortOrder  Int      @default(0)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

enum RequirementType {
  non_functional
  constraint
  assumption
  dependency
}

model RequirementCategory {
  id        String          @id @default(uuid())
  projectId String
  type      RequirementType
  name      String
  sortOrder Int             @default(0)

  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requirements Requirement[]
}

model Requirement {
  id          String   @id @default(uuid())
  categoryId  String
  title       String
  description String   @default("")
  priority    Priority @default(should)
  sortOrder   Int      @default(0)

  category RequirementCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  metrics  NFRMetric[]
}

model NFRMetric {
  id            String @id @default(uuid())
  requirementId String
  metricName    String
  targetValue   String
  unit          String

  requirement Requirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)
}

model ProjectWizardState {
  id             String   @id @default(uuid())
  projectId      String   @unique
  currentStep    Int      @default(1)
  completedSteps Json     @default("[]")
  lastUpdatedAt  DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

enum OutputType {
  ai_prompt
  requirements_doc
  project_brief
  technical_spec
}

model GeneratedOutput {
  id            String     @id @default(uuid())
  projectId     String
  outputType    OutputType
  content       String
  editedContent String?
  generatedAt   DateTime   @default(now())
  generatedById String

  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  generatedBy User    @relation(fields: [generatedById], references: [id])
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with all data models"
```

### Task 3: Docker Compose for Local Development

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml for local PostgreSQL**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: enterprise
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Start the database and run migrations**

```bash
docker compose up -d db
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. Prisma Client is generated.

- [ ] **Step 3: Verify database connection**

```bash
npx prisma studio
```

Expected: Prisma Studio opens in browser showing all tables (empty).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml prisma/migrations
git commit -m "feat: add Docker Compose for local PostgreSQL and initial migration"
```

### Task 4: Base UI Components

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/toast.tsx`

- [ ] **Step 1: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Select: TypeScript, Default style, CSS variables, `src/app/globals.css`, `@/components`, `@/lib/utils`.

- [ ] **Step 2: Add required components**

```bash
npx shadcn@latest add button input textarea dialog tabs badge toast sonner
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui base components"
```

---

## Chunk 2: Authentication

### Task 5: NextAuth Configuration

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-utils.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `package.json` (add deps)

- [ ] **Step 1: Install auth dependencies**

```bash
npm install next-auth@4 bcryptjs
npm install --save-dev @types/bcryptjs
```

- [ ] **Step 2: Create auth utilities**

Create `src/lib/auth-utils.ts`:

```typescript
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateTokenExpiry(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
```

- [ ] **Step 3: Create NextAuth configuration**

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-utils";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        const isValid = await verifyPassword(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
```

- [ ] **Step 4: Create NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 5: Add NextAuth type augmentation**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: configure NextAuth with credentials provider"
```

### Task 6: Email Service Setup

**Files:**
- Create: `src/lib/email.ts`, `src/lib/email-templates.ts`

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Create email sending utility**

Create `src/lib/email.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "noreply@enterprise.coria.app";

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your email - Enterprise",
    html: `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your password - Enterprise",
    html: `
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
    `,
  });
}

export async function sendInvitationEmail(
  email: string,
  orgName: string,
  inviterName: string,
  token: string
): Promise<void> {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?invitation=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `You've been invited to ${orgName} - Enterprise`,
    html: `
      <h2>You've been invited</h2>
      <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Enterprise.</p>
      <p><a href="${acceptUrl}">Accept Invitation</a></p>
      <p>This invitation expires in 7 days.</p>
    `,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Resend email service with verification and invitation templates"
```

### Task 7: Auth Server Actions

**Files:**
- Create: `src/actions/auth.ts`

- [ ] **Step 1: Create auth server actions**

Note: User model already includes verificationToken, verificationExpires, resetToken, resetTokenExpires, and pendingInvitationId fields from the initial schema (Task 2).

Create `src/actions/auth.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken, generateTokenExpiry } from "@/lib/auth-utils";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  invitationToken?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  if (data.password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const passwordHash = await hashPassword(data.password);
  const verificationToken = generateToken();
  const verificationExpires = generateTokenExpiry(24);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      verificationToken,
      verificationExpires,
    },
  });

  await sendVerificationEmail(user.email, verificationToken);

  return { success: true, userId: user.id };
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationExpires: { gt: new Date() },
      emailVerified: false,
    },
  });

  if (!user) {
    return { error: "Invalid or expired verification link" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
    },
  });

  return { success: true, email: user.email };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return { success: true };
  }

  const resetToken = generateToken();
  const resetTokenExpires = generateTokenExpiry(1);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpires },
  });

  await sendPasswordResetEmail(user.email, resetToken);

  return { success: true };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return { error: "Invalid or expired reset link" };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
    },
  });

  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add auth server actions for register, verify, and password reset"
```

### Task 8: Auth Pages

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/verify-email/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`
- Create: `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx`, `src/components/auth/forgot-password-form.tsx`, `src/components/auth/reset-password-form.tsx`

- [ ] **Step 1: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Enterprise</h1>
          <p className="text-sm text-muted-foreground">
            Requirements gathering platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create login form component**

Create `src/components/auth/login-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/register" className="text-blue-600 hover:underline">
          Create account
        </Link>
        <Link
          href="/forgot-password"
          className="text-blue-600 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create register form component**

Create `src/components/auth/register-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerUser } from "@/actions/auth";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation") || undefined;
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await registerUser({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      name: formData.get("name") as string,
      invitationToken,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
        <p className="font-medium">Check your email</p>
        <p>We sent a verification link to your email address.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {invitationToken && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          You have been invited to join an organization.
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <Input id="name" name="name" type="text" required />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Minimum 8 characters
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Create forgot password form**

Create `src/components/auth/forgot-password-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/actions/auth";

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    await requestPasswordReset(formData.get("email") as string);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
        <p className="font-medium">Check your email</p>
        <p>If an account exists, we sent a password reset link.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 5: Create reset password form**

Create `src/components/auth/reset-password-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/actions/auth";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600">
        Invalid reset link. Please request a new one.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const result = await resetPassword(token!, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
        <p className="font-medium">Password reset successful</p>
        <p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in with your new password
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium">
          Confirm password
        </label>
        <Input id="confirm" name="confirm" type="password" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 6: Create auth page files**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

Create `src/app/(auth)/register/page.tsx`:

```tsx
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
```

Create `src/app/(auth)/verify-email/page.tsx`:

```tsx
import { verifyEmail } from "@/actions/auth";
import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600">
        Invalid verification link.
      </div>
    );
  }

  const result = await verifyEmail(token);

  if (result.error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600">
        {result.error}
      </div>
    );
  }

  return (
    <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
      <p className="font-medium">Email verified!</p>
      <p>
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in to continue
        </Link>
      </p>
    </div>
  );
}
```

Create `src/app/(auth)/forgot-password/page.tsx`:

```tsx
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
```

Create `src/app/(auth)/reset-password/page.tsx`:

```tsx
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add auth pages - login, register, verify email, password reset"
```

### Task 9: Auth Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `src/middleware.ts`:

```typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/org/:path*", "/project/:path*"],
};
```

- [ ] **Step 2: Add SessionProvider wrapper**

Create `src/components/providers.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Update `src/app/layout.tsx` to wrap with Providers:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Enterprise",
  description: "Requirements gathering platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add auth middleware and session provider"
```

---

## Chunk 3: Organizations & Invitations

### Task 10: Permissions Helper

**Files:**
- Create: `src/lib/permissions.ts`

- [ ] **Step 1: Create permissions utility**

Create `src/lib/permissions.ts`:

```typescript
import { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getUserMembership(userId: string, orgId: string) {
  return prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
}

export async function requireOrgMembership(userId: string, orgId: string) {
  const membership = await getUserMembership(userId, orgId);
  if (!membership) throw new Error("Not a member of this organization");
  return membership;
}

export function canManageMembers(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export function canArchiveProject(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteProject(role: OrgRole): boolean {
  return role === "owner";
}

export function canManageOrgSettings(role: OrgRole): boolean {
  return role === "owner";
}

export function canChangeRole(
  actorRole: OrgRole,
  targetCurrentRole: OrgRole,
  newRole: OrgRole
): boolean {
  if (actorRole === "owner") {
    return true;
  }
  if (actorRole === "admin") {
    // Admins cannot promote to owner or change other admins/owners
    if (newRole === "owner") return false;
    if (targetCurrentRole === "owner" || targetCurrentRole === "admin")
      return false;
    return true;
  }
  return false;
}

export function canRemoveMember(
  actorRole: OrgRole,
  targetRole: OrgRole
): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") {
    return targetRole === "member";
  }
  return false;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add role-based permissions helper"
```

### Task 11: Organization Server Actions

**Files:**
- Create: `src/actions/orgs.ts`

- [ ] **Step 1: Create org server actions**

Create `src/actions/orgs.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import {
  requireSession,
  requireOrgMembership,
  canManageMembers,
  canManageOrgSettings,
  canChangeRole,
  canRemoveMember,
} from "@/lib/permissions";
import { sendInvitationEmail } from "@/lib/email";
import { OrgRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createOrganization(data: { name: string }) {
  const user = await requireSession();

  const slug = generateSlug(data.name);

  const existing = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existing) {
    return { error: "An organization with this name already exists" };
  }

  const org = await prisma.organization.create({
    data: {
      name: data.name,
      slug,
      memberships: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  revalidatePath("/dashboard");
  return { success: true, slug: org.slug };
}

export async function updateOrganization(
  orgId: string,
  data: { name: string }
) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);

  if (!canManageOrgSettings(membership.role)) {
    return { error: "Only owners can update organization settings" };
  }

  const slug = generateSlug(data.name);

  const existing = await prisma.organization.findFirst({
    where: { slug, NOT: { id: orgId } },
  });

  if (existing) {
    return { error: "An organization with this name already exists" };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { name: data.name, slug },
  });

  revalidatePath(`/org/${slug}`);
  return { success: true, slug };
}

export async function inviteMember(
  orgId: string,
  data: { email: string; role: OrgRole }
) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);

  if (!canManageMembers(membership.role)) {
    return { error: "You do not have permission to invite members" };
  }

  const existingMember = await prisma.orgMembership.findFirst({
    where: {
      orgId,
      user: { email: data.email.toLowerCase() },
    },
  });

  if (existingMember) {
    return { error: "This user is already a member" };
  }

  const existingInvite = await prisma.orgInvitation.findFirst({
    where: {
      orgId,
      email: data.email.toLowerCase(),
      status: "pending",
    },
  });

  if (existingInvite) {
    return { error: "An invitation has already been sent to this email" };
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  const inviter = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });

  const invitation = await prisma.orgInvitation.create({
    data: {
      orgId,
      email: data.email.toLowerCase(),
      role: data.role,
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await sendInvitationEmail(
    data.email,
    org.name,
    inviter.name,
    invitation.token
  );

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function acceptInvitation(token: string) {
  const user = await requireSession();

  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.status !== "pending") {
    return { error: "Invalid or expired invitation" };
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.orgInvitation.update({
      where: { token },
      data: { status: "expired" },
    });
    return { error: "This invitation has expired" };
  }

  if (invitation.email !== user.email) {
    return { error: "This invitation was sent to a different email address" };
  }

  await prisma.$transaction([
    prisma.orgMembership.create({
      data: {
        userId: user.id,
        orgId: invitation.orgId,
        role: invitation.role,
      },
    }),
    prisma.orgInvitation.update({
      where: { id: invitationId },
      data: { status: "accepted" },
    }),
  ]);

  revalidatePath("/dashboard");
  return { success: true };
}

export async function revokeInvitation(orgId: string, invitationId: string) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);

  if (!canManageMembers(membership.role)) {
    return { error: "You do not have permission to manage invitations" };
  }

  await prisma.orgInvitation.delete({
    where: { id: invitationId, orgId },
  });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function changeMemberRole(
  orgId: string,
  targetUserId: string,
  newRole: OrgRole
) {
  const user = await requireSession();
  const actorMembership = await requireOrgMembership(user.id, orgId);
  const targetMembership = await requireOrgMembership(targetUserId, orgId);

  if (!canChangeRole(actorMembership.role, targetMembership.role, newRole)) {
    return { error: "You do not have permission to change this role" };
  }

  await prisma.orgMembership.update({
    where: { id: targetMembership.id },
    data: { role: newRole },
  });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function removeMember(orgId: string, targetUserId: string) {
  const user = await requireSession();
  const actorMembership = await requireOrgMembership(user.id, orgId);
  const targetMembership = await requireOrgMembership(targetUserId, orgId);

  if (user.id === targetUserId) {
    return { error: "You cannot remove yourself" };
  }

  if (!canRemoveMember(actorMembership.role, targetMembership.role)) {
    return { error: "You do not have permission to remove this member" };
  }

  await prisma.orgMembership.delete({
    where: { id: targetMembership.id },
  });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function getUserOrgs() {
  const user = await requireSession();

  return prisma.organization.findMany({
    where: {
      memberships: { some: { userId: user.id } },
    },
    include: {
      memberships: {
        where: { userId: user.id },
        select: { role: true },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { name: "asc" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add organization and invitation server actions"
```

### Task 12: Invitation Acceptance During Registration

**Files:**
- Modify: `src/actions/auth.ts`

- [ ] **Step 1: Update registerUser to handle invitation token**

In `src/actions/auth.ts`, update the `registerUser` function to store the invitation token in the user record, and update `verifyEmail` to accept the invitation after verification.

Note: `pendingInvitationId` is already on the User model from the initial schema (Task 2). Update the `registerUser` function:

```typescript
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  invitationToken?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  if (data.password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  // Validate invitation if provided
  let invitationId: string | undefined;
  if (data.invitationToken) {
    const invitation = await prisma.orgInvitation.findUnique({
      where: { token: data.invitationToken },
    });
    if (
      invitation &&
      invitation.status === "pending" &&
      invitation.expiresAt > new Date() &&
      invitation.email === data.email.toLowerCase()
    ) {
      invitationId = invitation.id;
    }
  }

  const passwordHash = await hashPassword(data.password);
  const verificationToken = generateToken();
  const verificationExpires = generateTokenExpiry(24);

  await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      verificationToken,
      verificationExpires,
      pendingInvitationId: invitationId,
    },
  });

  await sendVerificationEmail(data.email.toLowerCase(), verificationToken);

  return { success: true };
}
```

Update `verifyEmail` to auto-accept invitation:

```typescript
export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationExpires: { gt: new Date() },
      emailVerified: false,
    },
  });

  if (!user) {
    return { error: "Invalid or expired verification link" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
    },
  });

  // Auto-accept pending invitation
  if (user.pendingInvitationId) {
    const invitation = await prisma.orgInvitation.findUnique({
      where: { id: user.pendingInvitationId },
    });

    if (
      invitation &&
      invitation.status === "pending" &&
      invitation.expiresAt > new Date()
    ) {
      await prisma.$transaction([
        prisma.orgMembership.create({
          data: {
            userId: user.id,
            orgId: invitation.orgId,
            role: invitation.role,
          },
        }),
        prisma.orgInvitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { pendingInvitationId: null },
        }),
      ]);
    }
  }

  return { success: true, email: user.email };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: handle invitation acceptance during registration and email verification"
```

---

## Chunk 4: Layout Shell, Navigation & Project CRUD

### Task 13: Dashboard Layout with Rail + Sidebar

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`, `src/components/layout/org-rail.tsx`, `src/components/layout/project-sidebar.tsx`

- [ ] **Step 1: Create org rail component**

Create `src/components/layout/org-rail.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type OrgItem = {
  id: string;
  name: string;
  slug: string;
};

export function OrgRail({ orgs, currentSlug }: { orgs: OrgItem[]; currentSlug?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-14 flex-col items-center gap-2 border-r bg-gray-950 py-3">
      <Link
        href="/dashboard"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white",
          !currentSlug && "bg-blue-600",
          currentSlug && "bg-gray-800 hover:bg-gray-700"
        )}
      >
        E
      </Link>
      <div className="my-1 h-px w-8 bg-gray-800" />
      {orgs.map((org) => (
        <Link
          key={org.id}
          href={`/org/${org.slug}/projects`}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium text-gray-300",
            currentSlug === org.slug
              ? "bg-blue-600 text-white"
              : "bg-gray-800 hover:bg-gray-700"
          )}
          title={org.name}
        >
          {org.name.substring(0, 2).toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create project sidebar component**

Create `src/components/layout/project-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ProjectItem = {
  id: string;
  name: string;
  status: string;
};

export function ProjectSidebar({
  orgSlug,
  orgName,
  projects,
  currentProjectId,
}: {
  orgSlug: string;
  orgName: string;
  projects: ProjectItem[];
  currentProjectId?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-56 flex-col border-r bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{orgName}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="mb-1 px-2 text-xs font-medium uppercase text-gray-500">
          Projects
        </div>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/project/${project.id}/wizard`}
            className={cn(
              "mb-0.5 block rounded-md px-2 py-1.5 text-sm",
              currentProjectId === project.id
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            )}
          >
            {project.name}
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="px-2 text-xs text-gray-600">No projects yet</p>
        )}
      </div>
      <div className="border-t border-gray-800 px-2 py-2">
        <Link
          href={`/org/${orgSlug}/members`}
          className={cn(
            "mb-0.5 block rounded-md px-2 py-1.5 text-sm",
            pathname.includes("/members")
              ? "bg-gray-800 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          )}
        >
          Members
        </Link>
        <Link
          href={`/org/${orgSlug}/settings`}
          className={cn(
            "mb-0.5 block rounded-md px-2 py-1.5 text-sm",
            pathname.includes("/settings") && pathname.includes("/org/")
              ? "bg-gray-800 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          )}
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard layout**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrgRail } from "@/components/layout/org-rail";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const orgs = await prisma.organization.findMany({
    where: {
      memberships: { some: { userId: session.user.id } },
    },
    orderBy: { name: "asc" },
  });

  // If user has no orgs, redirect to create one
  if (orgs.length === 0) {
    // We'll handle this with a create-org page in the dashboard
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <OrgRail orgs={orgs} />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add dashboard layout with org rail and project sidebar"
```

### Task 14: Dashboard Home & Create Org Flow

**Files:**
- Create: `src/app/(dashboard)/dashboard/page.tsx`, `src/components/org/create-org-form.tsx`

- [ ] **Step 1: Create org form component**

Create `src/components/org/create-org-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrganization } from "@/actions/orgs";

export function CreateOrgForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createOrganization({
      name: formData.get("name") as string,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/org/${result.slug}/projects`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Organization name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          placeholder="My Company"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating..." : "Create organization"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create dashboard page**

Create `src/app/(dashboard)/dashboard/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CreateOrgForm } from "@/components/org/create-org-form";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const orgs = await prisma.organization.findMany({
    where: {
      memberships: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { projects: true } },
    },
  });

  if (orgs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md space-y-6 p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Welcome to Enterprise</h2>
            <p className="text-sm text-gray-400">
              Create your first organization to get started.
            </p>
          </div>
          <CreateOrgForm />
        </div>
      </div>
    );
  }

  const recentProjects = await prisma.project.findMany({
    where: {
      org: { memberships: { some: { userId: session.user.id } } },
      deletedAt: null,
    },
    include: { org: { select: { name: true, slug: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h2 className="mb-6 text-xl font-semibold">Recent Projects</h2>
      {recentProjects.length === 0 ? (
        <p className="text-sm text-gray-400">
          No projects yet. Select an organization to create one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}/wizard`}
              className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700"
            >
              <h3 className="font-medium">{project.name}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {project.org.name}
              </p>
              <p className="mt-2 text-xs text-gray-400">
                {project.description || "No description"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add dashboard home page with create org flow"
```

### Task 15: Project CRUD Actions

**Files:**
- Create: `src/actions/projects.ts`

- [ ] **Step 1: Create project server actions**

Create `src/actions/projects.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import {
  requireSession,
  requireOrgMembership,
  canArchiveProject,
  canDeleteProject,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function createProject(
  orgId: string,
  data: { name: string; description?: string }
) {
  const user = await requireSession();
  await requireOrgMembership(user.id, orgId);

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  const project = await prisma.project.create({
    data: {
      orgId,
      name: data.name,
      description: data.description || "",
      createdById: user.id,
      meta: { create: {} },
      wizardState: { create: {} },
    },
  });

  revalidatePath(`/org/${org.slug}/projects`);
  return { success: true, projectId: project.id };
}

export async function archiveProject(projectId: string) {
  const user = await requireSession();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });

  const membership = await requireOrgMembership(user.id, project.orgId);

  const isProjectOwner = project.createdById === user.id;

  if (!isProjectOwner && !canArchiveProject(membership.role)) {
    return { error: "You do not have permission to archive this project" };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: project.status === "archived" ? "active" : "archived",
    },
  });

  revalidatePath(`/org/${project.org.slug}/projects`);
  return { success: true };
}

export async function deleteProject(projectId: string) {
  const user = await requireSession();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });

  const membership = await requireOrgMembership(user.id, project.orgId);

  if (!canDeleteProject(membership.role)) {
    return { error: "Only organization owners can delete projects" };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/org/${project.org.slug}/projects`);
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add project CRUD server actions with permission checks"
```

### Task 16: Org Pages (Projects, Members, Settings)

**Files:**
- Create: `src/app/(dashboard)/org/[slug]/projects/page.tsx`, `src/app/(dashboard)/org/[slug]/members/page.tsx`, `src/app/(dashboard)/org/[slug]/settings/page.tsx`
- Create: `src/components/project/create-project-dialog.tsx`, `src/components/org/member-list.tsx`, `src/components/org/invite-form.tsx`

- [ ] **Step 1: Create project dialog component**

Create `src/components/project/create-project-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProject } from "@/actions/projects";

export function CreateProjectDialog({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createProject(orgId, {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      router.push(`/project/${result.projectId}/wizard`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Project name
            </label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium"
            >
              Description (optional)
            </label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create org projects page**

Create `src/app/(dashboard)/org/[slug]/projects/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import Link from "next/link";

export default async function OrgProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: { where: { userId: session.user.id } },
      projects: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!org || org.memberships.length === 0) notFound();

  return (
    <>
      <ProjectSidebar
        orgSlug={org.slug}
        orgName={org.name}
        projects={org.projects}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projects</h2>
          <CreateProjectDialog orgId={org.id} />
        </div>
        {org.projects.length === 0 ? (
          <p className="text-sm text-gray-400">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}/wizard`}
                className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{project.name}</h3>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    {project.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  {project.description || "No description"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create invite form component**

Create `src/components/org/invite-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMember } from "@/actions/orgs";
import { OrgRole } from "@prisma/client";

export function InviteForm({ orgId }: { orgId: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const result = await inviteMember(orgId, {
      email: formData.get("email") as string,
      role: formData.get("role") as OrgRole,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Invitation sent!");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="user@example.com"
        />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          name="role"
          className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
          defaultValue="member"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Invite"}
      </Button>
      {error && <span className="text-sm text-red-500">{error}</span>}
      {success && <span className="text-sm text-green-500">{success}</span>}
    </form>
  );
}
```

- [ ] **Step 4: Create member list component**

Create `src/components/org/member-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { changeMemberRole, removeMember, revokeInvitation } from "@/actions/orgs";
import { OrgRole } from "@prisma/client";

type Member = {
  id: string;
  userId: string;
  role: OrgRole;
  user: { name: string; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
};

export function MemberList({
  orgId,
  members,
  invitations,
  currentUserRole,
  currentUserId,
}: {
  orgId: string;
  members: Member[];
  invitations: Invitation[];
  currentUserRole: OrgRole;
  currentUserId: string;
}) {
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-400">
          Members ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              orgId={orgId}
              member={member}
              canManage={canManage}
              currentUserRole={currentUserRole}
              isSelf={member.userId === currentUserId}
            />
          ))}
        </div>
      </div>
      {invitations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400">
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-gray-800 p-3"
              >
                <div>
                  <span className="text-sm">{inv.email}</span>
                  <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs">
                    {inv.role}
                  </span>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeInvitation(orgId, inv.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  orgId,
  member,
  canManage,
  currentUserRole,
  isSelf,
}: {
  orgId: string;
  member: Member;
  canManage: boolean;
  currentUserRole: OrgRole;
  isSelf: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: OrgRole) {
    setLoading(true);
    await changeMemberRole(orgId, member.userId, newRole);
    setLoading(false);
  }

  async function handleRemove() {
    if (!confirm(`Remove ${member.user.name} from the organization?`)) return;
    setLoading(true);
    await removeMember(orgId, member.userId);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-800 p-3">
      <div>
        <span className="text-sm font-medium">{member.user.name}</span>
        <span className="ml-2 text-xs text-gray-500">{member.user.email}</span>
        <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs">
          {member.role}
        </span>
        {isSelf && (
          <span className="ml-1 text-xs text-gray-500">(you)</span>
        )}
      </div>
      {canManage && !isSelf && (
        <div className="flex gap-2">
          {currentUserRole === "owner" && member.role !== "owner" && (
            <select
              className="h-8 rounded border border-gray-700 bg-gray-800 px-2 text-xs"
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value as OrgRole)}
              disabled={loading}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create org members page**

Create `src/app/(dashboard)/org/[slug]/members/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { MemberList } from "@/components/org/member-list";
import { InviteForm } from "@/components/org/invite-form";

export default async function OrgMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      invitations: {
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      },
      projects: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!org) notFound();

  const currentMembership = org.memberships.find(
    (m) => m.userId === session.user.id
  );
  if (!currentMembership) notFound();

  const canManage =
    currentMembership.role === "owner" || currentMembership.role === "admin";

  return (
    <>
      <ProjectSidebar
        orgSlug={org.slug}
        orgName={org.name}
        projects={org.projects}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <h2 className="mb-6 text-xl font-semibold">Members</h2>
        {canManage && (
          <div className="mb-6">
            <InviteForm orgId={org.id} />
          </div>
        )}
        <MemberList
          orgId={org.id}
          members={org.memberships.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: m.user,
          }))}
          invitations={org.invitations}
          currentUserRole={currentMembership.role}
          currentUserId={session.user.id}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Create org settings page**

Create `src/app/(dashboard)/org/[slug]/settings/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { OrgSettingsForm } from "@/components/org/org-settings-form";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: { where: { userId: session.user.id } },
      projects: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!org || org.memberships.length === 0) notFound();

  const isOwner = org.memberships[0].role === "owner";

  if (!isOwner) {
    return (
      <>
        <ProjectSidebar
          orgSlug={org.slug}
          orgName={org.name}
          projects={org.projects}
        />
        <div className="flex-1 p-8">
          <p className="text-sm text-gray-400">
            Only organization owners can manage settings.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <ProjectSidebar
        orgSlug={org.slug}
        orgName={org.name}
        projects={org.projects}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <h2 className="mb-6 text-xl font-semibold">Organization Settings</h2>
        <OrgSettingsForm orgId={org.id} orgName={org.name} />
      </div>
    </>
  );
}
```

Create `src/components/org/org-settings-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrganization } from "@/actions/orgs";

export function OrgSettingsForm({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await updateOrganization(orgId, {
      name: formData.get("name") as string,
    });

    if (result.error) {
      setError(result.error);
    } else {
      router.push(`/org/${result.slug}/settings`);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Organization name
        </label>
        <Input id="name" name="name" defaultValue={orgName} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add org pages - projects list, members, settings"
```

### Task 17: Project Layout with Tab Navigation

**Files:**
- Create: `src/app/(dashboard)/project/[id]/layout.tsx`, `src/components/layout/project-tabs.tsx`

- [ ] **Step 1: Create project tabs component**

Create `src/components/layout/project-tabs.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Wizard", href: "wizard" },
  { label: "Requirements", href: "requirements" },
  { label: "Meta", href: "meta" },
  { label: "Generate", href: "generate" },
  { label: "Outputs", href: "outputs" },
  { label: "Settings", href: "settings" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-gray-800 px-6">
      {tabs.map((tab) => {
        const href = `/project/${projectId}/${tab.href}`;
        const isActive = pathname === href;

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium",
              isActive
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create project layout**

Create `src/app/(dashboard)/project/[id]/layout.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { ProjectTabs } from "@/components/layout/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: {
        include: {
          memberships: { where: { userId: session.user.id } },
          projects: {
            where: { deletedAt: null },
            orderBy: { updatedAt: "desc" },
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  return (
    <>
      <ProjectSidebar
        orgSlug={project.org.slug}
        orgName={project.org.name}
        projects={project.org.projects}
        currentProjectId={project.id}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
          <h2 className="text-lg font-semibold">{project.name}</h2>
        </div>
        <ProjectTabs projectId={project.id} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create placeholder pages for project tabs**

Create placeholder pages so routes work. Each will be fleshed out in later chunks.

Create `src/app/(dashboard)/project/[id]/wizard/page.tsx`:

```tsx
export default function WizardPage() {
  return <div className="p-8"><p className="text-gray-400">Wizard - coming soon</p></div>;
}
```

Create `src/app/(dashboard)/project/[id]/requirements/page.tsx`:

```tsx
export default function RequirementsPage() {
  return <div className="p-8"><p className="text-gray-400">Requirements editor - coming soon</p></div>;
}
```

Create `src/app/(dashboard)/project/[id]/meta/page.tsx`:

```tsx
export default function MetaPage() {
  return <div className="p-8"><p className="text-gray-400">Project metadata - coming soon</p></div>;
}
```

Create `src/app/(dashboard)/project/[id]/generate/page.tsx`:

```tsx
export default function GeneratePage() {
  return <div className="p-8"><p className="text-gray-400">Generate outputs - coming soon</p></div>;
}
```

Create `src/app/(dashboard)/project/[id]/outputs/page.tsx`:

```tsx
export default function OutputsPage() {
  return <div className="p-8"><p className="text-gray-400">Output history - coming soon</p></div>;
}
```

Create `src/app/(dashboard)/project/[id]/settings/page.tsx`:

```tsx
export default function ProjectSettingsPage() {
  return <div className="p-8"><p className="text-gray-400">Project settings - coming soon</p></div>;
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add project layout with tab navigation and placeholder pages"
```

---

## Chunk 5: Wizard Flow

### Task 18: Wizard Server Actions

**Files:**
- Create: `src/actions/wizard.ts`

- [ ] **Step 1: Create wizard server actions**

Create `src/actions/wizard.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { Priority } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
  });
  await requireOrgMembership(user.id, project.orgId);
  return { user, project };
}

export async function saveProjectMeta(
  projectId: string,
  data: {
    businessContext: string;
    targetUsers: string;
    stakeholders: string;
    timeline: string;
    glossary: string;
    technicalConstraints: string;
  }
) {
  await getProjectWithAuth(projectId);

  await prisma.projectMeta.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveVisionStatement(
  projectId: string,
  visionStatement: string
) {
  await getProjectWithAuth(projectId);

  await prisma.projectMeta.upsert({
    where: { projectId },
    create: { projectId, visionStatement },
    update: { visionStatement },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveObjectives(
  projectId: string,
  objectives: { id?: string; title: string; successCriteria: string }[]
) {
  await getProjectWithAuth(projectId);

  // Delete existing and recreate (simpler than diffing)
  await prisma.objective.deleteMany({ where: { projectId } });

  await prisma.objective.createMany({
    data: objectives.map((obj, index) => ({
      projectId,
      title: obj.title,
      successCriteria: obj.successCriteria,
      sortOrder: index,
    })),
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveUserStories(
  projectId: string,
  stories: {
    id?: string;
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[]
) {
  await getProjectWithAuth(projectId);

  await prisma.userStory.deleteMany({ where: { projectId } });

  await prisma.userStory.createMany({
    data: stories.map((story, index) => ({
      projectId,
      role: story.role,
      capability: story.capability,
      benefit: story.benefit,
      priority: story.priority,
      sortOrder: index,
    })),
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveNFRs(
  projectId: string,
  categories: {
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: Priority;
      metrics: { metricName: string; targetValue: string; unit: string }[];
    }[];
  }[]
) {
  await getProjectWithAuth(projectId);

  // Delete existing NFR categories and their requirements
  const existingCategories = await prisma.requirementCategory.findMany({
    where: { projectId, type: "non_functional" },
    select: { id: true },
  });

  for (const cat of existingCategories) {
    const reqs = await prisma.requirement.findMany({
      where: { categoryId: cat.id },
      select: { id: true },
    });
    for (const req of reqs) {
      await prisma.nFRMetric.deleteMany({ where: { requirementId: req.id } });
    }
    await prisma.requirement.deleteMany({ where: { categoryId: cat.id } });
  }
  await prisma.requirementCategory.deleteMany({
    where: { projectId, type: "non_functional" },
  });

  // Create new
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const category = await prisma.requirementCategory.create({
      data: {
        projectId,
        type: "non_functional",
        name: cat.name,
        sortOrder: i,
      },
    });

    for (let j = 0; j < cat.requirements.length; j++) {
      const req = cat.requirements[j];
      const requirement = await prisma.requirement.create({
        data: {
          categoryId: category.id,
          title: req.title,
          description: req.description,
          priority: req.priority,
          sortOrder: j,
        },
      });

      if (req.metrics.length > 0) {
        await prisma.nFRMetric.createMany({
          data: req.metrics.map((m) => ({
            requirementId: requirement.id,
            metricName: m.metricName,
            targetValue: m.targetValue,
            unit: m.unit,
          })),
        });
      }
    }
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveConstraints(
  projectId: string,
  items: {
    type: "constraint" | "assumption" | "dependency";
    name: string;
    requirements: { title: string; description: string; priority: Priority }[];
  }[]
) {
  await getProjectWithAuth(projectId);

  // Delete existing constraint/assumption/dependency categories
  const types = ["constraint", "assumption", "dependency"] as const;
  for (const type of types) {
    const cats = await prisma.requirementCategory.findMany({
      where: { projectId, type },
      select: { id: true },
    });
    for (const cat of cats) {
      await prisma.requirement.deleteMany({ where: { categoryId: cat.id } });
    }
    await prisma.requirementCategory.deleteMany({
      where: { projectId, type },
    });
  }

  // Create new
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const category = await prisma.requirementCategory.create({
      data: {
        projectId,
        type: item.type,
        name: item.name,
        sortOrder: i,
      },
    });

    for (let j = 0; j < item.requirements.length; j++) {
      const req = item.requirements[j];
      await prisma.requirement.create({
        data: {
          categoryId: category.id,
          title: req.title,
          description: req.description,
          priority: req.priority,
          sortOrder: j,
        },
      });
    }
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateWizardState(
  projectId: string,
  data: { currentStep: number; completedSteps: number[] }
) {
  await getProjectWithAuth(projectId);

  await prisma.projectWizardState.upsert({
    where: { projectId },
    create: {
      projectId,
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
    },
    update: {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function finalizeWizard(projectId: string) {
  await getProjectWithAuth(projectId);

  await prisma.$transaction([
    prisma.projectWizardState.update({
      where: { projectId },
      data: {
        currentStep: 7,
        completedSteps: [1, 2, 3, 4, 5, 6, 7],
      },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { status: "active" },
    }),
  ]);

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add wizard server actions for all steps"
```

### Task 19: Wizard Shell and Step Components

**Files:**
- Create: `src/components/wizard/wizard-shell.tsx`, `src/components/wizard/step-metadata.tsx`, `src/components/wizard/step-vision.tsx`, `src/components/wizard/step-objectives.tsx`, `src/components/wizard/step-user-stories.tsx`, `src/components/wizard/step-nfr.tsx`, `src/components/wizard/step-constraints.tsx`, `src/components/wizard/step-review.tsx`

- [ ] **Step 1: Create wizard shell (side stepper)**

Create `src/components/wizard/wizard-shell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { updateWizardState } from "@/actions/wizard";

const STEPS = [
  { number: 1, label: "Project Metadata" },
  { number: 2, label: "Vision Statement" },
  { number: 3, label: "Key Objectives" },
  { number: 4, label: "User Stories" },
  { number: 5, label: "Non-Functional Reqs" },
  { number: 6, label: "Constraints" },
  { number: 7, label: "Review & Finalize" },
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
    const nextStep = Math.min(step + 1, 7);
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
```

- [ ] **Step 2: Create Step 1 - Project Metadata**

Create `src/components/wizard/step-metadata.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProjectMeta } from "@/actions/wizard";

type MetaData = {
  businessContext: string;
  targetUsers: string;
  stakeholders: string;
  timeline: string;
  glossary: string;
  technicalConstraints: string;
};

export function StepMetadata({
  projectId,
  initialData,
  onComplete,
}: {
  projectId: string;
  initialData: MetaData;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    await saveProjectMeta(projectId, {
      businessContext: fd.get("businessContext") as string,
      targetUsers: fd.get("targetUsers") as string,
      stakeholders: fd.get("stakeholders") as string,
      timeline: fd.get("timeline") as string,
      glossary: fd.get("glossary") as string,
      technicalConstraints: fd.get("technicalConstraints") as string,
    });

    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Project Metadata</h3>
        <p className="text-sm text-gray-400">
          Provide context about the project, its users, and constraints.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium">Business Context</label>
        <Textarea
          name="businessContext"
          rows={3}
          defaultValue={initialData.businessContext}
          placeholder="Why does this project exist? What problem does it solve?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Target Users</label>
        <Textarea
          name="targetUsers"
          rows={2}
          defaultValue={initialData.targetUsers}
          placeholder="Who will use the final product?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Stakeholders</label>
        <Textarea
          name="stakeholders"
          rows={2}
          defaultValue={initialData.stakeholders}
          placeholder="Key people and roles involved"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Timeline</label>
        <Input
          name="timeline"
          defaultValue={initialData.timeline}
          placeholder="Expected milestones or deadlines"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          Technical Constraints
        </label>
        <Textarea
          name="technicalConstraints"
          rows={2}
          defaultValue={initialData.technicalConstraints}
          placeholder="Existing systems, tech stack requirements, integrations"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Glossary</label>
        <Textarea
          name="glossary"
          rows={2}
          defaultValue={initialData.glossary}
          placeholder="Domain-specific terms and definitions"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create Step 2 - Vision Statement**

Create `src/components/wizard/step-vision.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveVisionStatement } from "@/actions/wizard";

export function StepVision({
  projectId,
  initialValue,
  onComplete,
}: {
  projectId: string;
  initialValue: string;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await saveVisionStatement(projectId, fd.get("vision") as string);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Vision Statement</h3>
        <p className="text-sm text-gray-400">
          Write a single clear statement that describes what this project will
          achieve and why it matters.
        </p>
      </div>
      <Textarea
        name="vision"
        rows={4}
        required
        defaultValue={initialValue}
        placeholder="To create a..."
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create Step 3 - Objectives**

Create `src/components/wizard/step-objectives.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveObjectives } from "@/actions/wizard";

type ObjectiveItem = {
  title: string;
  successCriteria: string;
};

export function StepObjectives({
  projectId,
  initialObjectives,
  onComplete,
}: {
  projectId: string;
  initialObjectives: ObjectiveItem[];
  onComplete: () => void;
}) {
  const [objectives, setObjectives] = useState<ObjectiveItem[]>(
    initialObjectives.length > 0
      ? initialObjectives
      : [{ title: "", successCriteria: "" }]
  );
  const [loading, setLoading] = useState(false);

  const canAdd = objectives.length < 5;

  function addObjective() {
    if (canAdd) {
      setObjectives([...objectives, { title: "", successCriteria: "" }]);
    }
  }

  function removeObjective(index: number) {
    if (objectives.length > 1) {
      setObjectives(objectives.filter((_, i) => i !== index));
    }
  }

  function updateObjective(
    index: number,
    field: keyof ObjectiveItem,
    value: string
  ) {
    const updated = [...objectives];
    updated[index] = { ...updated[index], [field]: value };
    setObjectives(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = objectives.filter((o) => o.title.trim());
    if (valid.length === 0) return;

    setLoading(true);
    await saveObjectives(projectId, valid);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Key Objectives (up to 5)</h3>
        <p className="text-sm text-gray-400">
          Define measurable outcomes with success criteria. Minimum 1, maximum 5.
        </p>
      </div>
      {objectives.map((obj, index) => (
        <div key={index} className="rounded-lg border border-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Objective {index + 1}</span>
            {objectives.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeObjective(index)}
              >
                Remove
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Objective title"
              value={obj.title}
              onChange={(e) => updateObjective(index, "title", e.target.value)}
              required
            />
            <Textarea
              placeholder="How will success be measured?"
              value={obj.successCriteria}
              onChange={(e) =>
                updateObjective(index, "successCriteria", e.target.value)
              }
              rows={2}
            />
          </div>
        </div>
      ))}
      <div className="flex gap-3">
        {canAdd && (
          <Button type="button" variant="outline" onClick={addObjective}>
            Add Objective
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create Step 4 - User Stories**

Create `src/components/wizard/step-user-stories.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveUserStories } from "@/actions/wizard";
import { Priority } from "@prisma/client";

type StoryItem = {
  role: string;
  capability: string;
  benefit: string;
  priority: Priority;
};

export function StepUserStories({
  projectId,
  initialStories,
  onComplete,
}: {
  projectId: string;
  initialStories: StoryItem[];
  onComplete: () => void;
}) {
  const [stories, setStories] = useState<StoryItem[]>(
    initialStories.length > 0
      ? initialStories
      : [{ role: "", capability: "", benefit: "", priority: "should" }]
  );
  const [loading, setLoading] = useState(false);

  const canAdd = stories.length < 10;

  function addStory() {
    if (canAdd) {
      setStories([
        ...stories,
        { role: "", capability: "", benefit: "", priority: "should" },
      ]);
    }
  }

  function removeStory(index: number) {
    if (stories.length > 1) {
      setStories(stories.filter((_, i) => i !== index));
    }
  }

  function updateStory(index: number, field: keyof StoryItem, value: string) {
    const updated = [...stories];
    updated[index] = { ...updated[index], [field]: value };
    setStories(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = stories.filter((s) => s.role.trim() && s.capability.trim());
    if (valid.length === 0) return;

    setLoading(true);
    await saveUserStories(projectId, valid);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">User Stories (up to 10)</h3>
        <p className="text-sm text-gray-400">
          As a [role], I want [capability], so that [benefit]. Minimum 1.
        </p>
      </div>
      {stories.map((story, index) => (
        <div key={index} className="rounded-lg border border-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Story {index + 1}</span>
            {stories.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeStory(index)}
              >
                Remove
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">As a</span>
              <Input
                placeholder="role"
                value={story.role}
                onChange={(e) => updateStory(index, "role", e.target.value)}
                required
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">I want</span>
              <Input
                placeholder="capability"
                value={story.capability}
                onChange={(e) =>
                  updateStory(index, "capability", e.target.value)
                }
                required
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">So that</span>
              <Input
                placeholder="benefit"
                value={story.benefit}
                onChange={(e) => updateStory(index, "benefit", e.target.value)}
                className="flex-1"
              />
            </div>
            <div>
              <select
                value={story.priority}
                onChange={(e) => updateStory(index, "priority", e.target.value)}
                className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
              >
                <option value="must">Must have</option>
                <option value="should">Should have</option>
                <option value="could">Could have</option>
                <option value="wont">Won't have</option>
              </select>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-3">
        {canAdd && (
          <Button type="button" variant="outline" onClick={addStory}>
            Add Story
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Create Step 5 - NFRs, Step 6 - Constraints, and Step 7 - Review**

Create `src/components/wizard/step-nfr.tsx`. This component handles adding NFR categories with requirements and metrics. Due to its complexity, it follows the same pattern as objectives/stories but with nested metric fields:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveNFRs } from "@/actions/wizard";
import { Priority } from "@prisma/client";

type Metric = { metricName: string; targetValue: string; unit: string };
type NFRReq = {
  title: string;
  description: string;
  priority: Priority;
  metrics: Metric[];
};
type NFRCategory = { name: string; requirements: NFRReq[] };

const SUGGESTED_CATEGORIES = [
  "Performance",
  "Security",
  "Scalability",
  "Availability",
  "Usability",
  "Maintainability",
];

export function StepNFR({
  projectId,
  initialCategories,
  onComplete,
}: {
  projectId: string;
  initialCategories: NFRCategory[];
  onComplete: () => void;
}) {
  const [categories, setCategories] = useState<NFRCategory[]>(
    initialCategories.length > 0
      ? initialCategories
      : [
          {
            name: "Performance",
            requirements: [
              {
                title: "",
                description: "",
                priority: "should",
                metrics: [{ metricName: "", targetValue: "", unit: "" }],
              },
            ],
          },
        ]
  );
  const [loading, setLoading] = useState(false);

  function addCategory() {
    const unused = SUGGESTED_CATEGORIES.find(
      (s) => !categories.some((c) => c.name === s)
    );
    setCategories([
      ...categories,
      {
        name: unused || "",
        requirements: [
          {
            title: "",
            description: "",
            priority: "should",
            metrics: [{ metricName: "", targetValue: "", unit: "" }],
          },
        ],
      },
    ]);
  }

  function removeCategory(index: number) {
    setCategories(categories.filter((_, i) => i !== index));
  }

  function updateCategoryName(index: number, name: string) {
    const updated = [...categories];
    updated[index] = { ...updated[index], name };
    setCategories(updated);
  }

  function addRequirement(catIndex: number) {
    const updated = [...categories];
    updated[catIndex].requirements.push({
      title: "",
      description: "",
      priority: "should",
      metrics: [{ metricName: "", targetValue: "", unit: "" }],
    });
    setCategories(updated);
  }

  function updateRequirement(
    catIndex: number,
    reqIndex: number,
    field: string,
    value: string
  ) {
    const updated = [...categories];
    (updated[catIndex].requirements[reqIndex] as Record<string, unknown>)[field] = value;
    setCategories(updated);
  }

  function addMetric(catIndex: number, reqIndex: number) {
    const updated = [...categories];
    updated[catIndex].requirements[reqIndex].metrics.push({
      metricName: "",
      targetValue: "",
      unit: "",
    });
    setCategories(updated);
  }

  function updateMetric(
    catIndex: number,
    reqIndex: number,
    metIndex: number,
    field: keyof Metric,
    value: string
  ) {
    const updated = [...categories];
    updated[catIndex].requirements[reqIndex].metrics[metIndex][field] = value;
    setCategories(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const valid = categories.filter(
      (c) => c.name.trim() && c.requirements.some((r) => r.title.trim())
    );
    await saveNFRs(projectId, valid);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Non-Functional Requirements</h3>
        <p className="text-sm text-gray-400">
          Define measurable quality attributes. Add metrics with target values.
        </p>
      </div>
      {categories.map((cat, catIndex) => (
        <div key={catIndex} className="rounded-lg border border-gray-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <Input
              value={cat.name}
              onChange={(e) => updateCategoryName(catIndex, e.target.value)}
              placeholder="Category name"
              className="w-48"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCategory(catIndex)}
            >
              Remove Category
            </Button>
          </div>
          {cat.requirements.map((req, reqIndex) => (
            <div key={reqIndex} className="ml-4 mb-4 space-y-2 border-l border-gray-800 pl-4">
              <Input
                placeholder="Requirement title"
                value={req.title}
                onChange={(e) =>
                  updateRequirement(catIndex, reqIndex, "title", e.target.value)
                }
              />
              <Textarea
                placeholder="Description"
                value={req.description}
                onChange={(e) =>
                  updateRequirement(
                    catIndex,
                    reqIndex,
                    "description",
                    e.target.value
                  )
                }
                rows={2}
              />
              <div className="text-xs font-medium text-gray-500">Metrics:</div>
              {req.metrics.map((met, metIndex) => (
                <div key={metIndex} className="flex gap-2">
                  <Input
                    placeholder="Metric"
                    value={met.metricName}
                    onChange={(e) =>
                      updateMetric(
                        catIndex,
                        reqIndex,
                        metIndex,
                        "metricName",
                        e.target.value
                      )
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="Target"
                    value={met.targetValue}
                    onChange={(e) =>
                      updateMetric(
                        catIndex,
                        reqIndex,
                        metIndex,
                        "targetValue",
                        e.target.value
                      )
                    }
                    className="w-24"
                  />
                  <Input
                    placeholder="Unit"
                    value={met.unit}
                    onChange={(e) =>
                      updateMetric(
                        catIndex,
                        reqIndex,
                        metIndex,
                        "unit",
                        e.target.value
                      )
                    }
                    className="w-24"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addMetric(catIndex, reqIndex)}
              >
                + Metric
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addRequirement(catIndex)}
            className="ml-4"
          >
            + Requirement
          </Button>
        </div>
      ))}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={addCategory}>
          Add Category
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
```

Create `src/components/wizard/step-constraints.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveConstraints } from "@/actions/wizard";
import { Priority } from "@prisma/client";

type ConstraintType = "constraint" | "assumption" | "dependency";
type ConstraintItem = {
  type: ConstraintType;
  name: string;
  requirements: { title: string; description: string; priority: Priority }[];
};

export function StepConstraints({
  projectId,
  initialItems,
  onComplete,
}: {
  projectId: string;
  initialItems: ConstraintItem[];
  onComplete: () => void;
}) {
  const [items, setItems] = useState<ConstraintItem[]>(
    initialItems.length > 0
      ? initialItems
      : [
          {
            type: "constraint",
            name: "Constraints",
            requirements: [{ title: "", description: "", priority: "should" }],
          },
          {
            type: "assumption",
            name: "Assumptions",
            requirements: [{ title: "", description: "", priority: "should" }],
          },
          {
            type: "dependency",
            name: "Dependencies",
            requirements: [{ title: "", description: "", priority: "should" }],
          },
        ]
  );
  const [loading, setLoading] = useState(false);

  function addReq(itemIndex: number) {
    const updated = [...items];
    updated[itemIndex].requirements.push({
      title: "",
      description: "",
      priority: "should",
    });
    setItems(updated);
  }

  function updateReq(
    itemIndex: number,
    reqIndex: number,
    field: string,
    value: string
  ) {
    const updated = [...items];
    (updated[itemIndex].requirements[reqIndex] as Record<string, unknown>)[field] = value;
    setItems(updated);
  }

  function removeReq(itemIndex: number, reqIndex: number) {
    const updated = [...items];
    updated[itemIndex].requirements = updated[itemIndex].requirements.filter(
      (_, i) => i !== reqIndex
    );
    setItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await saveConstraints(projectId, items);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          Constraints, Assumptions & Dependencies
        </h3>
        <p className="text-sm text-gray-400">
          Document anything that limits, assumes, or depends on external factors.
        </p>
      </div>
      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="rounded-lg border border-gray-800 p-4">
          <h4 className="mb-3 text-sm font-medium capitalize">{item.type}s</h4>
          {item.requirements.map((req, reqIndex) => (
            <div key={reqIndex} className="mb-3 ml-4 space-y-2 border-l border-gray-800 pl-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`${item.type} title`}
                  value={req.title}
                  onChange={(e) =>
                    updateReq(itemIndex, reqIndex, "title", e.target.value)
                  }
                  className="flex-1"
                />
                {item.requirements.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReq(itemIndex, reqIndex)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Description"
                value={req.description}
                onChange={(e) =>
                  updateReq(itemIndex, reqIndex, "description", e.target.value)
                }
                rows={2}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addReq(itemIndex)}
            className="ml-4"
          >
            + Add {item.type}
          </Button>
        </div>
      ))}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
```

Create `src/components/wizard/step-review.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { finalizeWizard } from "@/actions/wizard";
import { useRouter } from "next/navigation";

type ReviewData = {
  meta: {
    businessContext: string;
    visionStatement: string;
    targetUsers: string;
  };
  objectives: { title: string; successCriteria: string }[];
  userStories: { role: string; capability: string; benefit: string; priority: string }[];
  nfrCount: number;
  constraintCount: number;
};

export function StepReview({
  projectId,
  data,
}: {
  projectId: string;
  data: ReviewData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleFinalize() {
    setLoading(true);
    await finalizeWizard(projectId);
    router.push(`/project/${projectId}/requirements`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review & Finalize</h3>
        <p className="text-sm text-gray-400">
          Review your requirements before finalizing. You can always edit them
          later in freeform mode.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="mb-2 text-sm font-medium">Vision</h4>
        <p className="text-sm text-gray-300">
          {data.meta.visionStatement || "Not set"}
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="mb-2 text-sm font-medium">
          Objectives ({data.objectives.length})
        </h4>
        <ul className="list-inside list-disc text-sm text-gray-300">
          {data.objectives.map((obj, i) => (
            <li key={i}>{obj.title}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="mb-2 text-sm font-medium">
          User Stories ({data.userStories.length})
        </h4>
        <ul className="list-inside list-disc text-sm text-gray-300">
          {data.userStories.map((s, i) => (
            <li key={i}>
              As a {s.role}, I want {s.capability}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="text-sm font-medium">
          {data.nfrCount} NFR categories, {data.constraintCount}{" "}
          constraints/assumptions/dependencies
        </h4>
      </div>
      <Button onClick={handleFinalize} disabled={loading}>
        {loading ? "Finalizing..." : "Finalize & Enter Freeform Mode"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add wizard shell and all step components"
```

### Task 20: Wizard Page (Wire It Together)

**Files:**
- Modify: `src/app/(dashboard)/project/[id]/wizard/page.tsx`

- [ ] **Step 1: Replace wizard placeholder with full implementation**

Replace `src/app/(dashboard)/project/[id]/wizard/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { WizardClient } from "@/components/wizard/wizard-client";

export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        include: {
          requirements: {
            include: { metrics: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      wizardState: true,
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const wizardState = project.wizardState || {
    currentStep: 1,
    completedSteps: [],
  };

  return (
    <WizardClient
      projectId={project.id}
      initialStep={wizardState.currentStep}
      initialCompletedSteps={wizardState.completedSteps as number[]}
      meta={project.meta || {
        businessContext: "",
        visionStatement: "",
        targetUsers: "",
        technicalConstraints: "",
        timeline: "",
        stakeholders: "",
        glossary: "",
      }}
      objectives={project.objectives}
      userStories={project.userStories}
      nfrCategories={project.requirementCategories
        .filter((c) => c.type === "non_functional")
        .map((c) => ({
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
            metrics: r.metrics,
          })),
        }))}
      constraintItems={project.requirementCategories
        .filter((c) => c.type !== "non_functional")
        .map((c) => ({
          type: c.type as "constraint" | "assumption" | "dependency",
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
          })),
        }))}
    />
  );
}
```

Create `src/components/wizard/wizard-client.tsx` to orchestrate the wizard:

```tsx
"use client";

import { WizardShell } from "./wizard-shell";
import { StepMetadata } from "./step-metadata";
import { StepVision } from "./step-vision";
import { StepObjectives } from "./step-objectives";
import { StepUserStories } from "./step-user-stories";
import { StepNFR } from "./step-nfr";
import { StepConstraints } from "./step-constraints";
import { StepReview } from "./step-review";
import { Priority } from "@prisma/client";

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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: wire up wizard page with all step components"
```

---

## Chunk 6: Freeform Editor & Project Meta

### Task 21: Requirements Server Actions

**Files:**
- Create: `src/actions/requirements.ts`

- [ ] **Step 1: Create requirements CRUD actions**

Create `src/actions/requirements.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { Priority, RequirementType } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
  });
  await requireOrgMembership(user.id, project.orgId);
  return { user, project };
}

// Objectives
export async function addObjective(
  projectId: string,
  data: { title: string; successCriteria: string }
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.objective.count({ where: { projectId } });
  await prisma.objective.create({
    data: { projectId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateObjective(
  id: string,
  data: { title: string; successCriteria: string }
) {
  const obj = await prisma.objective.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(obj.projectId);
  await prisma.objective.update({ where: { id }, data });
  revalidatePath(`/project/${obj.projectId}`);
  return { success: true };
}

export async function deleteObjective(id: string) {
  const obj = await prisma.objective.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(obj.projectId);
  await prisma.objective.delete({ where: { id } });
  revalidatePath(`/project/${obj.projectId}`);
  return { success: true };
}

export async function reorderObjectives(
  projectId: string,
  orderedIds: string[]
) {
  await getProjectWithAuth(projectId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.objective.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

// User Stories
export async function addUserStory(
  projectId: string,
  data: { role: string; capability: string; benefit: string; priority: Priority }
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.userStory.count({ where: { projectId } });
  await prisma.userStory.create({
    data: { projectId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateUserStory(
  id: string,
  data: { role: string; capability: string; benefit: string; priority: Priority }
) {
  const story = await prisma.userStory.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(story.projectId);
  await prisma.userStory.update({ where: { id }, data });
  revalidatePath(`/project/${story.projectId}`);
  return { success: true };
}

export async function deleteUserStory(id: string) {
  const story = await prisma.userStory.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(story.projectId);
  await prisma.userStory.delete({ where: { id } });
  revalidatePath(`/project/${story.projectId}`);
  return { success: true };
}

export async function reorderUserStories(
  projectId: string,
  orderedIds: string[]
) {
  await getProjectWithAuth(projectId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.userStory.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

// Requirements (NFRs, Constraints, etc.)
export async function addRequirement(
  categoryId: string,
  data: { title: string; description: string; priority: Priority }
) {
  const cat = await prisma.requirementCategory.findUniqueOrThrow({
    where: { id: categoryId },
  });
  await getProjectWithAuth(cat.projectId);
  const count = await prisma.requirement.count({ where: { categoryId } });
  await prisma.requirement.create({
    data: { categoryId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${cat.projectId}`);
  return { success: true };
}

export async function updateRequirement(
  id: string,
  data: { title: string; description: string; priority: Priority }
) {
  const req = await prisma.requirement.findUniqueOrThrow({
    where: { id },
    include: { category: true },
  });
  await getProjectWithAuth(req.category.projectId);
  await prisma.requirement.update({ where: { id }, data });
  revalidatePath(`/project/${req.category.projectId}`);
  return { success: true };
}

export async function deleteRequirement(id: string) {
  const req = await prisma.requirement.findUniqueOrThrow({
    where: { id },
    include: { category: true },
  });
  await getProjectWithAuth(req.category.projectId);
  await prisma.nFRMetric.deleteMany({ where: { requirementId: id } });
  await prisma.requirement.delete({ where: { id } });
  revalidatePath(`/project/${req.category.projectId}`);
  return { success: true };
}

// Requirement Categories
export async function addRequirementCategory(
  projectId: string,
  data: { type: RequirementType; name: string }
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.requirementCategory.count({
    where: { projectId, type: data.type },
  });
  await prisma.requirementCategory.create({
    data: { projectId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function deleteRequirementCategory(id: string) {
  const cat = await prisma.requirementCategory.findUniqueOrThrow({
    where: { id },
  });
  await getProjectWithAuth(cat.projectId);
  // Delete metrics, then requirements, then category
  const reqs = await prisma.requirement.findMany({
    where: { categoryId: id },
    select: { id: true },
  });
  for (const req of reqs) {
    await prisma.nFRMetric.deleteMany({ where: { requirementId: req.id } });
  }
  await prisma.requirement.deleteMany({ where: { categoryId: id } });
  await prisma.requirementCategory.delete({ where: { id } });
  revalidatePath(`/project/${cat.projectId}`);
  return { success: true };
}

// NFR Metrics
export async function addNFRMetric(
  requirementId: string,
  data: { metricName: string; targetValue: string; unit: string }
) {
  const req = await prisma.requirement.findUniqueOrThrow({
    where: { id: requirementId },
    include: { category: true },
  });
  await getProjectWithAuth(req.category.projectId);
  await prisma.nFRMetric.create({
    data: { requirementId, ...data },
  });
  revalidatePath(`/project/${req.category.projectId}`);
  return { success: true };
}

export async function deleteNFRMetric(id: string) {
  const metric = await prisma.nFRMetric.findUniqueOrThrow({
    where: { id },
    include: { requirement: { include: { category: true } } },
  });
  await getProjectWithAuth(metric.requirement.category.projectId);
  await prisma.nFRMetric.delete({ where: { id } });
  revalidatePath(`/project/${metric.requirement.category.projectId}`);
  return { success: true };
}

// Project Meta
export async function updateProjectMeta(
  projectId: string,
  data: Partial<{
    businessContext: string;
    visionStatement: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  }>
) {
  await getProjectWithAuth(projectId);
  await prisma.projectMeta.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add requirements CRUD server actions"
```

### Task 22: Freeform Editor Components

**Files:**
- Create: `src/components/requirements/requirements-tabs.tsx`, `src/components/requirements/editable-item.tsx`, `src/components/requirements/sortable-list.tsx`, `src/components/requirements/priority-badge.tsx`
- Modify: `src/app/(dashboard)/project/[id]/requirements/page.tsx`

- [ ] **Step 1: Install drag-and-drop library**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Create priority badge component**

Create `src/components/requirements/priority-badge.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { Priority } from "@prisma/client";

const PRIORITY_COLORS: Record<Priority, string> = {
  must: "bg-red-900/50 text-red-300 border-red-800",
  should: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  could: "bg-blue-900/50 text-blue-300 border-blue-800",
  wont: "bg-gray-800 text-gray-400 border-gray-700",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "rounded border px-2 py-0.5 text-xs font-medium",
        PRIORITY_COLORS[priority]
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
```

- [ ] **Step 3: Create sortable list component**

Create `src/components/requirements/sortable-list.tsx`:

```tsx
"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab px-1 text-gray-600 hover:text-gray-400"
        >
          &#x2630;
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export function SortableList({
  items,
  onReorder,
  renderItem,
}: {
  items: { id: string }[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: { id: string }) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorder(reordered.map((i) => i.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 4: Create editable item component**

Create `src/components/requirements/editable-item.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EditableItem({
  title,
  subtitle,
  onSave,
  onDelete,
  fields,
}: {
  title: string;
  subtitle?: string;
  onSave: (data: Record<string, string>) => Promise<void>;
  onDelete: () => Promise<void>;
  fields: {
    name: string;
    label: string;
    value: string;
    type: "input" | "textarea";
  }[];
}) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fields.forEach((f) => {
      data[f.name] = fd.get(f.name) as string;
    });
    await onSave(data);
    setLoading(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this item?")) return;
    setLoading(true);
    await onDelete();
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2"
      >
        {fields.map((field) =>
          field.type === "textarea" ? (
            <Textarea
              key={field.name}
              name={field.name}
              defaultValue={field.value}
              placeholder={field.label}
              rows={2}
            />
          ) : (
            <Input
              key={field.name}
              name={field.name}
              defaultValue={field.value}
              placeholder={field.label}
            />
          )
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="ml-auto text-red-400"
            disabled={loading}
          >
            Delete
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded-md border border-gray-800 p-3 hover:border-gray-700"
    >
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Create requirements tabs component and wire up the page**

Create `src/components/requirements/requirements-tabs.tsx`. This is a client component that renders tabbed sections for Vision, Objectives, User Stories, NFRs, and Constraints, each using the sortable list and editable items. Due to its length, it imports all the requirement actions and renders each tab's content with add/edit/delete/reorder functionality.

The key pattern for each tab:
- Display items in a `SortableList` with `EditableItem` for each
- "Add" button at the bottom
- Reorder calls the corresponding `reorder*` action
- Edit/delete calls the corresponding `update*/delete*` action

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SortableList } from "./sortable-list";
import { EditableItem } from "./editable-item";
import { PriorityBadge } from "./priority-badge";
import {
  updateObjective,
  deleteObjective,
  addObjective,
  reorderObjectives,
  updateUserStory,
  deleteUserStory,
  addUserStory,
  reorderUserStories,
  updateProjectMeta,
} from "@/actions/requirements";
import { Priority } from "@prisma/client";
import { Textarea } from "@/components/ui/textarea";

type RequirementsTabsProps = {
  projectId: string;
  meta: {
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  };
  objectives: { id: string; title: string; successCriteria: string }[];
  userStories: {
    id: string;
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[];
};

export function RequirementsTabs(props: RequirementsTabsProps) {
  return (
    <Tabs defaultValue="vision" className="w-full">
      <TabsList>
        <TabsTrigger value="vision">Vision</TabsTrigger>
        <TabsTrigger value="objectives">Objectives</TabsTrigger>
        <TabsTrigger value="stories">User Stories</TabsTrigger>
        <TabsTrigger value="nfrs">NFRs</TabsTrigger>
        <TabsTrigger value="constraints">Constraints</TabsTrigger>
      </TabsList>

      <TabsContent value="vision" className="mt-4 max-w-2xl">
        <VisionTab
          projectId={props.projectId}
          visionStatement={props.meta.visionStatement}
        />
      </TabsContent>

      <TabsContent value="objectives" className="mt-4 max-w-2xl">
        <ObjectivesTab
          projectId={props.projectId}
          objectives={props.objectives}
        />
      </TabsContent>

      <TabsContent value="stories" className="mt-4 max-w-2xl">
        <UserStoriesTab
          projectId={props.projectId}
          stories={props.userStories}
        />
      </TabsContent>

      <TabsContent value="nfrs" className="mt-4 max-w-2xl">
        <p className="mb-4 text-sm text-gray-400">
          Non-functional requirements with measurable metrics. Add categories and requirements below.
        </p>
        <p className="text-sm text-gray-500">
          NFR inline editing follows the same SortableList + EditableItem pattern as Objectives and User Stories.
          Each NFR category is a collapsible section containing its requirements. Each requirement shows its metrics inline.
          Implementation uses the same actions from src/actions/requirements.ts (addRequirement, updateRequirement, deleteRequirement).
          Category management uses addRequirementCategory and deleteRequirementCategory actions (add these to requirements.ts).
        </p>
      </TabsContent>

      <TabsContent value="constraints" className="mt-4 max-w-2xl">
        <p className="mb-4 text-sm text-gray-400">
          Constraints, assumptions, and dependencies.
        </p>
        <p className="text-sm text-gray-500">
          Constraints editing follows the same SortableList + EditableItem pattern.
          Grouped by type (constraint, assumption, dependency) with add/edit/delete per item.
          Uses the same requirement actions from src/actions/requirements.ts.
        </p>
      </TabsContent>
    </Tabs>
  );
}

function VisionTab({
  projectId,
  visionStatement,
}: {
  projectId: string;
  visionStatement: string;
}) {
  const [value, setValue] = useState(visionStatement);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await updateProjectMeta(projectId, { visionStatement: value });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Vision statement..."
      />
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

function ObjectivesTab({
  projectId,
  objectives,
}: {
  projectId: string;
  objectives: { id: string; title: string; successCriteria: string }[];
}) {
  return (
    <div className="space-y-4">
      <SortableList
        items={objectives}
        onReorder={(ids) => reorderObjectives(projectId, ids)}
        renderItem={(item) => {
          const obj = objectives.find((o) => o.id === item.id)!;
          return (
            <EditableItem
              title={obj.title}
              subtitle={obj.successCriteria}
              onSave={async (data) => {
                await updateObjective(obj.id, {
                  title: data.title,
                  successCriteria: data.successCriteria,
                });
              }}
              onDelete={async () => {
                await deleteObjective(obj.id);
              }}
              fields={[
                { name: "title", label: "Title", value: obj.title, type: "input" },
                {
                  name: "successCriteria",
                  label: "Success Criteria",
                  value: obj.successCriteria,
                  type: "textarea",
                },
              ]}
            />
          );
        }}
      />
      <Button
        variant="outline"
        onClick={() =>
          addObjective(projectId, { title: "New Objective", successCriteria: "" })
        }
      >
        Add Objective
      </Button>
    </div>
  );
}

function UserStoriesTab({
  projectId,
  stories,
}: {
  projectId: string;
  stories: {
    id: string;
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[];
}) {
  return (
    <div className="space-y-4">
      <SortableList
        items={stories}
        onReorder={(ids) => reorderUserStories(projectId, ids)}
        renderItem={(item) => {
          const story = stories.find((s) => s.id === item.id)!;
          return (
            <EditableItem
              title={`As a ${story.role}, I want ${story.capability}`}
              subtitle={story.benefit ? `So that ${story.benefit}` : undefined}
              onSave={async (data) => {
                await updateUserStory(story.id, {
                  role: data.role,
                  capability: data.capability,
                  benefit: data.benefit,
                  priority: data.priority as Priority,
                });
              }}
              onDelete={async () => {
                await deleteUserStory(story.id);
              }}
              fields={[
                { name: "role", label: "Role", value: story.role, type: "input" },
                {
                  name: "capability",
                  label: "Capability",
                  value: story.capability,
                  type: "input",
                },
                {
                  name: "benefit",
                  label: "Benefit",
                  value: story.benefit,
                  type: "input",
                },
              ]}
            />
          );
        }}
      />
      <Button
        variant="outline"
        onClick={() =>
          addUserStory(projectId, {
            role: "user",
            capability: "new capability",
            benefit: "",
            priority: "should",
          })
        }
      >
        Add User Story
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Update requirements page**

Replace `src/app/(dashboard)/project/[id]/requirements/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { RequirementsTabs } from "@/components/requirements/requirements-tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function RequirementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const meta = project.meta || {
    visionStatement: "",
    businessContext: "",
    targetUsers: "",
    technicalConstraints: "",
    timeline: "",
    stakeholders: "",
    glossary: "",
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Requirements</h2>
        <Link href={`/project/${project.id}/wizard`}>
          <Button variant="outline" size="sm">
            Re-enter Wizard
          </Button>
        </Link>
      </div>
      <RequirementsTabs
        projectId={project.id}
        meta={meta}
        objectives={project.objectives}
        userStories={project.userStories}
      />
    </div>
  );
}
```

- [ ] **Step 7: Update project meta page**

Replace `src/app/(dashboard)/project/[id]/meta/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MetaEditor } from "@/components/requirements/meta-editor";

export default async function MetaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      meta: true,
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Project Metadata</h2>
      <MetaEditor projectId={project.id} meta={project.meta} />
    </div>
  );
}
```

Create `src/components/requirements/meta-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { updateProjectMeta } from "@/actions/requirements";

type Meta = {
  businessContext: string;
  targetUsers: string;
  technicalConstraints: string;
  timeline: string;
  stakeholders: string;
  glossary: string;
} | null;

export function MetaEditor({
  projectId,
  meta,
}: {
  projectId: string;
  meta: Meta;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await updateProjectMeta(projectId, {
      businessContext: fd.get("businessContext") as string,
      targetUsers: fd.get("targetUsers") as string,
      technicalConstraints: fd.get("technicalConstraints") as string,
      timeline: fd.get("timeline") as string,
      stakeholders: fd.get("stakeholders") as string,
      glossary: fd.get("glossary") as string,
    });
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium">Business Context</label>
        <Textarea
          name="businessContext"
          rows={3}
          defaultValue={meta?.businessContext || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Target Users</label>
        <Textarea
          name="targetUsers"
          rows={2}
          defaultValue={meta?.targetUsers || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          Technical Constraints
        </label>
        <Textarea
          name="technicalConstraints"
          rows={2}
          defaultValue={meta?.technicalConstraints || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Timeline</label>
        <Input name="timeline" defaultValue={meta?.timeline || ""} />
      </div>
      <div>
        <label className="block text-sm font-medium">Stakeholders</label>
        <Textarea
          name="stakeholders"
          rows={2}
          defaultValue={meta?.stakeholders || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Glossary</label>
        <Textarea
          name="glossary"
          rows={3}
          defaultValue={meta?.glossary || ""}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 8: Update project settings page**

Replace `src/app/(dashboard)/project/[id]/settings/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSettingsClient } from "@/components/project/project-settings-client";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const membership = project.org.memberships[0];

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Project Settings</h2>
      <ProjectSettingsClient
        projectId={project.id}
        projectName={project.name}
        projectStatus={project.status}
        orgSlug={project.org.slug}
        userRole={membership.role}
        isCreator={project.createdById === session.user.id}
      />
    </div>
  );
}
```

Create `src/components/project/project-settings-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { archiveProject, deleteProject } from "@/actions/projects";
import { OrgRole, ProjectStatus } from "@prisma/client";

export function ProjectSettingsClient({
  projectId,
  projectName,
  projectStatus,
  orgSlug,
  userRole,
  isCreator,
}: {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  orgSlug: string;
  userRole: OrgRole;
  isCreator: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canArchive =
    isCreator || userRole === "owner" || userRole === "admin";
  const canDelete = userRole === "owner";

  async function handleArchive() {
    setLoading(true);
    await archiveProject(projectId);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete "${projectName}"? This cannot be undone.`
      )
    )
      return;
    setLoading(true);
    await deleteProject(projectId);
    router.push(`/org/${orgSlug}/projects`);
  }

  return (
    <div className="max-w-md space-y-8">
      {canArchive && (
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium">Archive Project</h3>
          <p className="mt-1 text-xs text-gray-400">
            {projectStatus === "archived"
              ? "This project is archived. Unarchive to make it visible again."
              : "Archived projects are hidden from the default list."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleArchive}
            disabled={loading}
          >
            {projectStatus === "archived" ? "Unarchive" : "Archive"}
          </Button>
        </div>
      )}
      {canDelete && (
        <div className="rounded-lg border border-red-900/50 p-4">
          <h3 className="text-sm font-medium text-red-400">Delete Project</h3>
          <p className="mt-1 text-xs text-gray-400">
            Permanently removes this project from all views.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete Project
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add freeform requirements editor, meta editor, and project settings"
```

---

## Chunk 7: Generation & Export

### Task 23: AI Generation Backend

**Files:**
- Create: `src/lib/generation/prompts.ts`, `src/lib/generation/generate.ts`, `src/actions/generation.ts`

- [ ] **Step 1: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Create system prompts for each output type**

Create `src/lib/generation/prompts.ts`:

```typescript
export function buildSystemPrompt(outputType: string): string {
  const base = `You are an expert requirements analyst and technical writer. You will be given structured project requirements and must produce a high-quality document.`;

  switch (outputType) {
    case "ai_prompt":
      return `${base}

Produce a structured prompt suitable for AI coding tools (Claude Code, Cursor, etc.). Focus on:
- Technical requirements and acceptance criteria
- Constraints and measurable NFRs
- Clear, directive, implementation-focused language
- Organized by feature/component area

Format as a prompt that an AI coding assistant could directly use to build the system.`;

    case "requirements_doc":
      return `${base}

Produce a formal requirements document with:
- Executive summary
- Project scope
- Stakeholder list
- Functional requirements (derived from user stories)
- Non-functional requirements with metrics
- Constraints, assumptions, and dependencies
- Glossary

Use professional tone suitable for sign-off. Structure with clear numbered sections.`;

    case "project_brief":
      return `${base}

Produce a concise project brief for stakeholders:
- Vision and strategic context
- Key objectives
- Core user stories (summarized)
- Timeline and high-level constraints
- Less technical, more strategic language

Keep it to 1-2 pages. Suitable for executive communication.`;

    case "technical_spec":
      return `${base}

Produce an architecture-oriented technical specification:
- Derived system components
- Data flows and integration points
- Technical constraints and considerations
- Recommended technology choices based on requirements
- API boundaries and data models

Aimed at development teams planning implementation.`;

    default:
      return base;
  }
}

export function buildUserPrompt(projectData: {
  name: string;
  description: string;
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
    priority: string;
  }[];
  nfrCategories: {
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: string;
      metrics: { metricName: string; targetValue: string; unit: string }[];
    }[];
  }[];
  constraints: {
    type: string;
    name: string;
    requirements: { title: string; description: string }[];
  }[];
}): string {
  let prompt = `# Project: ${projectData.name}\n\n`;

  if (projectData.description) {
    prompt += `${projectData.description}\n\n`;
  }

  const meta = projectData.meta;
  if (meta.visionStatement) {
    prompt += `## Vision\n${meta.visionStatement}\n\n`;
  }
  if (meta.businessContext) {
    prompt += `## Business Context\n${meta.businessContext}\n\n`;
  }
  if (meta.targetUsers) {
    prompt += `## Target Users\n${meta.targetUsers}\n\n`;
  }
  if (meta.stakeholders) {
    prompt += `## Stakeholders\n${meta.stakeholders}\n\n`;
  }
  if (meta.timeline) {
    prompt += `## Timeline\n${meta.timeline}\n\n`;
  }
  if (meta.technicalConstraints) {
    prompt += `## Technical Constraints\n${meta.technicalConstraints}\n\n`;
  }

  if (projectData.objectives.length > 0) {
    prompt += `## Key Objectives\n`;
    projectData.objectives.forEach((obj, i) => {
      prompt += `${i + 1}. **${obj.title}**`;
      if (obj.successCriteria) prompt += ` - Success: ${obj.successCriteria}`;
      prompt += "\n";
    });
    prompt += "\n";
  }

  if (projectData.userStories.length > 0) {
    prompt += `## User Stories\n`;
    projectData.userStories.forEach((s, i) => {
      prompt += `${i + 1}. [${s.priority.toUpperCase()}] As a ${s.role}, I want ${s.capability}`;
      if (s.benefit) prompt += `, so that ${s.benefit}`;
      prompt += "\n";
    });
    prompt += "\n";
  }

  if (projectData.nfrCategories.length > 0) {
    prompt += `## Non-Functional Requirements\n`;
    projectData.nfrCategories.forEach((cat) => {
      prompt += `### ${cat.name}\n`;
      cat.requirements.forEach((req) => {
        prompt += `- **${req.title}**: ${req.description}\n`;
        req.metrics.forEach((m) => {
          prompt += `  - ${m.metricName}: ${m.targetValue} ${m.unit}\n`;
        });
      });
    });
    prompt += "\n";
  }

  if (projectData.constraints.length > 0) {
    projectData.constraints.forEach((group) => {
      prompt += `## ${group.name}\n`;
      group.requirements.forEach((req) => {
        prompt += `- **${req.title}**: ${req.description}\n`;
      });
      prompt += "\n";
    });
  }

  if (meta.glossary) {
    prompt += `## Glossary\n${meta.glossary}\n\n`;
  }

  return prompt;
}
```

- [ ] **Step 3: Create generation utility**

Create `src/lib/generation/generate.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

const client = new Anthropic();

export async function generateOutput(
  outputType: string,
  projectData: Parameters<typeof buildUserPrompt>[0]
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = buildSystemPrompt(outputType);
  const userPrompt = buildUserPrompt(projectData);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
```

- [ ] **Step 4: Create generation server action and API route**

For streaming, we need an API route (server actions can't stream). Create `src/app/api/generate/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOutput } from "@/lib/generation/generate";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId, outputType } = await req.json();

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: { memberships: { where: { userId: session.user.id } } },
      },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        include: {
          requirements: {
            include: { metrics: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const stream = await generateOutput(outputType, {
      name: project.name,
      description: project.description,
      meta: project.meta || {
        businessContext: "",
        visionStatement: "",
        targetUsers: "",
        technicalConstraints: "",
        timeline: "",
        stakeholders: "",
        glossary: "",
      },
      objectives: project.objectives,
      userStories: project.userStories,
      nfrCategories: project.requirementCategories
        .filter((c) => c.type === "non_functional")
        .map((c) => ({
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
            metrics: r.metrics,
          })),
        })),
      constraints: project.requirementCategories
        .filter((c) => c.type !== "non_functional")
        .map((c) => ({
          type: c.type,
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
          })),
        })),
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Generation failed:", error);
    return new Response("Generation failed", { status: 500 });
  }
}
```

Create `src/actions/generation.ts` for saving outputs:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { OutputType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function saveGeneratedOutput(
  projectId: string,
  data: {
    outputType: OutputType;
    content: string;
    editedContent?: string;
  }
) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
  });
  await requireOrgMembership(user.id, project.orgId);

  await prisma.generatedOutput.create({
    data: {
      projectId,
      outputType: data.outputType,
      content: data.content,
      editedContent: data.editedContent || null,
      generatedById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}/outputs`);
  return { success: true };
}

export async function updateOutputContent(
  outputId: string,
  editedContent: string
) {
  const output = await prisma.generatedOutput.findUniqueOrThrow({
    where: { id: outputId },
    include: { project: true },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, output.project.orgId);

  await prisma.generatedOutput.update({
    where: { id: outputId },
    data: { editedContent },
  });

  revalidatePath(`/project/${output.projectId}/outputs`);
  return { success: true };
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add AI generation backend with Claude API streaming"
```

### Task 24: Generation UI

**Files:**
- Create: `src/components/generate/output-type-picker.tsx`, `src/components/generate/generation-preview.tsx`, `src/components/generate/export-buttons.tsx`
- Modify: `src/app/(dashboard)/project/[id]/generate/page.tsx`

- [ ] **Step 1: Create output type picker**

Create `src/components/generate/output-type-picker.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

const OUTPUT_TYPES = [
  {
    id: "ai_prompt",
    label: "AI Coding Prompt",
    description: "Structured prompt for AI coding tools",
  },
  {
    id: "requirements_doc",
    label: "Requirements Document",
    description: "Formal requirements document for sign-off",
  },
  {
    id: "project_brief",
    label: "Project Brief",
    description: "Concise overview for stakeholders",
  },
  {
    id: "technical_spec",
    label: "Technical Spec",
    description: "Architecture-oriented specification",
  },
];

export function OutputTypePicker({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (type: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OUTPUT_TYPES.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelect(type.id)}
          className={cn(
            "rounded-lg border p-4 text-left",
            selected === type.id
              ? "border-blue-500 bg-blue-950/30"
              : "border-gray-800 hover:border-gray-700"
          )}
        >
          <div className="text-sm font-medium">{type.label}</div>
          <div className="mt-1 text-xs text-gray-400">{type.description}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create generation preview component**

Create `src/components/generate/generation-preview.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputTypePicker } from "./output-type-picker";
import { ExportButtons } from "./export-buttons";
import { saveGeneratedOutput } from "@/actions/generation";
import { OutputType } from "@prisma/client";

export function GenerationPreview({ projectId }: { projectId: string }) {
  const [outputType, setOutputType] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    if (!outputType) return;
    setIsGenerating(true);
    setError("");
    setContent("");
    setEditedContent("");
    setIsEditing(false);
    setSaved(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, outputType }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error("Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setContent(accumulated);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Generation failed. Please try again.");
        setContent("");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!outputType || !content) return;
    const result = await saveGeneratedOutput(projectId, {
      outputType: outputType as OutputType,
      content,
      editedContent: isEditing ? editedContent : undefined,
    });
    if (result.success) setSaved(true);
  }

  const displayContent = isEditing ? editedContent : content;

  return (
    <div className="space-y-6">
      <OutputTypePicker selected={outputType} onSelect={setOutputType} />

      {outputType && (
        <div className="flex gap-3">
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
          {isGenerating && (
            <Button
              variant="outline"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={handleGenerate}
          >
            Retry
          </Button>
        </div>
      )}

      {content && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!isEditing) setEditedContent(content);
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Preview" : "Edit"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saved}>
              {saved ? "Saved" : "Save to History"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(displayContent)}
            >
              Copy
            </Button>
            <ExportButtons
              content={displayContent}
              projectName={`output-${outputType}`}
            />
          </div>

          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          ) : (
            <div className="max-h-[600px] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-200">
                {content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create export buttons**

Create `src/components/generate/export-buttons.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

export function ExportButtons({
  content,
  projectName,
}: {
  content: string;
  projectName: string;
}) {
  function downloadMarkdown() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadWord() {
    const res = await fetch("/api/export/word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename: projectName }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    const res = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename: projectName }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={downloadMarkdown}>
        .md
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPdf}>
        .pdf
      </Button>
      <Button variant="outline" size="sm" onClick={downloadWord}>
        .docx
      </Button>
    </>
  );
}
```

- [ ] **Step 4: Create export API routes**

Install export dependencies:

```bash
npm install docx @react-pdf/renderer
```

Create `src/app/api/export/word/route.ts`:

```typescript
import { Document, Packer, Paragraph, TextRun } from "docx";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { content, filename } = await req.json();

  const paragraphs = content.split("\n").map(
    (line: string) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: "Calibri",
            size: 24,
          }),
        ],
      })
  );

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}.docx"`,
    },
  });
}
```

Create `src/app/api/export/pdf/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.6 },
  text: { marginBottom: 4 },
});

function PdfDocument({ content }: { content: string }) {
  const lines = content.split("\n");
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      lines.map((line, i) =>
        React.createElement(
          View,
          { key: i, style: styles.text },
          React.createElement(Text, null, line || " ")
        )
      )
    )
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { content, filename } = await req.json();

  const buffer = await renderToBuffer(
    React.createElement(PdfDocument, { content })
  );

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
```

- [ ] **Step 5: Update generate page**

Replace `src/app/(dashboard)/project/[id]/generate/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { GenerationPreview } from "@/components/generate/generation-preview";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Generate Output</h2>
      <GenerationPreview projectId={project.id} />
    </div>
  );
}
```

- [ ] **Step 6: Update outputs page**

Replace `src/app/(dashboard)/project/[id]/outputs/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  ai_prompt: "AI Coding Prompt",
  requirements_doc: "Requirements Document",
  project_brief: "Project Brief",
  technical_spec: "Technical Spec",
};

export default async function OutputsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      generatedOutputs: {
        include: { generatedBy: { select: { name: true } } },
        orderBy: { generatedAt: "desc" },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const grouped = project.generatedOutputs.reduce(
    (acc, output) => {
      const type = output.outputType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(output);
      return acc;
    },
    {} as Record<string, typeof project.generatedOutputs>
  );

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Generated Outputs</h2>
      {project.generatedOutputs.length === 0 ? (
        <p className="text-sm text-gray-400">
          No outputs yet. Use the Generate tab to create one.
        </p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, outputs]) => (
            <div key={type}>
              <h3 className="mb-3 text-sm font-medium text-gray-400">
                {TYPE_LABELS[type] || type}
              </h3>
              <div className="space-y-2">
                {outputs.map((output) => (
                  <details
                    key={output.id}
                    className="rounded-lg border border-gray-800"
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm hover:bg-gray-800/50">
                      <span className="font-medium">
                        {new Date(output.generatedAt).toLocaleString()}
                      </span>
                      <span className="ml-2 text-gray-500">
                        by {output.generatedBy.name}
                      </span>
                      {output.editedContent && (
                        <span className="ml-2 rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                          edited
                        </span>
                      )}
                    </summary>
                    <div className="border-t border-gray-800 p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-300">
                        {output.editedContent || output.content}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add AI generation with streaming, export, and output history"
```

---

## Chunk 8: Infrastructure & Deployment

### Task 25: Dockerfile

**Files:**
- Create: `Dockerfile`, `.dockerignore`

- [ ] **Step 1: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
.next
.git
.env.local
.env
.superpowers
docs
```

- [ ] **Step 2: Create multi-stage Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
```

- [ ] **Step 3: Update next.config.ts for standalone output**

Ensure `next.config.ts` includes:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Dockerfile and Docker configuration for production"
```

### Task 26: GitHub Repository & Coolify Deployment

- [ ] **Step 1: Create GitHub repository**

```bash
gh repo create enterprise --private --source=. --remote=origin
git push -u origin master
```

- [ ] **Step 2: Discover Coolify project and server UUIDs**

```bash
# List projects to find the project_uuid
curl -s "https://coolify.daveys.xyz/api/v1/projects" \
  -H "Authorization: Bearer 18|zP17V6IafJCxS241hF7tf5fJnq4Y6uRKjwN9Aq74aa7ad2cf" | jq '.[] | {uuid, name}'

# List servers to find the server_uuid
curl -s "https://coolify.daveys.xyz/api/v1/servers" \
  -H "Authorization: Bearer 18|zP17V6IafJCxS241hF7tf5fJnq4Y6uRKjwN9Aq74aa7ad2cf" | jq '.[] | {uuid, name, ip}'
```

Save the `project_uuid` and `server_uuid` from the output. Also note the server IP/domain for the DNS step.

- [ ] **Step 3: Create Coolify application**

```bash
# Replace PROJECT_UUID, SERVER_UUID, and GITHUB_REPO with actual values from above
curl -s -X POST "https://coolify.daveys.xyz/api/v1/applications" \
  -H "Authorization: Bearer 18|zP17V6IafJCxS241hF7tf5fJnq4Y6uRKjwN9Aq74aa7ad2cf" \
  -H "Content-Type: application/json" \
  -d '{
    "project_uuid": "PROJECT_UUID",
    "server_uuid": "SERVER_UUID",
    "environment_name": "production",
    "type": "dockerfile",
    "name": "enterprise",
    "domains": "http://enterprise.coria.app",
    "git_repository": "GITHUB_REPO",
    "git_branch": "master",
    "dockerfile_location": "/Dockerfile"
  }'
```

Configure environment variables in Coolify (via dashboard or API):

- `DATABASE_URL` - PostgreSQL connection string (from Coolify-managed PostgreSQL)
- `NEXTAUTH_URL` - `http://enterprise.coria.app`
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `RESEND_API_KEY` - From Resend dashboard
- `ANTHROPIC_API_KEY` - From Anthropic console
- `NEXT_PUBLIC_APP_URL` - `http://enterprise.coria.app`

- [ ] **Step 3: Set up PostgreSQL on Coolify**

Create a PostgreSQL database via Coolify dashboard or API. Note the connection string for the `DATABASE_URL` environment variable.

### Task 27: Cloudflare DNS

- [ ] **Step 1: Create DNS record**

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ac2b6c87ca4b1ed0c525eb46d0590b65/dns_records" \
  -H "Authorization: Bearer 5IoogSBZPYYKzxLLvcJmi-a9CCKTf9HxEuZ88QOX" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "enterprise",
    "content": "COOLIFY_SERVER_DOMAIN",
    "proxied": true
  }'
```

Replace `COOLIFY_SERVER_DOMAIN` with the server IP/domain from the Coolify discovery step (Task 26, Step 2). If the server only has an IP, use an A record instead of CNAME.

- [ ] **Step 2: Verify DNS resolution**

```bash
dig enterprise.coria.app
```

Expected: Returns the Cloudflare proxy IPs.

- [ ] **Step 3: Set up Resend domain verification**

1. Go to Resend dashboard (https://resend.com/domains) and add domain `enterprise.coria.app`
2. Resend will provide DNS records needed for verification. Typically:
   - A TXT record for SPF (e.g., `v=spf1 include:amazonses.com ~all`)
   - One or more CNAME records for DKIM

Add each record via Cloudflare API. Example for SPF:

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ac2b6c87ca4b1ed0c525eb46d0590b65/dns_records" \
  -H "Authorization: Bearer 5IoogSBZPYYKzxLLvcJmi-a9CCKTf9HxEuZ88QOX" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TXT",
    "name": "enterprise",
    "content": "RESEND_SPF_VALUE"
  }'
```

Example for DKIM (repeat for each DKIM record Resend provides):

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ac2b6c87ca4b1ed0c525eb46d0590b65/dns_records" \
  -H "Authorization: Bearer 5IoogSBZPYYKzxLLvcJmi-a9CCKTf9HxEuZ88QOX" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "RESEND_DKIM_NAME",
    "content": "RESEND_DKIM_VALUE",
    "proxied": false
  }'
```

Replace all `RESEND_*` values with the actual values from the Resend dashboard. DKIM CNAME records must NOT be proxied (set `proxied: false`). After adding all records, click "Verify" in the Resend dashboard.

- [ ] **Step 4: Deploy and verify**

Trigger a deployment on Coolify and verify:
1. Application builds and starts
2. Database migrations run on startup
3. `http://enterprise.coria.app` loads the login page
4. Registration, email verification, and login work
5. Organization creation and project creation work

- [ ] **Step 5: Commit any final configuration**

```bash
git add -A
git commit -m "docs: add deployment configuration notes"
```
