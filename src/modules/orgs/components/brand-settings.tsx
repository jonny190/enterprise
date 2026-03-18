"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrgBrand } from "@/modules/orgs/actions";

type BrandData = {
  website: string;
  logoUrl: string;
  faviconUrl: string;
  brandColors: string;
  brandTone: string;
  brandDescription: string;
};

export function BrandSettings({
  orgId,
  initialBrand,
}: {
  orgId: string;
  initialBrand: BrandData;
}) {
  const [brand, setBrand] = useState<BrandData>(initialBrand);
  const [url, setUrl] = useState(initialBrand.website);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleScan() {
    if (!url.trim()) return;
    setScanning(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, url: url.trim() }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setBrand(data.brand);
        setSuccess("Brand information extracted from website");
      }
    } catch {
      setError("Failed to scan website");
    } finally {
      setScanning(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const result = await updateOrgBrand(orgId, brand);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Brand settings saved");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Brand Identity</h3>
        <p className="text-sm text-gray-400">
          Enter your website URL to automatically extract brand information, or
          fill in the fields manually.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-900/50 p-3 text-sm text-green-300">
          {success}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="https://yourcompany.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleScan}
          disabled={scanning || !url.trim()}
          variant="outline"
        >
          {scanning ? "Scanning..." : "Scan Website"}
        </Button>
      </div>

      {(brand.logoUrl || brand.faviconUrl) && (
        <div className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
          {brand.logoUrl && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Logo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.logoUrl}
                alt="Organization logo"
                className="max-h-16 max-w-48 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          {brand.faviconUrl && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Favicon</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.faviconUrl}
                alt="Favicon"
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <Input
            placeholder="https://yourcompany.com/logo.png"
            value={brand.logoUrl}
            onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Direct URL to your company logo image
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Brand Colors
          </label>
          <Input
            placeholder="e.g. Navy blue (#1a2b3c), Gold (#d4a017)"
            value={brand.brandColors}
            onChange={(e) =>
              setBrand({ ...brand, brandColors: e.target.value })
            }
          />
          <p className="mt-1 text-xs text-gray-500">
            Primary and accent colors used in your brand
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Brand Tone</label>
          <Input
            placeholder="e.g. Professional, approachable, authoritative"
            value={brand.brandTone}
            onChange={(e) => setBrand({ ...brand, brandTone: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">
            The voice and personality of your brand
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Brand Description
          </label>
          <textarea
            className="flex w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="Brief description of your brand identity and what your company does"
            value={brand.brandDescription}
            onChange={(e) =>
              setBrand({ ...brand, brandDescription: e.target.value })
            }
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Brand Settings"}
        </Button>
      </form>
    </div>
  );
}
