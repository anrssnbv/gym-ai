import { SignUp } from "@clerk/nextjs";
import { AuthScreen } from "@/components/auth/auth-screen";

export default function Page() {
  return (
    <AuthScreen>
      <SignUp appearance={{ elements: { rootBox: "w-full", cardBox: "w-full", card: "w-full" } }} />
    </AuthScreen>
  );
}
