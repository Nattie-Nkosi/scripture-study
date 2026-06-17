import "server-only";

import { getChapter } from "@/lib/scripture/client";
import { getGroqClient, TRANSLATION_MODEL } from "./groq";
import { getCachedChapter, saveChapterTranslation } from "@/lib/db/translations";

export interface SimpleVerse {
  n: number;
  text: string;
}

const MAX_BATCH = 20;

const SYSTEM_PROMPT = [
  "You rewrite King James Version scripture into clear, plain, modern English",
  "at about an 8th–9th grade reading level.",
  "Rules: preserve the exact meaning, names, places, numbers, and doctrine;",
  "do not add, omit, interpret, or editorialize; replace archaic words and",
  "grammar (thee, thou, wherefore, it came to pass) with natural modern wording;",
  "keep each verse separate and self-contained.",
  'Return ONLY valid JSON of the form {"verses":[{"n":<verse number>,"text":"<plain english>"}]},',
  "with exactly one entry per input verse, reusing the given verse numbers.",
].join(" ");

/** Get the Simple English version of a chapter, using the cache when possible
 *  and translating + storing on a miss. Translation always happens server-side. */
export async function getSimpleEnglishChapter(
  volume: string,
  book: string,
  chapter: number,
): Promise<SimpleVerse[]> {
  const kjv = await getChapter(book, chapter);
  const source: SimpleVerse[] = kjv.chapter.verses.map((v, i) => ({
    n: i + 1,
    text: v.text,
  }));

  const cached = await getCachedChapter(volume, book, chapter);
  if (cached && cached.length === source.length) {
    return cached
      .map((c) => ({ n: c.verse, text: c.text }))
      .sort((a, b) => a.n - b.n);
  }

  const translated = await translateVerses(source);

  await saveChapterTranslation(
    volume,
    book,
    chapter,
    TRANSLATION_MODEL,
    translated.map((v) => ({ verse: v.n, text: v.text })),
  );

  return translated;
}

async function translateVerses(verses: SimpleVerse[]): Promise<SimpleVerse[]> {
  const byNumber = new Map<number, string>();

  for (let i = 0; i < verses.length; i += MAX_BATCH) {
    const batch = verses.slice(i, i + MAX_BATCH);
    const result = await translateBatch(batch);
    for (const [n, text] of result) byNumber.set(n, text);
  }

  return verses.map((v) => {
    const text = byNumber.get(v.n);
    if (!text) throw new Error(`Translation missing for verse ${v.n}`);
    return { n: v.n, text };
  });
}

async function translateBatch(
  batch: SimpleVerse[],
): Promise<Map<number, string>> {
  const groq = getGroqClient();

  const user =
    "Rewrite each of these King James verses into plain modern English, " +
    "reusing the same verse numbers:\n\n" +
    batch.map((v) => `${v.n}. ${v.text}`).join("\n");

  const completion = await groq.chat.completions.create({
    model: TRANSLATION_MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";

  let parsed: { verses?: Array<{ n?: unknown; text?: unknown }> };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The model returned invalid JSON.");
  }

  const map = new Map<number, string>();
  for (const v of parsed.verses ?? []) {
    if (typeof v.n === "number" && typeof v.text === "string" && v.text.trim()) {
      map.set(v.n, v.text.trim());
    }
  }
  return map;
}
