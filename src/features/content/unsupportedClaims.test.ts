import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Verification claims the platform cannot back.
 *
 * Nothing checks a listing, an owner's ownership or a developer before it is
 * shown. What IS checked: an owner confirms a mobile number by one-time code
 * before posting, and an admin can mark an account's identity as verified,
 * which the app shows as "Identity verified". Copy that promised more was
 * removed in privacy phase 1 (2026-10-17), on the website too; this keeps it
 * out of the app. Comments are ignored.
 */

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const UNSUPPORTED = [
  /100%\s*verified/i,
  /every (property )?listing is verified/i,
  /RERA[\s-]+verified/i,
  /verified (listings|properties|developers|builder projects?|owners)/i,
  /verified property/i,
  /verified,\s*(high-intent|intent-based|professional)/i,
  // The identity flag says who the person is, not that they own the property.
  />\s*Verified owner\s*</,
  /accessibilityLabel="Verified owner"/,
  // `isVerified` means "account usable" and proves nothing.
  /isVerified\s*\?\s*'Verified'/,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

describe('verification claims', () => {
  it('no screen or content page claims verification the platform does not perform', () => {
    const found: string[] = [];
    for (const dir of ['src', 'app']) {
      for (const file of sourceFiles(join(mobileRoot, dir))) {
        const text = withoutComments(readFileSync(file, 'utf8'));
        for (const pattern of UNSUPPORTED) {
          const match = text.match(pattern);
          if (match) found.push(`${relative(mobileRoot, file)}: "${match[0]}"`);
        }
      }
    }
    assert.deepEqual(found, []);
  });
});
