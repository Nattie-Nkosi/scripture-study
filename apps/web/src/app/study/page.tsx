import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StudyContent } from "@/components/study/study-content";

export const metadata = {
  title: "My study",
};

export default function StudyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <p className="eyebrow text-primary">Personal</p>
        <h1 className="mt-3 font-display text-5xl font-light tracking-tight sm:text-6xl">
          My study
        </h1>
        <p className="mt-4 max-w-prose font-serif text-muted-foreground italic">
          Saved on this device for now — syncing across your devices is coming.
        </p>
        <StudyContent />
      </main>
      <SiteFooter />
    </>
  );
}
