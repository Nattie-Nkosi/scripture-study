import "server-only";
import { getSql } from "./client";

/** One General Conference talk that cites a given verse, with the paragraph(s)
 *  whose footnote(s) carry the citation. */
export interface VerseCitationTalk {
  talkId: string;
  conferenceId: string;
  year: number;
  month: number;
  title: string;
  speaker: string;
  paragraphs: number[];
}

export interface VerseCitations {
  total: number; // total talks citing the verse (before any limit)
  talks: VerseCitationTalk[]; // newest first
  byDecade: { decade: number; count: number }[]; // talks per decade, ascending
}

const EMPTY: VerseCitations = { total: 0, talks: [], byDecade: [] };

/** Conference talks that cite a specific verse, newest first, with a by-decade
 *  histogram of how often it has been taught. A whole-chapter citation
 *  (verse_start/end null) matches every verse in the chapter. Returns empty when
 *  the database isn't configured or the index hasn't been built, so the reader
 *  degrades to simply showing nothing (same pattern as ./summaries.ts). */
export async function getVerseCitations(
  ref: { book: string; chapter: number; verse: number },
  opts: { limit?: number } = {},
): Promise<VerseCitations> {
  const sql = getSql();
  if (!sql) return EMPTY;

  const { book, chapter, verse } = ref;
  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return EMPTY;
  }

  try {
    const rows = (await sql`
      select talk_id, conference_id, year, month, title, speaker,
             array_agg(distinct paragraph order by paragraph) as paragraphs
      from talk_citations
      where book = ${book}
        and chapter = ${chapter}
        and (verse_start is null or (${verse} >= verse_start and ${verse} <= verse_end))
      group by talk_id, conference_id, year, month, title, speaker
      order by year desc, month desc, title asc
    `) as {
      talk_id: string;
      conference_id: string;
      year: number;
      month: number;
      title: string;
      speaker: string;
      paragraphs: number[] | null;
    }[];

    const talks: VerseCitationTalk[] = rows.map((r) => ({
      talkId: r.talk_id,
      conferenceId: r.conference_id,
      year: Number(r.year),
      month: Number(r.month),
      title: r.title,
      speaker: r.speaker,
      paragraphs: (r.paragraphs ?? []).map(Number),
    }));

    const decades = new Map<number, number>();
    for (const t of talks) {
      const d = Math.floor(t.year / 10) * 10;
      decades.set(d, (decades.get(d) ?? 0) + 1);
    }
    const byDecade = [...decades.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ decade, count }));

    return {
      total: talks.length,
      talks: opts.limit ? talks.slice(0, opts.limit) : talks,
      byDecade,
    };
  } catch (err) {
    console.error("[talk-citations] read error:", (err as Error).message);
    return EMPTY;
  }
}
