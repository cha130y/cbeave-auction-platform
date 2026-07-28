import { AuthScreen } from "@/features/auth/components/auth-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in or register | CBeave",
  description: "Access your CBeave auction account.",
};

export default function AuthenticationPage() {
  return <AuthScreen />;
}
