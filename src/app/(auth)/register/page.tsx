import { Suspense } from "react";
import { RegisterForm } from "@/modules/auth/components/register-form";
import { isRegistrationOpen } from "@/modules/auth/actions";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const open = await isRegistrationOpen();

  return (
    <Suspense>
      <RegisterForm registrationOpen={open} />
    </Suspense>
  );
}
