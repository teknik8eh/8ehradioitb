"use client";

import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ButtonPrimary from "../components/ButtonPrimary";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("error");
  const errorMessages = {
    AccessDenied: "Email kamu tidak ada dalam daftar yang diizinkan. Hubungi admin 8EH.",
    OAuthAccountNotLinked: "Email ini sudah terdaftar dengan metode login lain.",
    Signin: "Terjadi kesalahan saat login. Silakan coba lagi.",
    OAuthSignin: "Terjadi kesalahan saat login. Silakan coba lagi.",
    OAuthCallback: "Terjadi kesalahan saat login. Silakan coba lagi.",
  };
  const errorMessage = errorCode
    ? (errorMessages[errorCode] ?? "Terjadi kesalahan. Silakan coba lagi atau hubungi admin.")
    : null;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9EBEB]">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7D6D6]">
      <div className="grid flex-1 grid-cols-1 md:grid-cols-2">
        <div className="relative hidden flex-col items-center justify-center p-12 md:flex">
          <Image
            src="/8eh.png"
            alt="8EH Radio Logo"
            width={300}
            height={300}
            className="object-contain"
            priority
          />
          <h2 className="mt-4 font-heading text-4xl font-bold italic text-[#E36F6F]">
            #MembentangBingkai
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-sm text-center">
            <div className="mb-8 md:hidden">
              <Image
                src="/8eh.png"
                alt="8EH Radio Logo"
                width={150}
                height={150}
                className="mx-auto"
                priority
              />
            </div>

            <h1 className="font-heading text-5xl font-semibold text-gray-900">
              Ahoy, Kru's!
            </h1>
            <p className="mb-4 mt-6 font-body text-sm text-gray-700">
              Login to your account
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-md border border-red-300 bg-red-100 px-4 py-3 text-left text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <ButtonPrimary
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex w-full items-center justify-center py-3 text-base"
            >
              <Image
                src="/google.svg"
                alt="Google Logo"
                width={20}
                height={20}
                className="mr-2"
              />
              <span>Log in with Google Account</span>
            </ButtonPrimary>
          </div>
        </div>
      </div>

      <footer className="mb-4 py-4 text-center font-body text-xs text-gray-500">
        © {new Date().getFullYear()} Technic 8EH Radio ITB. All rights reserved.
      </footer>
    </div>
  );
}
