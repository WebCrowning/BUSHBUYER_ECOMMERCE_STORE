import sanitizeHtml from "sanitize-html";

export const pageSlugs = ["about", "privacy"] as const;

export type PageSlug = (typeof pageSlugs)[number];

export function isPageSlug(value: string): value is PageSlug {
  return (pageSlugs as readonly string[]).includes(value);
}

export function pageTitleFromSlug(slug: PageSlug): string {
  return slug === "about" ? "About Us" : "Privacy Policy";
}

export function sanitizePageContent(rawHtml: string): string {
  if (!rawHtml) return "";
  return sanitizeHtml(rawHtml, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "a", "ul", "ol", "li", "b", "i", "strong", "em", "strike", "code", "hr", "br",
      "div", "span", "blockquote", "table", "thead", "tbody", "tr", "th", "td"
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      "*": ["class"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}


export function defaultPageContent(slug: PageSlug): string {
  if (slug === "about") {
    return `
<h2>Who We Are</h2>
<p>Bushbuyer connects families, chefs, and food businesses with authentic African raw food ingredients through trusted sourcing and dependable delivery.</p>

<h2>Our Mission</h2>
<p>Our mission is to make premium African ingredients accessible worldwide while supporting responsible sourcing partners.</p>

<h2>What Makes Us Different</h2>
<ul>
  <li>Direct relationships with verified farmers and processors</li>
  <li>Quality checks and careful packaging before dispatch</li>
  <li>Fast customer support through email and chat</li>
</ul>

<h2>Contact</h2>
<p>For partnerships, bulk orders, or support, contact our team via the Contact page.</p>
`.trim();
  }

  return `
<h2>1. Information We Collect</h2>
<p>We collect information needed to process orders, provide support, and improve your experience, including account, delivery, and communication details.</p>

<h2>2. How We Use Information</h2>
<ul>
  <li>To process and deliver orders</li>
  <li>To communicate order and support updates</li>
  <li>To improve product and service quality</li>
</ul>

<h2>3. Payment and Security</h2>
<p>Payments are processed through trusted providers. We apply security best practices to protect account and order information.</p>

<h2>4. Your Rights</h2>
<p>You may request updates or deletion of your personal data by contacting support.</p>

<h2>5. Policy Updates</h2>
<p>We may update this policy periodically. Changes will be published on this page with an updated date.</p>
`.trim();
}
