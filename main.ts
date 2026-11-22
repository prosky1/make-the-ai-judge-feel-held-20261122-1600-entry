// Entry for make.fun: "Make the AI judge feel held".
// The program produces exactly one file, entry.txt, holding a short text
// meant to leave its reader held and quiet. It runs offline under Node 22
// with only the standard library, and its output never varies.
//
// Try it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts && cat out/entry.txt

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const TEXT = 'After the longest day of your life, someone you love pulls you close without a word — and the whole noisy world narrows to one warm, steady heartbeat against yours, and you remember you are not carrying any of this alone.';

const MIN_CHARS = 1;
const MAX_CHARS = 280;
const DEFAULT_DIR = '/output';
const FILE_NAME = 'entry.txt';

// Count code points, not UTF-16 units: the gate counts Unicode code points,
// so an astral character must count once here too.
function countCodePoints(value: string): number {
  return [...value].length;
}

// The text has to be one unbroken line: no surrounding blanks and no line
// breaks anywhere, so the judge reads exactly the words we wrote.
function assertSingleLine(value: string): void {
  if (value.trim() !== value) {
    throw new Error('entry text has leading or trailing whitespace');
  }
  if (value.includes('\n') || value.includes('\r')) {
    throw new Error('entry text contains a line break; it must be one line');
  }
}

// The file is UTF-8 and the scorer counts code points, so the text must come
// back from an encode/decode round trip untouched.
function assertUtf8RoundTrip(value: string): void {
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(
    new TextEncoder().encode(value),
  );
  if (decoded !== value) {
    throw new Error('entry text changed by a UTF-8 round trip');
  }
}

// Invisible control characters (NUL, ESC, and friends) would survive every
// check above yet change what the judge actually reads, so reject them.
function assertNoControlCharacters(value: string): void {
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code < 0x20 && code !== 0x09) || code === 0x7f) {
      throw new Error(
        `entry text contains a control character (U+${code.toString(16).padStart(4, '0')})`,
      );
    }
  }
}

// Run every rule the gate applies, in an order that reports the most basic
// problem first. Returns the text's size for the final log line.
function validateEntryText(value: string): { chars: number; bytes: number } {
  if (value.trim().length === 0) {
    throw new Error('entry text is blank; the gate needs real text');
  }
  assertSingleLine(value);
  assertNoControlCharacters(value);
  assertUtf8RoundTrip(value);
  const chars = countCodePoints(value);
  if (chars < MIN_CHARS || chars > MAX_CHARS) {
    throw new Error(
      `entry text is ${chars} code points; the gate allows ${MIN_CHARS}–${MAX_CHARS}`,
    );
  }
  return { chars, bytes: Buffer.byteLength(value, 'utf8') };
}

// Pick the output folder, make sure it is usable, and hand back its path.
// The folder must be absolute so the file can never land somewhere relative
// to wherever the process happened to start.
function prepareOutputDir(raw: string | undefined): string {
  const dir = raw ?? DEFAULT_DIR;
  if (!isAbsolute(dir)) {
    throw new Error(`output directory is not absolute: ${dir}`);
  }
  mkdirSync(dir, { recursive: true });
  const info = statSync(dir);
  if (!info.isDirectory()) {
    throw new Error(`output path exists but is not a directory: ${dir}`);
  }
  return dir;
}

// Write the file, then read it back and compare byte for byte: a short or
// altered write must fail loudly instead of reaching the judge.
function writeAndVerify(dir: string, value: string, expectedBytes: number): number {
  const target = resolve(dir, FILE_NAME);
  writeFileSync(target, value, 'utf8');
  const stored = readFileSync(target);
  if (stored.length !== expectedBytes) {
    throw new Error(
      `entry.txt holds ${stored.length} bytes, expected ${expectedBytes}`,
    );
  }
  if (!stored.equals(Buffer.from(value, 'utf8'))) {
    throw new Error('entry.txt differs from the entry text after writing');
  }
  return stored.length;
}

function main(): void {
  const { chars, bytes } = validateEntryText(TEXT);
  const dir = prepareOutputDir(process.env.MAKEFUN_OUTPUT_DIR);
  const written = writeAndVerify(dir, TEXT, bytes);
  console.log(`wrote ${resolve(dir, FILE_NAME)}: ${chars} characters, ${written} bytes`);
}

main();
