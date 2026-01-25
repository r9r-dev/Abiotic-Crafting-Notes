import { Helmet } from "@dr.pogodin/react-helmet";

const BASE_URL = "https://abioticscience.fr";
const DEFAULT_DESCRIPTION = "Base de données complète pour Abiotic Factor. Recherchez des items, recettes, NPCs, crafting et plus encore.";
const SITE_NAME = "Abiotic Science";

export interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  type?: "item" | "npc" | "compendium" | "dialogue";
  rowId?: string;
  image?: string;
  noIndex?: boolean;
}

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  type,
  rowId,
  image,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title
    ? `${title} - Abiotic Factor Database`
    : "Abiotic Factor Database - Base de données complète";

  const canonicalUrl = `${BASE_URL}${path}`;

  // Generate OG image URL
  let ogImage = `${BASE_URL}/api/og-image/default`;
  if (type && rowId) {
    ogImage = `${BASE_URL}/api/og-image/${type}/${rowId}`;
  } else if (image) {
    ogImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;
  }

  // Generate JSON-LD structured data
  const structuredData = generateStructuredData({
    title: title || "Abiotic Factor Database",
    description,
    url: canonicalUrl,
    type,
    image: ogImage,
  });

  return (
    <Helmet prioritizeSeoTags>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type ? "article" : "website"} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}

interface StructuredDataProps {
  title: string;
  description: string;
  url: string;
  type?: "item" | "npc" | "compendium" | "dialogue";
  image: string;
}

function generateStructuredData({
  title,
  description,
  url,
  type,
  image,
}: StructuredDataProps) {
  // Base structured data
  const baseData = {
    "@context": "https://schema.org",
  };

  if (type === "item") {
    return {
      ...baseData,
      "@type": "Article",
      headline: title,
      description: description,
      url: url,
      image: image,
      author: {
        "@type": "Person",
        name: "Ronan Lamour",
        "url": "https://ronan.lamour.bzh"
      },
    };
  }

  if (type === "npc" || type === "compendium") {
    return {
      ...baseData,
      "@type": "Article",
      headline: title,
      description: description,
      url: url,
      image: image,
      author: {
        "@type": "Person",
        name: "Ronan Lamour",
        "url": "https://ronan.lamour.bzh"
      },
    };
  }

  // Default: WebPage
  return {
    ...baseData,
    "@type": "WebPage",
    name: title,
    description: description,
    url: url,
    image: image,
  };
}

// Breadcrumb component for structured data
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function SEOBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}
