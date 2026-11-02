// Explicit `.ts`: imported by `pages.test.ts` under `node --test`; see contact.ts.
import { GRIEVANCE_OFFICER } from '../support.ts';
import type { ContentPage, Section } from './model';

/**
 * Mirrors `client-next/src/app/terms/TermsContent.jsx` (final DPDP text,
 * website commit 6c53ffd). Copy is verbatim; a change there must be made here
 * in the same commit. Sections are accordions, the first one open: sixteen
 * clauses, open, are a wall on a phone.
 */
const sections: Omit<Section, 'collapsible'>[] = [
  {
    id: 'about',
    title: 'About these terms',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms of Use (“Terms”) govern your use of DealDirect, the website at dealdirect.in and the DealDirect mobile application (together, the “Platform”). The Platform is operated by **Agrawal Business Network LLP**, a limited liability partnership registered in India, with its registered office at 129, Growmore Tower, Sector 2, Kharghar, Navi Mumbai 410210, Maharashtra (“DealDirect”, “we”, “us”).',
      },
      {
        type: 'paragraph',
        text: 'By creating an account, or by using the Platform without one, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the Platform.',
      },
      {
        type: 'paragraph',
        text: 'These Terms are an electronic record under the Information Technology Act, 2000 and the rules made under it, and are published in accordance with Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. They do not need a physical or digital signature.',
      },
    ],
  },
  {
    id: 'what-we-are',
    title: 'What DealDirect is, and is not',
    blocks: [
      {
        type: 'paragraph',
        text: 'DealDirect is an online platform where property owners list homes and commercial spaces for sale or rent, and where buyers and tenants find them and contact the owner directly. It also publishes information about builder projects.',
      },
      {
        type: 'bullets',
        items: [
          '**We are not a broker or agent.** We do not represent any owner, buyer, tenant or builder, we do not negotiate on anyone’s behalf, and we are not a party to any sale, lease or other agreement you make with another user.',
          '**We do not charge fees or take money from users.** Listing a property, searching, and contacting owners are free. We never ask you to pay a token, booking amount or deposit through the Platform. If anyone claiming to be from DealDirect asks you for money, do not pay, and report it to us.',
          '**Listings are written by users.** We may review listings at any time and may verify some owners or documents, but we do not guarantee the accuracy of any listing, its title, its price or the identity of its owner. Inspect the property and its documents yourself, and take independent legal advice, before you pay anyone or sign anything.',
          '**Builder projects.** Project information is based on material supplied by the builder. It is not an offer or an advertisement by DealDirect. Check the project’s registration with the relevant Real Estate Regulatory Authority (RERA) before you book.',
        ],
      },
      {
        type: 'paragraph',
        text: 'As a platform that hosts content provided by users, DealDirect is an intermediary within the meaning of the Information Technology Act, 2000.',
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Eligibility and your account',
    blocks: [
      {
        type: 'bullets',
        items: [
          'You must be 18 or older and competent to contract under the Indian Contract Act, 1872 to create an account, and you confirm this when you sign up. DealDirect serves users in India only. We will delete an account if we learn that it belongs to someone under 18.',
          'Give accurate information when you register and keep it up to date. We verify your mobile number with a one-time password before you can list a property or send an enquiry.',
          'Keep your password private. You are responsible for activity on your account. Tell us at once at grievance@dealdirect.in if you think someone else has used it.',
          'You may sign in with Google instead of a password. You can delete your account at any time, as described on Delete your account.',
        ],
      },
    ],
  },
  {
    id: 'listings',
    title: 'Listing a property',
    blocks: [
      { type: 'paragraph', text: 'If you list a property, you confirm that:' },
      {
        type: 'bullets',
        items: [
          'you own it, or are authorised in writing by the owner to list it;',
          'the details, price, photos and availability are true and current, and you will update or remove the listing when they change, or when the property is sold or let;',
          'you have the right to publish every photo and document you upload;',
          'the property may lawfully be sold or let as described.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Each owner account can have one listing at a time. Your listing is published as soon as you submit it. We may review it at any time and may correct the category or property type, ask you for changes or documents, unpublish it, or remove it, including where we receive a complaint about it.',
      },
    ],
  },
  {
    id: 'enquiries',
    title: 'Enquiries and contact between users',
    blocks: [
      {
        type: 'bullets',
        items: [
          'When you tap “I’m interested” on a listing, your name, email address and mobile number are shared with the owner so they can reply, and the owner is notified by email, WhatsApp and in the app. The owner’s phone number is shown to you once the owner responds.',
          'You can have up to five open enquiries on listings that are still available. Saving a listing to your shortlist is private and does not notify the owner.',
          'Use another user’s contact details only to discuss the property concerned. Do not add them to marketing lists, share them, or contact them after they have asked you to stop.',
          'Enquiries about builder projects reach the DealDirect team. Our team passes your name, phone number and email address to the builder of that project so the builder can contact you.',
        ],
      },
    ],
  },
  {
    id: 'conduct',
    title: 'What you must not do',
    blocks: [
      {
        type: 'paragraph',
        text: 'You must not host, display, upload, publish, share or transmit any information that:',
      },
      {
        type: 'bullets',
        items: [
          'belongs to another person and to which you have no right;',
          'is obscene, pornographic, paedophilic, invasive of another’s privacy (including bodily privacy), insulting or harassing on the basis of gender, racially or ethnically objectionable, relating to or encouraging money laundering or gambling, or promoting enmity between groups on the grounds of religion or caste with the intent to incite violence;',
          'is harmful to a child;',
          'infringes any patent, trademark, copyright or other proprietary right;',
          'deceives or misleads about its origin, or knowingly and intentionally communicates misinformation or information that is patently false or misleading;',
          'impersonates another person;',
          'threatens the unity, integrity, defence, security or sovereignty of India, friendly relations with foreign States, or public order, or causes incitement to any cognisable offence, or prevents investigation of any offence, or insults another nation;',
          'contains software viruses or any other code designed to interrupt, destroy or limit any computer resource;',
          'violates any law for the time being in force.',
        ],
      },
      { type: 'paragraph', text: 'In addition, you must not:' },
      {
        type: 'bullets',
        items: [
          'post a fake, duplicate or bait listing, or a property that is not available;',
          'refuse or restrict a sale or letting, or word a listing, so as to discriminate on the basis of religion, caste, community, gender, marital status or food habits, where the law prohibits it;',
          'ask another user for money on the pretext of DealDirect, or collect advance payments for a property you are not entitled to sell or let;',
          'copy, scrape or harvest listings or user details by automated means, or interfere with the security or working of the Platform;',
          'create more than one account to get around a limit, a suspension or a refusal.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We may remove content that breaks these rules, suspend or close the accounts involved, and report unlawful activity to the authorities. Where we are required by law, we will act on a court order or a notice from an authorised government agency within the time the law sets.',
      },
    ],
  },
  {
    id: 'rewards',
    title: 'Rewards points',
    blocks: [
      {
        type: 'bullets',
        items: [
          'You may earn points for actions such as listing a property, sending an enquiry or referring a friend. The current actions and amounts are shown in the app.',
          'Points have no cash value. They cannot be exchanged for money or transferred. They can be redeemed for gift cards and vouchers in the rewards store at the rate shown there (currently 1 point = ₹0.05 of store value).',
          'The rewards store is provided by Hubble, a third-party service, and vouchers are subject to Hubble’s and the brand’s own terms.',
          'We may change how points are earned or redeemed, or end the programme, with notice in the app. Points may lapse after a period of inactivity only if we have announced that period in advance and warned you at least 14 days before they lapse.',
          'Points obtained by fraud, fake referrals or abuse of the programme may be cancelled.',
        ],
      },
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews',
    blocks: [
      {
        type: 'paragraph',
        text: 'After a deal that we have verified, the buyer or tenant and the owner may review each other. Reviews must be honest and about your own experience. Both reviews are published together, or after 14 days. We may remove a review that breaks these Terms, but we do not edit reviews to change their meaning.',
      },
    ],
  },
  {
    id: 'content',
    title: 'Your content and our licence',
    blocks: [
      {
        type: 'paragraph',
        text: 'You keep ownership of the listings, photos, reviews and other content you post. You grant DealDirect a non-exclusive, royalty-free, worldwide licence to host, store, reproduce, resize, display and distribute that content on the Platform and in promoting your listing, for as long as it is on the Platform and for a reasonable period afterwards to remove copies.',
      },
      {
        type: 'paragraph',
        text: 'The DealDirect name and logo, and the Platform’s design and software, belong to Agrawal Business Network LLP. You may not use them without our written permission.',
      },
    ],
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    blocks: [
      {
        type: 'paragraph',
        text: 'The Platform uses services provided by others, such as Google Sign-In, maps, image hosting, messaging and the Hubble rewards store. Your use of those services may also be governed by their own terms. We are not responsible for third-party websites that the Platform links to.',
      },
    ],
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    blocks: [
      {
        type: 'paragraph',
        text: 'The Platform is provided “as is” and “as available”. To the extent the law allows, we make no warranty that it will be uninterrupted or error-free, or that any listing, user or document is genuine.',
      },
      {
        type: 'paragraph',
        text: 'Price history, locality price ranges, the EMI calculator and similar tools are for general information only. They are based on asking prices on DealDirect and simple arithmetic, and are not valuations, financial advice or loan offers.',
      },
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of liability and indemnity',
    blocks: [
      {
        type: 'paragraph',
        text: 'DealDirect is not liable for any agreement, payment, dispute, loss or damage arising between users, or from a property, a listing or a builder project. To the extent the law allows, we are not liable for indirect, incidental or consequential loss, or for loss of profit, data or opportunity. Nothing in these Terms limits liability that cannot be limited under Indian law.',
      },
      {
        type: 'paragraph',
        text: 'You agree to indemnify DealDirect and its partners and staff against claims, losses and costs arising from your content, your breach of these Terms, or your violation of any law or of another person’s rights.',
      },
    ],
  },
  {
    id: 'termination',
    title: 'Suspension and closing your account',
    blocks: [
      {
        type: 'paragraph',
        text: 'You may stop using the Platform and delete your account at any time. We may suspend or close an account, or remove content, if you break these Terms or the law, if we are required to by law, or to protect other users. Where it is safe and lawful to do so, we will tell you why and give you a way to respond. Sections that by their nature should survive (such as liability, indemnity and governing law) continue after your account is closed.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    blocks: [
      {
        type: 'paragraph',
        text: 'We may update these Terms as the Platform or the law changes. We will show the date of the latest version at the top of this page, and tell you in the app or by email before a material change takes effect. If you keep using the Platform after that, the updated Terms apply.',
      },
    ],
  },
  {
    id: 'law',
    title: 'Governing law and disputes',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms are governed by the laws of India. Subject to any right you have to approach a consumer forum or the Data Protection Board of India, the courts at Mumbai, Maharashtra have exclusive jurisdiction over any dispute arising from them.',
      },
    ],
  },
  {
    id: 'grievance',
    title: 'Grievance officer and contact',
    blocks: [
      {
        type: 'paragraph',
        text: 'You can report content, raise a complaint about the Platform or about how we handle your personal data, or ask any question about these Terms, by writing to our Grievance Officer:',
      },
      GRIEVANCE_OFFICER,
      {
        type: 'paragraph',
        text: 'We will acknowledge your complaint within 24 hours and resolve it within 15 days of receiving it, as the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 require. A request to remove content that exposes a person’s private area, shows them in full or partial nudity or in a sexual act, or is an impersonation in an electronic form including artificially morphed images, will be acted on within 24 hours. Requests about your personal data (access, correction, erasure, nomination, withdrawing consent) are answered within 90 days, as the Privacy Policy explains.',
      },
      {
        type: 'paragraph',
        text: 'These Terms are available in English. On request to grievance@dealdirect.in, we will provide them in a language listed in the Eighth Schedule to the Constitution of India; if the versions differ, the English version prevails.',
      },
    ],
  },
];

export const termsPage: ContentPage = {
  id: 'terms',
  eyebrow: 'Legal',
  title: 'Terms of Use',
  intro:
    'The rules for using DealDirect: what the Platform does, what you agree to when you list a property or contact an owner, and how to raise a complaint. DealDirect does not charge users and is not a broker.',
  meta: 'Effective: 2 November 2026 · Last updated: 2 November 2026',
  webPath: '/terms',
  sections: sections.map((section, index) => ({ ...section, collapsible: true, defaultOpen: index === 0 })),
};
