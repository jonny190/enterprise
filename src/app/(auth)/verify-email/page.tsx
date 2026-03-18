import { verifyEmail } from "@/modules/auth/actions";
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
