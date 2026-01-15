import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";

function SignInFormWrapper() {
  return <SignInForm />;
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SignInFormWrapper />
    </Suspense>
  );
}

