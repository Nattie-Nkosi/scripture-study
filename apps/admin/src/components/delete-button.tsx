"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

// A two-click inline delete: the first click arms a Confirm/Cancel pair, the
// second runs the bound server action. No native confirm() dialogs.
export function DeleteButton({
  action,
  label = "Delete",
}: {
  action: () => Promise<boolean>;
  label?: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await action();
              setArmed(false);
              router.refresh();
            })
          }
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setArmed(false)}
          className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
    >
      <Trash2 className="size-3.5" />
      {label}
    </button>
  );
}
