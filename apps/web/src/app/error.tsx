"use client";

import * as React from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        An unexpected error occurred. You can try again, or head back to the
        library.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/read" className={buttonVariants({ variant: "outline" })}>
          Library
        </Link>
      </div>
      {error.digest && (
        <p className="mt-8 text-xs text-muted-foreground">
          Reference code: {error.digest}
        </p>
      )}
    </main>
  );
}
