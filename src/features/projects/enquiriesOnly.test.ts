import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { enquiryStatus } from './enquiryStatus.ts';

/**
 * DealDirect takes no money from users (owner decision, 2026-10-19).
 *
 * Builder units are enquiry-only and group buy is gone. The backend removed
 * `GET /bookings/payment-config`, `POST /bookings/:id/payment` and every
 * `/campaigns/*` route, and `POST /bookings` records an enquiry whatever it is
 * sent. This keeps the paid flow from coming back into the app by way of an
 * old branch, a copied screen or a stale endpoint. Comments are ignored, so
 * the history can still be written down.
 *
 * The Hubble rewards store is a different thing (the buyer spends points with
 * Hubble, not money with us) and none of these patterns touch it.
 */

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const REMOVED = [
  // Removed endpoints, and the client names that called them.
  /\/bookings\/payment-config/,
  /submitPayment/,
  /paymentConfig/,
  /\/payment-proof/,
  /\/campaigns/,
  /GROUP_BUY_ENABLED/,
  // Copy from the paid booking flow.
  /Book this unit/i,
  /Confirm booking/i,
  /Submit payment/i,
  /Pay the token/i,
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

describe('builder units are enquiry-only', () => {
  it('no screen or module refers to the removed payment or group-buy flows', () => {
    const found: string[] = [];
    for (const dir of ['src', 'app']) {
      for (const file of sourceFiles(join(mobileRoot, dir))) {
        const text = withoutComments(readFileSync(file, 'utf8'));
        for (const pattern of REMOVED) {
          const match = text.match(pattern);
          if (match) found.push(`${relative(mobileRoot, file)}: "${match[0]}"`);
        }
      }
    }
    assert.deepEqual(found, []);
  });

  it('the enquiry form still sends intent "enquiry", for a server from before the change', () => {
    // Without it, the pre-2026-10-19 server records a paid booking.
    const screen = withoutComments(
      readFileSync(join(mobileRoot, 'app/projects/unit/[unitTypeId].tsx'), 'utf8')
    );
    assert.match(screen, /createBooking\(\{[\s\S]*?intent: 'enquiry',[\s\S]*?\}\)/);
  });
});

describe('enquiry status', () => {
  it('reads an open enquiry as Sent and highlights it', () => {
    assert.deepEqual(enquiryStatus('enquiry'), { label: 'Sent', tone: 'accent' });
  });

  it('reads a withdrawn enquiry as Withdrawn', () => {
    assert.equal(enquiryStatus('cancelled').label, 'Withdrawn');
  });

  it('reads completed, legacy paid-flow and missing statuses as Closed', () => {
    for (const status of ['completed', 'payment_submitted', 'confirmed', 'rejected', '', undefined]) {
      assert.equal(enquiryStatus(status).label, 'Closed', String(status));
    }
  });
});
