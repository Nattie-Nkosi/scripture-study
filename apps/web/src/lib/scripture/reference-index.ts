import "server-only";
import { cache } from "react";

import { listVolumes, getVolume } from "./client";

export interface BookRef {
  volumeId: string;
  bookId: string;
  bookTitle: string;
}

/** The search API labels some books with a long heading instead of the short
 *  title the volume/book endpoints use (e.g. "The Book of Jarom" vs "Jarom",
 *  "St Matthew" vs "Matthew"), so a direct title lookup misses them and the
 *  result renders unlinked. These map each known heading to its short title.
 *  Number-stripped headings ("1 Samuel" -> "Samuel", the epistles of John ->
 *  "John") are intentionally omitted: they're ambiguous, and a wrong link is
 *  worse than an unlinked result. "The Actsof the Apostles" reproduces a typo
 *  in the API data. */
const SEARCH_TITLE_ALIASES: Record<string, string> = {
  "the proverbs": "proverbs",
  "st matthew": "matthew",
  "st mark": "mark",
  "st luke": "luke",
  "st john": "john",
  "the acts of the apostles": "acts",
  "the actsof the apostles": "acts",
  "the revelation": "revelation",
  "the first book of nephi": "1 nephi",
  "the second book of nephi": "2 nephi",
  "the book of jacob": "jacob",
  "the book of enos": "enos",
  "the book of jarom": "jarom",
  "the book of omni": "omni",
  "the words of mormon": "words of mormon",
  "the book of mosiah": "mosiah",
  "the book of alma": "alma",
  "the book of helaman": "helaman",
  "third nephi": "3 nephi",
  "fourth nephi": "4 nephi",
  "the book of mormon": "mormon",
  "the book of ether": "ether",
  "the book of moroni": "moroni",
  "book of moses": "moses",
  "the book of abraham": "abraham",
  "the articles of faith": "articles of faith",
};

/** Map of lowercased book title -> ids, used to turn a search result's book
 *  name (e.g. "Alma") into a reader URL. Built from the volume/book endpoints
 *  and cached per request. Also registers the search API's long-form headings
 *  (see SEARCH_TITLE_ALIASES) so those results link too. */
export const getBookIndexByTitle = cache(
  async (): Promise<Map<string, BookRef>> => {
    const { volumes } = await listVolumes();
    const map = new Map<string, BookRef>();

    await Promise.all(
      volumes.map(async (v) => {
        const detail = await getVolume(v._id);
        for (const b of detail.books) {
          map.set(b.title.toLowerCase(), {
            volumeId: v._id,
            bookId: b._id,
            bookTitle: b.title,
          });
        }
      }),
    );

    for (const [alias, title] of Object.entries(SEARCH_TITLE_ALIASES)) {
      const ref = map.get(title);
      if (ref) map.set(alias, ref);
    }

    return map;
  },
);

/** Map of book id -> { volumeId, bookTitle }, used to turn a cross reference's
 *  book id (e.g. "ether") into a reader URL. Cached per request. */
export const getBookIndexById = cache(
  async (): Promise<Map<string, { volumeId: string; bookTitle: string }>> => {
    const { volumes } = await listVolumes();
    const map = new Map<string, { volumeId: string; bookTitle: string }>();

    await Promise.all(
      volumes.map(async (v) => {
        const detail = await getVolume(v._id);
        for (const b of detail.books) {
          map.set(b._id, { volumeId: v._id, bookTitle: b.title });
        }
      }),
    );

    return map;
  },
);
