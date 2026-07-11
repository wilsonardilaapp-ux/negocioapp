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
    const cleanSlug = decodeURIComponent(idOrSlug).toLowerCase().trim();

    // 1. Intentar por ID directo
    const directSnap = await db.collection("businesses").doc(idOrSlug).get();
    if (directSnap.exists) return directSnap.data();

    // 2. Intentar por Alias (Slug) en shareConfig usando el campo slugLanding
    const shareSnap = await db.collectionGroup("shareConfig")
      .where("slugLanding", "==", cleanSlug)
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
  if (!business) return { title: "Bienvenido" };
  
  return {
    title: business.name || "Bienvenido",
    description: business.description || "Página de inicio del negocio.",
    icons: {
      icon: [{ url: buildFaviconUrl(business, 32), type: "image/png", sizes: "32x32" }],
      apple: [{ url: buildFaviconUrl(business, 180), type: "image/png", sizes: "180x180" }],
    },
  };
}

export default async function LandingLayout({ children }: Props) {
  return (
    <>
      {children}
    </>
  );
}
