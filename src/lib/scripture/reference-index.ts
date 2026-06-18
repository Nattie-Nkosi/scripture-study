import "server-only";
import { cache } from "react";

import { listVolumes, getVolume } from "./client";

export interface BookRef {
  volumeId: string;
  bookId: string;
  bookTitle: string;
}

/** Map of lowercased book title -> ids, used to turn a search result's book
 *  name (e.g. "Alma") into a reader URL. Built from the volume/book endpoints
 *  and cached per request. */
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
