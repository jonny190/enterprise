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
