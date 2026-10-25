import Image from "next/image";
import Link from "next/link";

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
      <main className="mx-auto w-full max-w-360 flex-1 px-5 py-10 sm:py-14">
        <Frontispiece />

        <div className="mt-16 sm:mt-20">
          <OrgMindMap />
        </div>

        <p className="mt-12 max-w-2xl font-serif text-xs text-muted-foreground italic">
          Summarized from General Handbook: Serving in The Church of Jesus Christ
          of Latter-day Saints (December 2025). See the handbook for complete
          instructions.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

/** A dark plate that opens the page: the image of Christ beside the verse that
 *  frames everything below it. The plate takes the photo's own backdrop color in
 *  every theme, so the image's edges dissolve into it. */
function Frontispiece() {
  return (
    <section className="relative isolate flex min-h-120 items-end overflow-hidden rounded-2xl bg-[#1a1214] sm:min-h-136 sm:items-center">
      <div className="org-plate-img absolute inset-0 -z-10 sm:left-auto sm:w-[58%]">
        <Image
          src="/images/christus.jpg"
          alt="Thorvaldsen's Christus: a marble statue of the resurrected Jesus Christ with arms outstretched"
          fill
          preload
          sizes="(min-width: 640px) 58vw, 100vw"
          className="object-cover object-[50%_10%]"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-[#1a1214] via-[#1a1214]/55 to-transparent sm:bg-linear-to-r sm:from-[#1a1214] sm:via-[#1a1214]/80 sm:via-45% sm:to-transparent sm:to-75%"
      />
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-xl border border-white/10" />
      <p className="absolute bottom-7 left-14 hidden font-serif text-[0.7rem] text-white/40 italic sm:block">
        Christus · Bertel Thorvaldsen, 1821 · Thorvaldsens Museum
      </p>

      <figure className="max-w-xl px-7 pt-40 pb-9 sm:px-14 sm:py-16">
        <p className="org-rise eyebrow text-white/55">The chief corner stone</p>
        <blockquote
          className="org-rise mt-4 font-display text-[1.75rem] leading-snug font-light text-white/90 italic text-balance sm:text-4xl sm:leading-tight"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          &ldquo;Built upon the foundation of the apostles and prophets, Jesus Christ himself
          being the chief corner stone.&rdquo;
        </blockquote>
        <figcaption className="org-rise mt-6" style={{ "--i": 2 } as React.CSSProperties}>
          <Link
            href="/read/newtestament/ephesians/2#v20"
            className="eyebrow text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/70"
          >
            Ephesians 2:20
          </Link>
        </figcaption>
      </figure>
    </section>
  );
}
