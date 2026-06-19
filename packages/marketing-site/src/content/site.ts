/**
 * SmartBoyz marketing copy — SINGLE SOURCE OF TRUTH for all page text.
 *
 * Everything the landing page renders lives on the one `site` object exported
 * below, so a non-engineer can refine voice, value props, pricing and FAQ
 * without touching component code. Components import `{ site }` and destructure
 * their slice (e.g. `const { hero } = site`).
 *
 * Brand voice: bold, friendly, straight-talking. Never corporate or elitist.
 *
 * TODO(content) markers flag real business details still to be confirmed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Cta = { label: string; href: string };

export type IconName = "app" | "scenes" | "energy" | "shield" | "wrench" | "lock";

export type ValueProp = { title: string; body: string; icon: IconName };
export type Step = { n: string; title: string; body: string };
export type Shot = { src: string; alt: string; label: string };
export type Stat = { value: string; label: string };
export type Testimonial = { quote: string; name: string; detail: string };
export type Tier = {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: Cta;
  featured?: boolean;
};
export type Faq = { q: string; a: string };

/** A single lead-form field, rendered data-driven by LeadCapture.tsx. */
export type LeadField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "multiselect";
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  /** For select / multiselect. */
  options?: string[];
  /** Span both columns of the two-up grid. */
  full?: boolean;
};

