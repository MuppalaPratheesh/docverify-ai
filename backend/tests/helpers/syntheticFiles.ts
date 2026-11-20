import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Synthetic fixture files only — never real personal documents.
 */
export function createSyntheticPdf(filePath?: string): string {
  const target =
    filePath ?? path.join(os.tmpdir(), `docverify-synth-${Date.now()}-${Math.random()}.pdf`);
  fs.writeFileSync(target, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  return target;
}

export function createSyntheticJpeg(filePath?: string): string {
  const target =
    filePath ?? path.join(os.tmpdir(), `docverify-synth-${Date.now()}-${Math.random()}.jpg`);
  // Minimal JPEG: SOI + APP0-ish + EOI markers sufficient for signature detection.
  const bytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
  fs.writeFileSync(target, bytes);
  return target;
}

export function createSyntheticPng(filePath?: string): string {
  const target =
    filePath ?? path.join(os.tmpdir(), `docverify-synth-${Date.now()}-${Math.random()}.png`);
  const bytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
    0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
    0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  fs.writeFileSync(target, bytes);
  return target;
}

export function createFakeTextFile(filePath?: string): string {
  const target =
    filePath ?? path.join(os.tmpdir(), `docverify-fake-${Date.now()}-${Math.random()}.txt`);
  fs.writeFileSync(target, 'not-a-real-document');
  return target;
}

export function cleanupFiles(paths: string[]): void {
  for (const filePath of paths) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore missing temp files
    }
  }
}
