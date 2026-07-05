/** Number of attempts before giving up on a transient network failure. */
const MAX_ATTEMPTS = 3;

/** `fetch` with a short retry. Node's `fetch` (undici) occasionally fails a
 *  socket with a bare "fetch failed" on an otherwise-healthy host, and a single
 *  blip shouldn't surface an error page. Only transient network *throws* are
 *  retried — a resolved Response (any HTTP status) is returned as-is, since
 *  error statuses are deterministic and shouldn't be hammered. */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  attempts: number = MAX_ATTEMPTS,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, 150 * attempt));
      }
    }
  }
  throw lastErr;
}
