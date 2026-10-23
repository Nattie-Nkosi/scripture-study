import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrgMindMap } from "@/components/organization/mind-map";

export const metadata = {
  title: "Church Organization",
  description:
    "An interactive map of Church leaders and members, from the First Presidency to the ward, summarized from the General Handbook.",
};

export default function OrganizationPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[90rem] flex-1 px-5 py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">Church Organization</p>
          <h1 className="mt-3 font-display text-5xl font-light tracking-tight sm:text-6xl">
            Who serves where
          </h1>
          <p className="mt-4 font-serif text-lg leading-relaxed text-muted-foreground text-pretty">
            A map of the Church&apos;s leaders and members — from the First
            Presidency to your ward and home. Select any calling to see what it
            does, who calls it, and where the General Handbook explains it.
          </p>
        </div>

        <div className="mt-12">
          <OrgMindMap />
        </div>

        <p className="mt-10 max-w-2xl font-serif text-xs text-muted-foreground italic">
          Summarized from General Handbook: Serving in The Church of Jesus Christ
          of Latter-day Saints (December 2025). See the handbook for complete
          instructions.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
