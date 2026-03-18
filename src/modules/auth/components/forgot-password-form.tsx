"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/modules/auth/actions";

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