export type Site = {
  brand: {
    name: string;
    domain: string;
    url: string;
    tagline: string;
    description: string;
    serviceArea: string;
    email: string;
    phone: string;
    appUrl: string;
    voice: string[];
  };
  nav: { links: Cta[]; cta: Cta };
  hero: {
    eyebrow: string;
    headlineLines: string[];
    subhead: string;
    primaryCta: Cta;
    secondaryCta: Cta;
    trust: string[];
  };
  valueProps: { heading: string; intro: string; items: ValueProp[] };
  howItWorks: { heading: string; intro: string; steps: Step[] };
  product: {
    heading: string;
    intro: string;
    shots: Record<"wall" | "phone" | "tablet", Shot>;
  };
  socialProof: {
    heading: string;
    stats: Stat[];
    trustMarkers: string[];
    testimonials: Testimonial[];
  };
  pricing: { heading: string; intro: string; tiers: Tier[]; note: string };
  faqs: { heading: string; items: Faq[] };
  cta: { heading: string; body: string; primary: Cta };
  contact: { heading: string; body: string; endpoint: string; success: string };
  leadCapture: {
    headline: string;
    cta: string;
    submitLabel: string;
    fields: LeadField[];
  };
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const site: Site = {
  brand: {
    name: "SmartBoyz",
    domain: "smartboyz.com.au",
    url: "https://smartboyz.com.au",
    tagline:
      "We turn Melbourne homes into smart homes — fully installed, beautifully simple.",
    // Used in <title>, OpenGraph and JSON-LD.
    description:
      "SmartBoyz turns Melbourne homes into smart homes — fully installed, beautifully simple. Lights, climate, security and energy in one app, built on Home Assistant and backed by 18 months of local support.",
    serviceArea: "Melbourne, Victoria",
    email: "hello@smartboyz.com.au", // TODO(content): confirm real contact inbox
    phone: "", // TODO(content): optional phone, e.g. "+61 3 0000 0000"
    appUrl: "https://app.smartboyz.com.au",
    voice: ["bold", "friendly", "straight-talking"],
  },

  nav: {
    // Root-anchored so they work from sub-pages (privacy, thanks) too.
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "The app", href: "/#product" },
      { label: "Packages", href: "/#packages" },
      { label: "FAQ", href: "/#faq" },
    ],
    cta: { label: "Book a Free Consultation", href: "/#contact" },
  },

  hero: {
    eyebrow: "Melbourne smart home installs · automation · local support",
    // Display type — kept short for Barlow Condensed font-black. Last line accents.
    headlineLines: ["Melbourne homes,", "made smart."],
    subhead:
      "Whole-home installs and automation, done properly. One app, every device, zero headaches — built and supported by Melbourne locals who actually show up.",
    primaryCta: { label: "Book a Free Consultation", href: "#contact" },
    secondaryCta: { label: "See the app", href: "#product" },
    // Short trust markers under the CTAs (full list lives in socialProof.trustMarkers).
    trust: [
      "Melbourne-based & local",
      "18-month support & warranty",
      "Open platform — no lock-in",
    ],
  },

  valueProps: {
    heading: "One system. Every part of your home.",
    intro:
      "No switching between six different platforms and no offshore helpdesk. Just your home, exactly how you want it — designed, installed and supported by locals.",
    items: [
      {
        title: "One App, Everything Connected",
        body: "Lights, climate, security, entertainment — controlled from a single beautifully designed app. No switching between six different platforms. Just your home, exactly how you want it.",
        icon: "app",
      },
      {
        title: "Installed by Melbourne Locals",
        body: "We're not a call centre or a national franchise. We're a Melbourne-based team — including a licensed electrician co-founder — who show up on time, do the work properly, and stick around afterward.",
        icon: "wrench",
      },
      {
        title: "18 Months of Total Support",
        body: "Every install comes with an 18-month support and warranty package. Hardware failure? We repair or replace it at no cost. Software update? Done automatically. Something feels off? Call us directly — not an offshore helpdesk.",
        icon: "shield",
      },
      {
        title: "Built on an Open Platform",
        body: "We build on Home Assistant — the world's most trusted open smart home platform. You own your system outright. No mandatory subscriptions, no vendor lock-in, no proprietary black boxes.",
        icon: "lock",
      },
    ],
  },

  howItWorks: {
    heading: "Done for you, start to finish.",
    intro:
      "From the first conversation to a living, breathing smart home — we handle every step.",
    steps: [
      {
        n: "01",
        title: "Free In-Home Consultation",
        body: "We come to you. In a single visit we walk through your home, understand how you live, and design a system around your routines — not a generic template. You'll leave knowing exactly what you're getting and why. No pressure, no obligation.",
      },
      {
        n: "02",
        title: "Professional Installation",
        body: "Our team — led by a licensed electrician — installs everything cleanly and to code, typically over one to two days. We handle all the complexity: wiring, configuration, network setup, and device commissioning. Your home stays liveable throughout.",
      },
      {
        n: "03",
        title: "Go Live & Stay Supported",
        body: "We walk you through your new system before we leave. Everything works from day one. And with 18 months of included support, remote monitoring, and free updates, you're never on your own if something needs attention.",
      },
    ],
  },

  product: {
    heading: "The app your whole house revolves around.",
    intro:
      "Built in-house and refined on real Melbourne homes — fast, calm and consistent on the wall, in your pocket and on the couch.",
    shots: {
      // Paths resolve to src/assets/screenshots/* (imported via astro:assets).
      wall: {
        src: "wall-display.png",
        alt: "SmartBoyz wall-mounted dashboard showing rooms, scenes and climate",
        label: "Wall display",
      },
      phone: {
        src: "iphone-portrait.png",
        alt: "SmartBoyz app on a phone showing room controls",
        label: "On your phone",
      },
      tablet: {
        src: "ipad-landscape.png",
        alt: "SmartBoyz app on a tablet showing the home dashboard",
        label: "On a tablet",
      },
    },
  },

  socialProof: {
    heading: "Why Melbourne homeowners trust SmartBoyz.",
    stats: [
      { value: "18 mo", label: "Support & warranty" },
      { value: "1 app", label: "Your whole home" },
      { value: "Local", label: "First & private" },
    ],
    trustMarkers: [
      "Melbourne-based & locally operated",
      "Licensed electrician co-founder",
      "Built on Home Assistant — open platform, no lock-in",
      "18-month support & warranty on every install",
      "Your data stays in your home — no cloud dependency",
    ],
    // TODO(content): populate with real testimonials + consent before relying on them.
    testimonials: [],
  },

  pricing: {
    heading: "Packages that scale with your home.",
    intro:
      "Every home is different, so every quote is tailored. These are starting points — your free consultation sets the real scope.",
    tiers: [
      {
        name: "Essential",
        price: "From $4,500",
        blurb:
          "The smart home essentials — lighting automation and a single unified app, installed and ready to go.",
        features: [
          "Smart lighting throughout key living areas",
          "Centralised control via the SmartBoyz app",
          "Automated scenes & schedules",
          "Remote access from anywhere",
          "18-month support & warranty",
        ],
        cta: { label: "Start here", href: "#contact" },
      },
      {
        name: "Standard",
        price: "From $6,500",
        blurb:
          "Your whole home in sync — lighting, climate, security and more, all on one calm screen.",
        features: [
          "Everything in Essential",
          "Smart climate control & scheduling",
          "Security cameras & smart locks",
          "Motion-triggered automations",
          "Energy monitoring",
          "18-month support & warranty",
        ],
        cta: { label: "Book a consultation", href: "#contact" },
        featured: true,
      },
      {
        name: "Premium",
        price: "From $9,500",
        blurb:
          "Nothing left unautomated — a fully integrated smart home experience tailored to how you actually live.",
        features: [
          "Everything in Standard",
          "Whole-home audio & entertainment integration",
          "Advanced security with professional monitoring",
          "Climate & blind automation",
          "Solar & battery system integration",
          "Custom automations & scenes",
          "18-month support & warranty",
        ],
        cta: { label: "Talk to us", href: "#contact" },
      },
    ],
    note: "Pricing shown is indicative. Final quotes are tailored to your home after a free consultation.",
  },

  faqs: {
    heading: "Questions, answered.",
    items: [
      {
        q: "Do I need to replace my existing light switches?",
        a: "In most cases, no. We work with your existing switches wherever possible, using smart modules that sit behind them. We'll confirm exactly what's needed during your free consultation.",
      },
      {
        q: "Will it still work if the internet goes down?",
        a: "Yes. Your system runs locally on hardware installed in your home — it doesn't depend on a cloud server to function. You can still control your lights, climate and most devices even without an internet connection.",
      },
      {
        q: "Is my data private — does it go to the cloud?",
        a: "Your home data stays in your home. We build on Home Assistant, an open platform that runs locally. We don't sell your data, and your automations don't rely on third-party cloud services.",
      },
      {
        q: "Do you need to run new cables through my walls?",
        a: "Usually not. We use a mix of wired and wireless technologies chosen specifically to minimise invasive work. Where cabling is needed, we discuss it with you upfront and keep disruption to a minimum.",
      },
      {
        q: "What happens if something breaks after install?",
        a: "Every installation includes an 18-month support and warranty package. If any installed device fails under normal use, we repair or replace it at no cost. We hold spares on hand so fixes happen fast.",
      },
      {
        q: "Can I add more devices later?",
        a: "Absolutely. The platform is designed to grow with you. Adding new lights, sensors, cameras or integrations down the track is straightforward — just get in touch and we'll scope it out.",
      },
      {
        q: "How is this different from buying a Google Home or Alexa setup myself?",
        a: "DIY platforms are fragmented — different apps, different platforms, limited automation. We build a unified system where everything works together, installed properly by licensed professionals, with ongoing support included. It's the difference between a collection of gadgets and a genuinely smart home.",
      },
      {
        q: "Do you work on apartments, or just houses?",
        a: "Both. We've designed packages that work across houses, townhouses, and apartments. The consultation is where we figure out what's possible in your specific space.",
      },
      {
        q: "How long does the installation take?",
        a: "Most installs are completed in one to two days. Larger or more complex homes may take a little longer. We'll give you a clear timeline before we start.",
      },
      {
        q: "What brands and devices do you use?",
        a: "We select components based on proven reliability — not brand deals. Common brands include Shelly, Sonoff, Aqara, and others supported by Home Assistant. Everything is tested before it goes into your home.",
      },
      {
        q: "Can I control everything from my phone?",
        a: "Yes. The SmartBoyz app gives you full control from anywhere — your phone, tablet, or desktop. You can also control your home locally via smart switches and voice assistants.",
      },
      {
        q: "Do you integrate with solar and battery systems?",
        a: "Yes — solar and battery integration is available in our Premium package. We can automate your home to make the most of solar generation, shift loads intelligently, and give you full visibility of your energy usage.",
      },
      {
        q: "What happens after the 18-month warranty ends?",
        a: "You can continue with an optional ongoing care plan that extends support, remote monitoring and software updates. It's never an obligation — your system is yours outright — but most clients find the peace of mind is worth it.",
      },
      {
        q: "Can I get a demo before I commit?",
        a: "Yes. We can walk you through a live demo system during your consultation so you can see and feel exactly what your home could do before making any decisions.",
      },
      {
        q: "Do I need to be home during the installation?",
        a: "For the first day, yes — we'll need access and may have a few questions as we go. After that, many clients are comfortable leaving us to finish up. We'll talk through the logistics at your consultation.",
      },
      {
        q: "Will this work with my existing NBN and Wi-Fi setup?",
        a: "In most cases yes, though we'll assess your network during the consultation. For larger homes or more demanding setups, we may recommend a Wi-Fi upgrade — we can handle that too if needed.",
      },
    ],
  },

  // Full-width CTA band above the contact form.
  cta: {
    heading: "Ready to see what your home could do?",
    body: "Book a free, no-obligation consultation. We'll walk your home, show you what's possible, and design a system around the way you actually live.",
    primary: { label: "Book a Free Consultation", href: "#contact" },
  },

  contact: {
    heading: "Let's design your smart home.",
    body: "Tell us a little about your home and we'll be in touch to arrange your free consultation.",
    // Where the lead form posts. Handled by functions/api/lead.ts.
    endpoint: "/api/lead",
    success: "/thanks",
  },

  // Lead-capture form configuration. LeadCapture.tsx renders these data-driven.
  leadCapture: {
    headline: "Ready to see what your home could do?",
    cta: "Book a Free Consultation",
    submitLabel: "Request my free consultation",
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        autoComplete: "name",
        placeholder: "Your name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        autoComplete: "email",
        placeholder: "you@email.com",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        autoComplete: "tel",
        placeholder: "So we can call to arrange your consult",
      },
      {
        name: "suburb",
        label: "Suburb",
        type: "text",
        placeholder: "e.g. Brunswick",
      },
      {
        name: "homeType",
        label: "Home type",
        type: "select",
        options: ["House", "Apartment", "Townhouse"],
      },
      {
        name: "rooms",
        label: "Approx. rooms",
        type: "number",
        placeholder: "e.g. 8",
      },
      {
        name: "interests",
        label: "What are you interested in?",
        type: "multiselect",
        full: true,
        options: ["Lighting", "Security", "Climate", "Energy", "Everything"],
      },
    ],
  },
};
