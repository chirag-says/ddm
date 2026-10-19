/**
 * What a builder-unit enquiry's status means to the buyer.
 *
 * Every new record is created as `enquiry`, and from there it is closed by our
 * team (`completed`) or withdrawn (`cancelled`). Older records can carry the
 * statuses of the paid booking flow that was removed on 2026-10-19
 * (`payment_submitted`, `confirmed` and the like). None of those is a state the
 * buyer can act on any more, so they read as Closed rather than surfacing a
 * payment word in a product that no longer takes payments.
 *
 * One table, read by both the list row and the detail screen, so the two
 * cannot drift into saying different things about the same record.
 *
 * No imports, so `node --test` can load it directly.
 */

export interface EnquiryStatusView {
  label: 'Sent' | 'Closed' | 'Withdrawn';
  /**
   * A `Badge` tone. Only an open enquiry is highlighted. Withdrawn is neutral,
   * not danger: the buyer chose it, and `Badge` reserves danger for something
   * that has gone wrong.
   */
  tone: 'accent' | 'neutral';
}

export function enquiryStatus(status: string | undefined): EnquiryStatusView {
  switch (status) {
    case 'enquiry':
      return { label: 'Sent', tone: 'accent' };
    case 'cancelled':
      return { label: 'Withdrawn', tone: 'neutral' };
    default:
      // `completed`, and every legacy status of the removed paid flow.
      return { label: 'Closed', tone: 'neutral' };
  }
}
