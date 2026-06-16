import { getAdminFirestore } from "@/firebase/server-init";
import FaviconInjector from "@/components/layout/FaviconInjector";
import { Metadata } from "next";

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
  if (!business) return { title: "Bienvenido" };
  
  return {
    title: business.name || "Bienvenido",
    description: business.description || "Página de inicio del negocio.",
  };
}

export default async function LandingLayout({ children, params }: Props) {
  const business = await getBusinessData(params.businessId);
  const faviconUrl = business?.faviconUrl || business?.logoURL || null;
  const title = business?.name || "Bienvenido";

  return (
    <>
      <FaviconInjector faviconUrl={faviconUrl} title={title} />
      {children}
    </>
  );
}
