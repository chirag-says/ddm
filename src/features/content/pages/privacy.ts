// Explicit `.ts`: imported by `pages.test.ts` under `node --test`; see contact.ts.
import { GRIEVANCE_OFFICER } from '../support.ts';
import type { ContentPage } from './model';

/**
 * Mirrors `client-next/src/app/privacy/PrivacyContent.jsx` (final DPDP text,
 * website commit 6c53ffd). Copy is verbatim; a change there must be made here
 * in the same commit. The website's tables are cards here: the first column
 * is the card title, the last column follows its bold column heading.
 */
export const privacyPage: ContentPage = {
  id: 'privacy',
  eyebrow: 'Legal',
  title: 'Privacy Policy',
  intro:
    'How DealDirect collects, uses, shares and protects your personal data, and how to exercise your rights under the Digital Personal Data Protection Act, 2023.',
  meta: 'Effective: 3 October 2026 · Last updated: 9 November 2026',
  webPath: '/privacy',
  sections: [
    {
      id: 'who-we-are',
      title: 'Who we are and what this notice covers',
      blocks: [
        {
          type: 'paragraph',
          text: 'DealDirect is operated by **Agrawal Business Network LLP**, 129, Growmore Tower, Sector 2, Kharghar, Navi Mumbai 410210, Maharashtra (“DealDirect”, “we”, “us”). For the personal data described here, we are the Data Fiduciary under the Digital Personal Data Protection Act, 2023. DealDirect serves users in India only.',
        },
        {
          type: 'paragraph',
          text: 'This notice explains what personal data we process when you use the dealdirect.in website or the DealDirect app, why, who receives it, how long we keep it, and the rights you have. It follows the Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025, and the Information Technology Act, 2000 and the rules under it where they still apply.',
        },
      ],
    },
    {
      id: 'summary',
      title: 'The short version',
      blocks: [
        {
          type: 'bullets',
          items: [
            'We collect what we need to run accounts, listings and enquiries, and to keep the Platform safe.',
            'When you send an enquiry, the owner receives your name, email address and mobile number. That is how they reply.',
            'We do not sell your personal data, and we use no third-party advertising or analytics tools.',
            'You can see, correct and delete your data, withdraw consent, and complain to us or to the Data Protection Board of India.',
          ],
        },
      ],
    },
    {
      id: 'data-we-process',
      title: 'Personal data we process, and why',
      blocks: [
        {
          type: 'paragraph',
          text: 'We process the following personal data, each for the purpose shown next to it. We ask for your consent when you create an account and when you use features that need more data (such as location). Where you give us data voluntarily for a purpose, such as an enquiry, we use it for that purpose.',
        },
        {
          type: 'cards',
          items: [
            {
              title: 'Account',
              text: "Name, email address, mobile number and password (stored only as a one-way hash). If you sign in with Google: your Google account's name, email address and profile photo. When you sign up: the time you confirmed you are 18 or older and accepted the Terms and this notice, and whether you asked for offers.\n\n**Why we use it:** To create your account, sign you in and keep it secure.",
            },
            {
              title: 'Mobile verification',
              text: 'Your mobile number and the one-time password (OTP) sent to it.\n\n**Why we use it:** To confirm the number is yours before you list a property or send an enquiry, and to prevent fake accounts.',
            },
            {
              title: 'Profile (optional)',
              text: 'Photo, alternate phone number, address, date of birth, gender and a short bio, if you add them.\n\n**Why we use it:** To show your profile and fill in forms for you.',
            },
            {
              title: 'Listings',
              text: 'Property address, map location, photos, price, description and features, and any documents you upload for verification.\n\n**Why we use it:** To publish your listing and let buyers and tenants find it, and to check that it is genuine.',
            },
            {
              title: 'Enquiries',
              text: "When you tap “I'm interested”: your name, email address and mobile number, and the conversation history, visits and notes on that enquiry. For a builder project enquiry: your name, phone, email and message.\n\n**Why we use it:** To put you in touch with the owner, or for our team to pass your details to the builder of the project.",
            },
            {
              title: 'Saved items and searches',
              text: 'Your shortlist, saved searches and their alerts, and reviews you write after a verified deal.\n\n**Why we use it:** To let you keep and return to properties, alert you to new matches, and show reviews.',
            },
            {
              title: 'Deal verification',
              text: 'Documents you upload to show that a sale or letting has completed.\n\n**Why we use it:** To verify the deal before reviews and rewards are released.',
            },
            {
              title: 'Rewards and referrals',
              text: 'Your points history, referral code and who referred whom. When you open the rewards store, your name, email address and mobile number are passed to Hubble.\n\n**Why we use it:** To run the rewards programme and the store.',
            },
            {
              title: 'Support and reports',
              text: 'Messages you send us and reports you make about listings or users.\n\n**Why we use it:** To answer you and act on reports.',
            },
            {
              title: 'Device and security',
              text: 'IP address, browser or device type and user-agent of each signed-in session, app installation ID, push-notification token and app version.\n\n**Why we use it:** To keep sessions secure, let you see and sign out of your devices, detect misuse, and deliver notifications.',
            },
            {
              title: 'Usage',
              text: 'Actions you take in the app and website (for example, viewing a listing or starting an enquiry), linked to your account or app installation. IP addresses are not stored with these events.\n\n**Why we use it:** To understand how DealDirect is used and improve it. We use no third-party analytics or advertising tools.',
            },
            {
              title: 'Location',
              text: "With your browser's or phone's permission, your approximate location, used to work out your city. On a listing, the map pin you set.\n\n**Why we use it:** To show properties near you and place listings on the map.",
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'We do not ask for your PAN, Aadhaar or bank details to use the Platform. Do not include them in listings, photos or messages.',
        },
      ],
    },
    {
      id: 'legitimate-uses',
      title: 'Processing without consent',
      blocks: [
        {
          type: 'paragraph',
          text: 'Section 7 of the DPDP Act allows some processing without consent. We rely on it only where it applies, for example to comply with a law or a court order, to respond to a medical emergency or a threat to someone’s safety, or to use data you gave us voluntarily for the purpose you gave it for.',
        },
      ],
    },
    {
      id: 'sharing',
      title: 'Who receives your personal data',
      blocks: [
        {
          type: 'paragraph',
          text: 'We share personal data only as set out below. The service providers listed process it on our behalf, under their published terms for processing data for their customers, and only to provide their service to us.',
        },
        {
          type: 'cards',
          items: [
            {
              title: 'Property owners',
              text: 'When you send an enquiry: your name, email address and mobile number.\n\n**Why:** So the owner can reply to you.',
            },
            {
              title: 'Builders',
              text: 'When you enquire about a builder project: your name, phone number and email address, passed on by our team.\n\n**Why:** So the builder can contact you about the project.',
            },
            {
              title: 'Everyone on the Platform',
              text: "A published listing (without the owner's phone or email), the owner's name, and published reviews.\n\n**Why:** This is what listings and reviews are for.",
            },
            {
              title: 'Hostinger',
              text: 'All Platform data, as our web and application host.\n\n**Why:** Hosting.',
            },
            {
              title: 'MongoDB Atlas',
              text: 'All account, listing and enquiry data, as our database service, held on AWS Mumbai (India).\n\n**Why:** Database hosting.',
            },
            {
              title: 'Cloudinary',
              text: 'Profile photos, listing photos and verification documents.\n\n**Why:** Image and document storage.',
            },
            {
              title: 'Email service',
              text: 'Your email address and the content of emails we send you.\n\n**Why:** Sending account and enquiry emails.',
            },
            {
              title: 'Equence',
              text: 'Your mobile number and the OTP.\n\n**Why:** Sending verification SMS.',
            },
            {
              title: 'Meta (WhatsApp Business) or our WhatsApp gateway hosted on Railway',
              text: "Your mobile number and the message; for an enquiry, the owner receives the enquirer's name, email and phone. Our team's alerts about new sign-ups, enquiries and contact messages (name, email and phone) go the same way.\n\n**Why:** Sending WhatsApp notifications, and internal alerts to the DealDirect team.",
            },
            {
              title: 'Expo',
              text: 'Your push token and the notification text.\n\n**Why:** Sending app notifications.',
            },
            {
              title: 'Google',
              text: 'Data needed to verify a Google sign-in.\n\n**Why:** Sign in with Google.',
            },
            {
              title: 'Hubble',
              text: 'Your name, email address and mobile number, when you open the store.\n\n**Why:** The rewards store.',
            },
            {
              title: 'OpenStreetMap',
              text: 'Map coordinates and address searches typed into the map.\n\n**Why:** Showing maps and finding addresses.',
            },
            {
              title: 'Sentry',
              text: 'Crash reports: technical details of errors, linked to an account ID and role, held in the European Union. Screen text, form inputs and images are masked.\n\n**Why:** Finding and fixing faults.',
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'Builder projects: your enquiry reaches the DealDirect team, and our team passes your name, phone number and email address to the builder of that project. We tell you this when you send the enquiry.',
        },
        {
          type: 'paragraph',
          text: 'We may also disclose personal data to a government agency, court or regulator when the law requires it, and to a successor if DealDirect’s business is transferred, under the same protections. We do not sell personal data or share it for others’ advertising.',
        },
      ],
    },
    {
      id: 'transfers',
      title: 'Processing outside India',
      blocks: [
        {
          type: 'paragraph',
          text: 'Our database is held in India (MongoDB Atlas, AWS Mumbai). Some of the providers above store or process data outside India: crash reports go to Sentry in the European Union, and providers such as Cloudinary, Meta and Google may process data in other countries under their own terms. Section 16 of the DPDP Act permits this, except to any country the Central Government restricts, and we will follow any such restriction.',
        },
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and storage on your device',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use only the cookies and device storage needed for the Platform to work and to remember your choices. We do not use advertising or tracking cookies.',
        },
        {
          type: 'paragraph',
          text: 'Maps and property videos on the website come from Google Maps and YouTube, which set their own cookies under Google’s privacy policy. They load only after you allow them, on your first visit or with the “Show” button in place of a map or video. You can change this any time with Cookie settings at the bottom of every page. Signing in with Google and opening the rewards store also connect you to those services, because you chose to use them.',
        },
        {
          type: 'cards',
          items: [
            {
              title: 'user_session (cookie)',
              text: 'Keeps you signed in. Not readable by page scripts.\n\n**How long:** 7 days',
            },
            {
              title: 'session_exists (cookie)',
              text: 'Tells the website you are signed in, without exposing the session.\n\n**How long:** 7 days',
            },
            {
              title: 'csrf_token (cookie)',
              text: 'Protects forms against cross-site request forgery.\n\n**How long:** Session',
            },
            {
              title: 'dd_user_city, dd-theme, dealDirectRecentSearches, dd_proj_bookmarks (browser storage)',
              text: 'Your city, display theme, recent searches and saved projects, kept on your device.\n\n**How long:** Until you clear them',
            },
            {
              title: 'dd_cookie_consent (browser storage)',
              text: 'Remembers whether you allowed maps and videos from Google and YouTube.\n\n**How long:** Until you clear it or change it in Cookie settings',
            },
            {
              title: 'dd_app_banner (browser storage)',
              text: 'Remembers that you dismissed the Get the app bar on your phone, so it stays away.\n\n**How long:** 7 days',
            },
            {
              title: 'App secure storage and cache',
              text: 'Your session, preferences and a cache of screens you opened (which can include enquiry details), stored on your phone. Excluded from phone backups on Android.\n\n**How long:** Until you sign out or uninstall',
            },
          ],
        },
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep personal data',
      blocks: [
        {
          type: 'paragraph',
          text: 'We keep personal data only as long as its purpose needs, or as long as the law requires, and then delete it.',
        },
        {
          type: 'cards',
          items: [
            { title: 'Signed-in sessions', text: '7 days, or until you sign out.' },
            { title: 'One-time passwords', text: '10 minutes.' },
            { title: 'Usage events', text: '90 days.' },
            { title: 'Notifications you have read', text: '90 days.' },
            { title: 'Message delivery logs', text: '8 days.' },
            {
              title: 'Push tokens',
              text: 'Removed 30 days after they stop working, or 180 days after a device was last seen.',
            },
            {
              title: 'Your account, profile, listings, shortlist, saved searches and notifications',
              text: 'Until you delete your account; then deleted, and your profile photo and listing photos are removed from image storage.',
            },
            {
              title: 'Enquiries, verified deals and project enquiries (with the names and contact details in them)',
              text: 'Kept for one year after you delete your account, because the other party to the enquiry or deal also relies on them. Then your name and contact details are removed from them, or they are deleted.',
            },
            {
              title: 'Reviews you wrote after a verified deal',
              text: 'Kept after you delete your account, without your name.',
            },
            { title: 'Audit logs of actions taken by our team', text: '1 year, then deleted.' },
            {
              title: 'Backups',
              text: 'We keep no backups of our database, so nothing deleted from it survives in a backup.',
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'Delete your account explains how to delete your account and exactly what is removed and what is kept.',
        },
        {
          type: 'actions',
          items: [{ label: 'Delete your account', href: '/settings/delete-account', variant: 'secondary' }],
        },
      ],
    },
    {
      id: 'rights',
      title: 'Your rights',
      blocks: [
        { type: 'paragraph', text: 'Under the DPDP Act you have the right to:' },
        {
          type: 'bullets',
          items: [
            '**Access:** a summary of the personal data we process about you and the processing we carry out, and the identities of those we have shared it with.',
            '**Correction and erasure:** have inaccurate or incomplete data corrected, completed or updated, and have data erased when it is no longer needed. You can edit your profile and listings, and delete your account, yourself in the app or on the website.',
            '**Withdraw consent:** at any time, as easily as you gave it (see the next section).',
            '**Nominate:** name another person to exercise your rights if you die or become unable to.',
            '**Grievance redressal:** complain to us, and then to the Data Protection Board of India.',
          ],
        },
        {
          type: 'paragraph',
          text: 'To exercise any of these rights, including nomination, write to our Grievance Officer at grievance@dealdirect.in from the email address on your account, or include your registered mobile number. We may ask you to confirm your identity. We will respond within 90 days.',
        },
      ],
    },
    {
      id: 'consent',
      title: 'Consent and withdrawing it',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Location: turn it off in your browser’s site settings or your phone’s app permissions. You can still choose a city by hand.',
            'Notifications: change email, SMS and WhatsApp preferences in your account settings, or turn off app notifications on your phone.',
            'Promotional messages (offers and new project updates by email, SMS or WhatsApp): we send them only if you tick the box for them when you sign up, or turn on “Offers and new project updates” under Notifications in your profile. Turn it off there at any time; every such message also explains how to stop them.',
            'Everything else: delete your account, or write to us.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Withdrawing consent does not affect processing that took place before. Some features, such as enquiries, cannot work without the data they need, so withdrawing consent for them may mean closing your account.',
        },
      ],
    },
    {
      id: 'children',
      title: 'Children',
      blocks: [
        {
          type: 'paragraph',
          text: 'DealDirect is for adults only. You must be 18 or older to create an account, and you confirm this when you sign up. We do not allow accounts for anyone under 18 and do not knowingly process their personal data; if we learn that an account belongs to someone under 18, we will delete it.',
        },
      ],
    },
    {
      id: 'security',
      title: 'How we protect personal data',
      blocks: [
        { type: 'paragraph', text: 'We use reasonable security safeguards, including:' },
        {
          type: 'bullets',
          items: [
            'encryption of data in transit (HTTPS);',
            'passwords stored only as one-way hashes, and sign-in sessions held in cookies that page scripts cannot read;',
            'sessions that expire, and a list of your signed-in devices that you can sign out of;',
            'limits on repeated sign-in and OTP attempts;',
            'access to personal data limited to the staff and providers who need it;',
            'error monitoring that masks screen text, form inputs and images.',
          ],
        },
        {
          type: 'paragraph',
          text: 'If a personal data breach affects you, we will tell you without delay, in the way the DPDP Rules require, and report it to the Data Protection Board of India.',
        },
      ],
    },
    {
      id: 'duties',
      title: 'Your duties',
      blocks: [
        {
          type: 'paragraph',
          text: 'The DPDP Act also asks you not to impersonate anyone, not to suppress material information, to give only true information when you ask us to correct your data, and not to file false or frivolous complaints.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this notice',
      blocks: [
        {
          type: 'paragraph',
          text: 'We will update this notice when our processing or the law changes, and show the date at the top. If a change is material, we will tell you in the app or by email before it takes effect, and ask for fresh consent where the law requires it.',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Grievance officer and the Data Protection Board',
      blocks: [
        {
          type: 'paragraph',
          text: 'For questions about this notice, to exercise your rights, or to complain, contact our Grievance Officer:',
        },
        GRIEVANCE_OFFICER,
        {
          type: 'paragraph',
          text: 'If you are not satisfied with our response, or we do not respond within the time allowed, you may complain to the Data Protection Board of India in the manner it prescribes.',
        },
        {
          type: 'paragraph',
          text: 'This notice is published in English. On request to grievance@dealdirect.in, we will provide it in any language listed in the Eighth Schedule to the Constitution of India; if the versions differ, the English version prevails.',
        },
      ],
    },
  ],
};
