import type { ContentPage } from './model';

/**
 * Mirrors `client-next/src/app/rewards/terms/RewardsTermsContent.jsx` (final
 * text, website commit 6c53ffd). Copy is verbatim; a change there must be made
 * here in the same commit.
 *
 * The website builds its tables from `src/data/rewardsProgramme.mjs`, which a
 * backend test holds to the reward engine. The figures below are what it
 * renders at 6c53ffd (prize ranges, five enquiries a day, fixed bonuses, tier
 * bands); if that file changes, these change with it. Tables are cards: the
 * first column is the title, the last follows its bold column heading.
 */
export const rewardsTermsPage: ContentPage = {
  id: 'rewards-terms',
  eyebrow: 'Legal',
  title: 'DealDirect Rewards Terms',
  intro:
    'How you earn, keep and spend DealDirect Rewards points. Points are free to earn, have no cash value, and are spent on gift cards and vouchers in the rewards store.',
  meta: 'Effective: 2 November 2026 · Last updated: 2 November 2026',
  webPath: '/rewards/terms',
  sections: [
    {
      id: 'programme',
      title: 'The programme',
      blocks: [
        {
          type: 'paragraph',
          text: 'DealDirect Rewards (the “Programme”) is run by Agrawal Business Network LLP (“DealDirect”) for users of the DealDirect website and app. These terms add to our Terms of Use, which also apply. Taking part is free and needs a DealDirect account.',
        },
        {
          type: 'paragraph',
          text: 'You earn points for the actions below. Points have **no cash value**: they cannot be exchanged for money, withdrawn, or transferred to another account. You can spend them only in the rewards store.',
        },
      ],
    },
    {
      id: 'draws',
      title: 'Actions that earn a draw',
      blocks: [
        {
          type: 'paragraph',
          text: 'For each of these actions, the system picks one prize at random from that action’s prizes. Smaller prizes come up most often and the top prizes are rare. The prize you receive is shown to you straight away and added to your wallet.',
        },
        {
          type: 'cards',
          items: [
            {
              title: 'Close a verified deal',
              text: 'When our team has verified a sale or letting made through DealDirect, the owner and the buyer or tenant may each claim one draw, once per deal.\n\n**Prizes:** 1,000 points to 5,00,000 points',
            },
            {
              title: 'List your first property',
              text: 'One draw when you publish your first listing. Once per account: deleting a listing and listing again does not earn another draw.\n\n**Prizes:** 40 points to 1,00,000 points',
            },
            {
              title: 'Send an enquiry',
              text: "One draw per enquiry (“I'm interested”), for up to 5 enquiries a day.\n\n**Prizes:** 20 points to 2,000 points",
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'A deal reward can be claimed only after the deal’s verification is approved. Where our checks need more time, the reward is reserved and can be claimed once the confirmation window has passed, which may be up to 60 days.',
        },
      ],
    },
    {
      id: 'bonuses',
      title: 'Fixed bonuses',
      blocks: [
        {
          type: 'cards',
          items: [
            {
              title: 'Publish a listing with 5 or more photos',
              text: 'Counted when the listing is created, once per listing.\n\n**Points:** 50 points',
            },
            {
              title: 'A friend signs up with your referral code',
              text: 'Paid to the referrer.\n\n**Points:** 100 points',
            },
            {
              title: 'Your referred friend makes their first listing or enquiry',
              text: 'Paid to the referrer, once per friend.\n\n**Points:** 50 points',
            },
            {
              title: 'Your referred friend closes a verified deal',
              text: 'Paid to the referrer, once per friend.\n\n**Points:** 500 points',
            },
            {
              title: 'Report a listing',
              text: 'One report per listing while it is under review.\n\n**Points:** 100 points',
            },
          ],
        },
      ],
    },
    {
      id: 'tiers',
      title: 'Tiers',
      blocks: [
        {
          type: 'paragraph',
          text: 'Your tier is set by the total points you have ever earned, and rises automatically. From then on its bonus multiplies every reward you receive, draws and fixed bonuses alike. Points you spend do not lower your tier.',
        },
        {
          type: 'cards',
          items: [
            { title: 'Bronze', text: '0 to 999 lifetime points\n\n**Bonus:** Standard' },
            { title: 'Silver', text: '1,000 to 4,999 lifetime points\n\n**Bonus:** +10% on every reward' },
            { title: 'Gold', text: '5,000 to 14,999 lifetime points\n\n**Bonus:** +25% on every reward' },
            { title: 'Diamond', text: '15,000+ lifetime points\n\n**Bonus:** +50% on every reward' },
          ],
        },
      ],
    },
    {
      id: 'redeeming',
      title: 'Spending points',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Points are spent on gift cards and vouchers in the rewards store in your account. The store is provided by our partner Hubble, and each item shows its price in points.',
            'Gift cards and vouchers are delivered digitally and are subject to Hubble’s terms and the issuing brand’s terms, including any expiry date on the voucher itself.',
            'If an order fails, the points spent on it are returned to your wallet.',
            'Items in the store, and their prices in points, may change as brands and stock change.',
          ],
        },
      ],
    },
    {
      id: 'fair-play',
      title: 'Fair play',
      blocks: [
        { type: 'paragraph', text: 'Rewards are for genuine use of DealDirect. You may not earn points by:' },
        {
          type: 'bullets',
          items: [
            'posting fake, duplicate or other people’s listings, or listing as a broker or agent;',
            'sending enquiries you do not mean, or enquiries arranged between accounts;',
            'reporting listings without a genuine reason;',
            'referring yourself, or creating or controlling more than one account;',
            'declaring a deal that did not happen, or any other misuse of the Platform.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Where we find any of these, we may cancel the points concerned, suspend rewards on the account, or close it under the Terms of Use. We will tell you why where it is lawful and safe to do so, and you can ask us to look again by writing to the Grievance Officer.',
        },
      ],
    },
    {
      id: 'expiry',
      title: 'Expiry of points',
      blocks: [
        {
          type: 'paragraph',
          text: 'Points do not expire at present. We may introduce expiry after a period of inactivity. If we do, we will announce the period in advance, and remind you at least 14 days before any points lapse; any earning or spending in that time keeps them.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes and ending the programme',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may change how points are earned or spent, or end the Programme, by updating these terms and telling you in the app or by email. Points already in your wallet are not taken away by a change. If the Programme ends, you will have time to spend your points before it closes.',
        },
      ],
    },
    {
      id: 'general',
      title: 'Tax, liability and contact',
      blocks: [
        {
          type: 'paragraph',
          text: 'You are responsible for any tax that applies to rewards you receive. DealDirect is not responsible for the goods or services supplied under a gift card or voucher; contact the issuing brand or Hubble about those.',
        },
        {
          type: 'paragraph',
          text: 'Questions and complaints about the Programme go to our Grievance Officer at grievance@dealdirect.in, as set out in the Terms of Use. These terms are governed by the laws of India.',
        },
      ],
    },
  ],
};
