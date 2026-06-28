// Shared between the server stream (chat-runner) and the client reader. A
// streamed assistant message that begins with this control character (ASCII
// "Start of Heading", non-printing) is a SYSTEM NOTICE — e.g. a rate-limit
// warning — not a real answer. The client strips the marker and renders the
// rest as a warning instead of a reply. A genuine answer never starts with it.
export const NOTICE_PREFIX = String.fromCharCode(1);
