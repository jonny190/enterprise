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
  if (existing) return { error: "An account with this email already exists" };
  if (data.password.length < 8)
    return { error: "Password must be at least 8 characters" };

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

  // If no email service configured, auto-verify the user
  const emailConfigured = !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_SENDER_EMAIL);

  await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      verificationToken: emailConfigured ? verificationToken : null,
      verificationExpires: emailConfigured ? verificationExpires : null,
      emailVerified: !emailConfigured,
      pendingInvitationId: invitationId,
    },
  });

  if (emailConfigured) {
    await sendVerificationEmail(data.email.toLowerCase(), verificationToken);
    return { success: true };
  }

  // Auto-accept invitation if auto-verified
  if (invitationId) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (user) {
      const invitation = await prisma.orgInvitation.findUnique({
        where: { id: invitationId },
      });
      if (invitation && invitation.status === "pending") {
        await prisma.$transaction([
          prisma.orgMembership.create({
            data: { userId: user.id, orgId: invitation.orgId, role: invitation.role },
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
  }

  return { success: true, autoVerified: true };
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

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { success: true }; // prevent email enumeration

  const resetToken = generateToken();
  const resetTokenExpires = generateTokenExpiry(1);
  await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpires } });
  await sendPasswordResetEmail(user.email, resetToken);
  return { success: true };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" };

  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
  });
  if (!user) return { error: "Invalid or expired reset link" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpires: null },
  });
  return { success: true };
}
