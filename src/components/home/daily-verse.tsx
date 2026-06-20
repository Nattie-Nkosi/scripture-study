"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Verse = { reference: string; text: string; href: string };

// A curated rotation of beloved passages. Kept client-side and picked by the
// day so the home page stays static, works offline, and changes daily without a
// rebuild. The card links to the authoritative text in the reader.
const VERSES: Verse[] = [
  { reference: "John 3:16", href: "/read/newtestament/john/3#v16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { reference: "Proverbs 3:5", href: "/read/oldtestament/proverbs/3#v5", text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding." },
  { reference: "Philippians 4:13", href: "/read/newtestament/philippians/4#v13", text: "I can do all things through Christ which strengtheneth me." },
  { reference: "Isaiah 41:10", href: "/read/oldtestament/isaiah/41#v10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee." },
  { reference: "Joshua 1:9", href: "/read/oldtestament/joshua/1#v9", text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest." },
  { reference: "Matthew 11:28", href: "/read/newtestament/matthew/11#v28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { reference: "Psalm 23:1", href: "/read/oldtestament/psalms/23#v1", text: "The Lord is my shepherd; I shall not want." },
  { reference: "Romans 8:28", href: "/read/newtestament/romans/8#v28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { reference: "2 Nephi 2:25", href: "/read/bookofmormon/2nephi/2#v25", text: "Adam fell that men might be; and men are, that they might have joy." },
  { reference: "1 Nephi 3:7", href: "/read/bookofmormon/1nephi/3#v7", text: "I will go and do the things which the Lord hath commanded, for I know that the Lord giveth no commandments unto the children of men, save he shall prepare a way for them." },
  { reference: "Alma 37:6", href: "/read/bookofmormon/alma/37#v6", text: "By small and simple things are great things brought to pass; and small means in many instances doth confound the wise." },
  { reference: "Ether 12:27", href: "/read/bookofmormon/ether/12#v27", text: "If they humble themselves before me, and have faith in me, then will I make weak things become strong unto them." },
  { reference: "Moroni 10:4", href: "/read/bookofmormon/moroni/10#v4", text: "Ask God, the Eternal Father, in the name of Christ, if these things are not true; and if ye shall ask with a sincere heart, with real intent, having faith in Christ, he will manifest the truth of it unto you." },
  { reference: "Mosiah 2:17", href: "/read/bookofmormon/mosiah/2#v17", text: "When ye are in the service of your fellow beings ye are only in the service of your God." },
  { reference: "Doctrine and Covenants 6:36", href: "/read/doctrineandcovenants/doctrineandcovenants/6#v36", text: "Look unto me in every thought; doubt not, fear not." },
  { reference: "Doctrine and Covenants 18:10", href: "/read/doctrineandcovenants/doctrineandcovenants/18#v10", text: "Remember the worth of souls is great in the sight of God." },
  { reference: "Moses 1:39", href: "/read/pearlofgreatprice/moses/1#v39", text: "For behold, this is my work and my glory—to bring to pass the immortality and eternal life of man." },
  { reference: "Matthew 5:16", href: "/read/newtestament/matthew/5#v16", text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
  { reference: "James 1:5", href: "/read/newtestament/james/1#v5", text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him." },
  { reference: "Psalm 46:10", href: "/read/oldtestament/psalms/46#v10", text: "Be still, and know that I am God." },
  { reference: "Isaiah 40:31", href: "/read/oldtestament/isaiah/40#v31", text: "They that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
  { reference: "Hebrews 11:1", href: "/read/newtestament/hebrews/11#v1", text: "Now faith is the substance of things hoped for, the evidence of things not seen." },
  { reference: "2 Nephi 31:20", href: "/read/bookofmormon/2nephi/31#v20", text: "Press forward with a steadfastness in Christ, having a perfect brightness of hope, and a love of God and of all men." },
  { reference: "Proverbs 16:3", href: "/read/oldtestament/proverbs/16#v3", text: "Commit thy works unto the Lord, and thy thoughts shall be established." },
];

const emptySubscribe = () => () => {};

// Today's index, read from the clock as external state. Returns -1 during SSR
// and the first client render so server and client markup match (no hydration
// mismatch), then the day's verse after mount. Same idiom as the theme selector.
function useDailyIndex(length: number): number {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => Math.floor(Date.now() / 86_400_000) % length,
    () => -1,
  );
}

export function DailyVerse({ className }: { className?: string }) {
  const index = useDailyIndex(VERSES.length);
  if (index < 0) return null;

  const verse = VERSES[index];

  return (
    <Link
      href={verse.href}
      className={`group block rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 ${className ?? ""}`}
    >
      <p className="small-caps text-xs text-primary">Verse of the day</p>
      <p className="mt-2 line-clamp-4 font-serif leading-relaxed text-foreground/90 italic">
        {verse.text}
      </p>
      <span className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-primary">
        {verse.reference}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
