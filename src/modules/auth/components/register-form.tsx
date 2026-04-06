"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerUser } from "@/modules/auth/actions";

export function RegisterForm({ registrationOpen }: { registrationOpen: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    } else if (result.autoVerified) {
      router.push("/login");
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

  if (!registrationOpen && !invitationToken) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-medium">Registration is by invitation only</p>
          <p className="mt-1">Ask an existing member to invite you to their organization.</p>
        </div>
        <p className="text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
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
