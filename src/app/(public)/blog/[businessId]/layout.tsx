import { getAdminFirestore } from "@/firebase/server-init";
import { Metadata } from "next";
import { buildFaviconUrl } from "@/lib/favicon-url";

type Props = {
  params: { businessId: string };
  children: React.ReactNode;
};

async function getBusinessData(idOrSlug: string) {
  try {
    const db = await getAdminFirestore();
    const cleanSlug = idOrSlug.toLowerCase().trim();

    const directSnap = await db.collection("businesses").doc(idOrSlug).get();
    if (directSnap.exists) return directSnap.data();

    const shareSnap = await db.collectionGroup("shareConfig")
      .where("slug", "==", cleanSlug)
      .limit(1)
      .get();

    if (!shareSnap.empty) {
      const businessId = shareSnap.docs[0].ref.parent.parent?.id;
      if (businessId) {
        const bSnap = await db.collection("businesses").doc(businessId).get();
        return bSnap.data();
      }
    }
  } catch (error) {
    console.error("Error resolving business data:", error);
  }
  return null;
}

export async function generateMetadata({ params }: { params: { businessId: string } }): Promise<Metadata> {
  const business = await getBusinessData(params.businessId);
  if (!business) return { title: "Blog" };
  
  return {
    title: business.name ? `Blog - ${business.name}` : "Blog",
    description: "Lee nuestras últimas noticias y artículos.",
    icons: {
      icon: [{ url: buildFaviconUrl(business, 32), type: "image/png", sizes: "32x32" }],
      apple: [{ url: buildFaviconUrl(business, 180), type: "image/png", sizes: "180x180" }],
    },
  };
}

export default async function BlogLayout({ children }: Props) {
  return (
    <>
      {children}
    </>
  );
}
