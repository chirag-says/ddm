import type { Block } from './pages/model';

/**
 * How to reach a human.
 *
 * Taken from the website's footer (`Footer.jsx`) and repeated by its privacy
 * policy and terms, rather than invented. The website's own contact page shows
 * different numbers; see the note in `pages/contact.ts` for why those are not
 * used.
 */
export const SUPPORT_CONTACT = {
  email: 'contact@dealdirect.in',
  phone: '+919289638963',
} as const;

/**
 * The Grievance Officer (DPDP), as the website's `GrievanceOfficer` block in
 * `components/Legal/LegalDocument.jsx` prints it. One block for the privacy
 * policy, the terms and the contact page, so the three cannot disagree.
 */
export const GRIEVANCE_OFFICER: Extract<Block, { type: 'contact' }> = {
  type: 'contact',
  name: 'Mrs. Arti Ashok Jadhav',
  role: 'Data Protection & Grievance Officer',
  org: 'Agrawal Business Network LLP',
  address: '129, Growmore Tower, Sector 2, Kharghar, Navi Mumbai 410210, Maharashtra',
  email: 'grievance@dealdirect.in',
  phone: '+91 22 4608 9735',
};
