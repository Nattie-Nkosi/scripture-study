"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

export default function ReadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn’t load the scripture text. The service may be temporarily
        unavailable.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/read" className={buttonVariants({ variant: "outline" })}>
          Library
        </Link>
      </div>
    </main>
  );
}
