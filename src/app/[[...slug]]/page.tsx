import type { Metadata } from "next";
import ClientApp from "./ClientApp";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slugArray = resolvedParams?.slug || [];
  const slugPath = slugArray.join("/");

  if (slugPath === "reviews" || slugPath === "reviews/") {
    const title = "Google Reviews | H & A Construction LLC";
    const description = "Read verified customer reviews from our Google Business Profile for residential construction, remodeling, carpentry, and roofing in Southern Maine.";
    const canonical = "https://www.h-a-construction.com/reviews/";

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: "H & A Construction LLC",
        locale: "en_US",
        type: "website",
      },
    };
  }

  if (slugPath === "contact" || slugPath === "contact/") {
    const title = "Contact Us | H & A Construction LLC";
    const description = "Get in touch with H & A Construction LLC for residential construction, remodeling, and carpentry in Southern Maine.";
    const canonical = "https://www.h-a-construction.com/contact/";

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: "H & A Construction LLC",
        locale: "en_US",
        type: "website",
      },
    };
  }

  return {
    title: "H & A Construction LLC | Southern Maine Contractor",
    description: "Professional residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Saco, OOB, Biddeford, Scarborough, and Southern Maine.",
  };
}

export default function CatchAllPage() {
  return <ClientApp />;
}
