import type { ContentPage } from './model';

/**
 * Mirrors `client-next/src/app/why-us/WhyUsContent.jsx`, revenue model and
 * price bands included. Those are the website's forward-looking statements
 * ("here is exactly how we plan to earn"); they are reproduced, not endorsed.
 */
export const whyUsPage: ContentPage = {
  id: 'why-us',
  eyebrow: 'About',
  title: 'Why DealDirect?',
  intro:
    'We built DealDirect to make property transactions simple, transparent, and fair for both owners and seekers. No middlemen, no hidden charges – just clean, data-driven matchmaking.',
  webPath: '/why-us',
  sections: [
    {
      id: 'pillars',
      blocks: [
        {
          type: 'cards',
          items: [
            {
              icon: 'people-outline',
              title: 'Direct, No-Broker Model',
              text: 'Connect directly with owners, tenants and buyers. Save on hefty brokerage and have full control over your conversations and decisions.',
            },
            {
              icon: 'search-outline',
              title: 'Smart Search & Alerts',
              text: 'Powerful filters, saved searches, and instant alerts help you find the right property faster – whether you are buying, renting, or exploring investment options.',
            },
            {
              icon: 'shield-checkmark-outline',
              title: 'Trust & Transparency',
              text: 'From detailed property pages and rich media to notifications, we keep every step clear so you can make confident decisions.',
            },
          ],
        },
      ],
    },
    {
      id: 'for-whom',
      title: 'Built for both sides',
      icon: 'swap-horizontal-outline',
      blocks: [
        { type: 'heading', text: 'For Property Owners' },
        {
          type: 'paragraph',
          text: 'Post your property in minutes, manage enquiries from a single dashboard, and get notified when serious leads show interest. You stay in control from posting to closing.',
        },
        { type: 'heading', text: 'For Seekers' },
        {
          type: 'paragraph',
          text: 'Explore curated properties, compare options, save favourites, and receive updates when new properties match your preferences.',
        },
      ],
    },
    {
      id: 'free',
      title: 'Free for Owners, Buyers and Tenants',
      icon: 'checkmark-circle-outline',
      blocks: [
        {
          type: 'paragraph',
          text: "DealDirect doesn't charge owners, buyers or tenants. Posting a property and sending an enquiry cost nothing.",
        },
      ],
    },
    {
      id: 'evolving',
      blocks: [
        {
          type: 'callout',
          tone: 'neutral',
          text: 'DealDirect is continuously evolving – we ship new features often, based on real user feedback. If you have suggestions, we would love to hear from you via the Contact page.',
        },
        {
          type: 'actions',
          items: [{ label: 'Contact us', href: '/legal/contact', variant: 'secondary' }],
        },
      ],
    },
  ],
};
