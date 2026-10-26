import type { ContentPage } from './model';

/**
 * Mirrors `client-next/src/app/about/AboutContent.jsx`. The website's three
 * closing buttons become in-app routes: Browse properties opens the search
 * tab, List your property opens the listing form (which handles the sign-in
 * and one-listing gates itself), and Contact opens the in-app contact page.
 */
export const aboutPage: ContentPage = {
  id: 'about',
  eyebrow: 'No-Brokerage Property Platform',
  title: 'About Deal Direct',
  intro:
    '**DealDirect**, a venture by **Agrawal Business Network LLP**, is revolutionizing the way India buys, sells, and rents properties. By connecting you directly with property owners, we eliminate middlemen and save you lakhs in brokerage fees — making real estate transactions **transparent, simple, and affordable**.',
  webPath: '/about',
  sections: [
    {
      id: 'story',
      title: 'Born from a Simple Question: Why Pay Brokerage?',
      blurb: 'Our story',
      icon: 'home-outline',
      blocks: [
        {
          type: 'paragraph',
          text: '**Agrawal Business Network LLP** founded Deal Direct with a clear mission — to disrupt the traditional real estate brokerage model that has burdened Indian homebuyers and sellers for decades.',
        },
        {
          type: 'paragraph',
          text: 'We realized that in an age of digital connectivity, paying 1-2% brokerage (often lakhs of rupees!) to a middleman was outdated. Property owners and buyers should be able to connect directly.',
        },
        { type: 'heading', text: 'Our Mission' },
        {
          type: 'quote',
          text: 'To make property transactions in India completely brokerage-free, transparent, and accessible to everyone — regardless of where they are or how much they have.',
        },
      ],
    },
    {
      id: 'advantage',
      title: 'The Deal Direct Advantage',
      blurb: "We're not just another property website. Here's what makes us different.",
      icon: 'sparkles-outline',
      blocks: [
        {
          type: 'cards',
          items: [
            {
              icon: 'shield-checkmark-outline',
              title: 'Verified Mobile Numbers',
              text: 'Owners must confirm their mobile number with a one-time code before they can post a property.',
            },
            {
              icon: 'hand-left-outline',
              title: 'Zero Brokerage',
              text: 'Connect directly with owners and save lakhs in brokerage fees. Your money stays in your pocket.',
            },
            {
              icon: 'trending-up-outline',
              title: 'Smart Insights',
              text: 'Get market trends, price history, and locality data to make informed property decisions.',
            },
          ],
        },
      ],
    },
    {
      id: 'how-it-works',
      title: 'How Deal Direct Works',
      blurb: 'Real estate, reimagined',
      icon: 'construct-outline',
      blocks: [
        {
          type: 'paragraph',
          text: "Most property portals are built for brokers. Deal Direct is built for **you**. We've stripped away the noise, the spam, and the expensive commissions to create a marketplace based on **transparency and rewards**.",
        },
        {
          type: 'cards',
          items: [
            {
              icon: 'shield-outline',
              title: 'The Power of "One"',
              meta: 'Anti-spam policy',
              text: 'To keep properties **high-quality**, we enforce a **Strict 1-Post Per User** rule.\n\n**Why?** This prevents brokers from flooding the site with duplicate posts.\n\n**The Result:** Fewer duplicate posts and less clutter.',
            },
            {
              icon: 'cash-outline',
              title: 'Connect Directly, Save Lacs',
              meta: 'Zero brokerage',
              text: 'We believe that finding a home shouldn\'t cost you a fortune in "introduction fees."\n\n**Direct Communication:** Browse, chat, and negotiate directly with owners, buyers, or actual tenants.\n\n**Zero Brokerage:** Save anywhere from ₹50,000 to ₹5,00,000+ in brokerage fees depending on your deal size.',
            },
            {
              icon: 'gift-outline',
              title: 'Participate & Get Rewarded',
              meta: 'Earn at every step',
              text: 'Unlike other sites that just take your data, we **value your engagement**. Our ecosystem rewards you at every step:\n\n**Post a Property:** Earn rewards just for posting your property.\n\n**Make Enquiries:** Get credited for being an active seeker.\n\n**Close the Deal:** We celebrate your success with special rewards once your transaction is complete.',
            },
            {
              icon: 'people-outline',
              title: 'Grow the Community',
              meta: 'Referral rewards',
              text: "Know someone looking to buy, sell, or rent? **Refer them to Deal Direct!**\n\nWhen your friends join and use the platform, **you get rewarded**.\n\nIt's our way of building a **community of trust** where everyone wins.",
            },
          ],
        },
      ],
    },
    {
      id: 'vision',
      title: 'Building a Brokerage-Free India',
      icon: 'flag-outline',
      blocks: [
        {
          type: 'paragraph',
          text: "We envision a future where every Indian can buy, sell, or rent property without paying a single rupee in brokerage. Through technology, transparency, and trust, we're making this vision a reality — one transaction at a time.",
        },
        {
          type: 'tags',
          items: [
            'Transparent Pricing',
            'No Hidden Fees',
            'Direct Connections',
          ],
        },
      ],
    },
    {
      id: 'cta',
      title: 'Ready to Find Your Dream Home?',
      blocks: [
        {
          type: 'paragraph',
          text: 'Find your next property on Deal Direct, without paying any brokerage.',
        },
        {
          type: 'actions',
          items: [
            { label: 'Browse properties', href: '/(tabs)/search', variant: 'primary' },
            { label: 'Post your property', href: '/owner/property/new', variant: 'secondary' },
            { label: 'Contact us', href: '/legal/contact', variant: 'secondary' },
          ],
        },
      ],
    },
  ],
};
