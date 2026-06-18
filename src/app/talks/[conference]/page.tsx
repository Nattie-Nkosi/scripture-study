import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  getConference,
  fetchConferenceOrNotFound,
} from "@/lib/conference/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Props = {
  params: Promise<{ conference: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { conference } = await params;
  const data = await fetchConferenceOrNotFound(() => getConference(conference));
  return { title: data.title };
}

export default async function ConferencePage({ params }: Props) {
  const { conference } = await params;
  const data = await fetchConferenceOrNotFound(() =>
    getConference(conference, true),
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:py-20">
        <Link
          href="/talks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          General Conference
        </Link>

        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
          {data.title}
        </h1>

        <div className="mt-12 space-y-12">
          {data.sessions.map((session) => (
            <section key={session.name}>
              <h2 className="small-caps text-sm text-primary">
                {session.name}
              </h2>
              <ol className="mt-3 border-t border-border">
                {(session.talks ?? []).map((talk) => (
                  <li
                    key={talk._id}
                    className="border-b border-border last:border-b-0"
                  >
                    <Link
                      href={`/talks/${data._id}/${talk._id}`}
                      className="group flex items-baseline gap-4 py-4"
                    >
                      <span className="flex-1">
                        <span className="block font-display text-lg font-medium leading-snug transition-colors group-hover:text-primary text-balance">
                          {talk.title}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {talk.speaker}
                          {talk.role ? (
                            <span className="text-muted-foreground/70">
                              {" "}
                              · {talk.role}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 translate-x-0 self-center text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
