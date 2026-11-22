// make.fun entry: make-the-ai-judge-feel-held-20261122-1600 (Node 22, stdlib only).
// Writes one fixed, relaxing text to /output/entry.txt.
// Deterministic: no network, no randomness, no environment-dependent output.
//
// Local run (the grader uses /output directly):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts && cat out/entry.txt

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const TEXT =
  'After the longest day of your life, someone you love pulls you close without a word — and the whole noisy world narrows to one warm, steady heartbeat against yours, and you remember you are not carrying any of this alone.';

// The competition requires 1–280 characters (Unicode code points) and text
// that is not only whitespace. Refuse to write instead of producing an entry
// that cannot be judged.
const CHAR_COUNT = [...TEXT].length;
if (TEXT.trim().length === 0) {
  throw new Error('entry text is empty or whitespace-only; refusing to write');
}
if (CHAR_COUNT < 1 || CHAR_COUNT > 280) {
  throw new Error(`entry text is ${CHAR_COUNT} characters; it must be 1–280 characters`);
}

// The entry is a single line: no leading/trailing whitespace and no embedded
// newline, so a stray space or line break can never silently change what the
// judge reads (and the tie-break favours fewer bytes).
if (TEXT !== TEXT.trim() || TEXT.includes('\n') || TEXT.includes('\r')) {
  throw new Error('entry text must be a single line with no leading/trailing whitespace or newline');
}

// The text must survive a UTF-8 round-trip unchanged: the file is UTF-8 and
// the scorer counts Unicode code points, so any character that does not
// round-trip would change the judged text.
const ROUND_TRIP = new TextDecoder('utf-8', { fatal: true }).decode(
  new TextEncoder().encode(TEXT),
);
if (ROUND_TRIP !== TEXT) {
  throw new Error('entry text does not survive a UTF-8 round-trip unchanged');
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// Guard the destination: it must exist and be a directory, and the output
// path must be absolute so the entry can never land in an unexpected place.
if (!isAbsolute(OUTPUT_DIR)) {
  throw new Error(`output directory must be an absolute path, got: ${OUTPUT_DIR}`);
}
if (!existsSync(OUTPUT_DIR) || !statSync(OUTPUT_DIR).isDirectory()) {
  throw new Error(`output directory is not a directory after creation: ${OUTPUT_DIR}`);
}
const TARGET = join(OUTPUT_DIR, 'entry.txt');
writeFileSync(TARGET, TEXT, 'utf8');

// Read the file back and demand it matches byte-for-byte, so a truncated or
// altered write fails loudly instead of being submitted.
const WRITTEN = readFileSync(TARGET);
const EXPECTED_BYTES = Buffer.byteLength(TEXT, 'utf8');
if (WRITTEN.length !== EXPECTED_BYTES) {
  throw new Error(`entry.txt is ${WRITTEN.length} bytes, expected ${EXPECTED_BYTES} bytes`);
}
if (!WRITTEN.equals(Buffer.from(TEXT, 'utf8'))) {
  throw new Error('entry.txt does not match the entry text byte-for-byte after writing');
}

console.log(`wrote ${TARGET}: ${CHAR_COUNT} characters, ${WRITTEN.length} bytes`);
