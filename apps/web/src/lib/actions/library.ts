"use server";

import { listVolumes, getVolume } from "@/lib/scripture/client";
import {
  resolveReferenceQuery,
  type ReferenceJump,
} from "@/lib/scripture/reference-query";

export interface LibraryBook {
  volumeId: string;
  volumeTitle: string;
  bookId: string;
  bookTitle: string;
}

/** A flat list of every book across the standard works, for the command
 *  palette's instant client-side fuzzy navigation. Built from the cached
 *  volume/book endpoints, so it shares the request cache with the reader. */
export async function getLibraryIndex(): Promise<LibraryBook[]> {
  const { volumes } = await listVolumes();
  const perVolume = await Promise.all(
    volumes.map(async (v) => {
      const detail = await getVolume(v._id);
      return detail.books.map((b) => ({
        volumeId: v._id,
        volumeTitle: detail.title,
        bookId: b._id,
        bookTitle: b.title,
      }));
    }),
  );
  return perVolume.flat();
}

/** Resolve a typed reference (e.g. "John 3:16", "D&C 88:73") to a validated
 *  deep link with a verse preview, or null when it isn't a clean reference. */
export async function resolveReference(
  query: string,
): Promise<ReferenceJump | null> {
  return resolveReferenceQuery(query);
}
