import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="w-full max-w-xl space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Phase 1 · Project setup
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Scripture Study
          </h1>
          <p className="text-lg text-muted-foreground">
            A clean, modern reader for the LDS standard works — with AI-powered
            Simple English and a grounded study assistant.
          </p>
        </div>

        <ul className="mx-auto max-w-sm space-y-2 text-left text-sm text-muted-foreground">
          <li>✓ Next.js (App Router) + TypeScript</li>
          <li>✓ Tailwind CSS v4</li>
          <li>✓ shadcn/ui</li>
          <li>✓ Folder structure + .env.example</li>
        </ul>

        <Button>Setup is working</Button>
      </div>
    </main>
  );
}
