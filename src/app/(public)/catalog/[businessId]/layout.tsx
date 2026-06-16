import { getAdminFirestore } from "@/firebase/server-init";
import FaviconInjector from "@/components/layout/FaviconInjector";
import { Metadata } from "next";

type Props = {
  params: { businessId: string };
  children: React.ReactNode;
};

/**
 * Genera metadatos dinámicos (Título) para el catálogo.
 */
export async function generateMetadata({ params }: { params: { businessId: string } }): Promise<Metadata> {
  const db = await getAdminFirestore();
  const businessSnap = await db.collection("businesses").doc(params.businessId).get();
  
  if (!businessSnap.exists) return { title: "Catálogo Digital" };
  
  const business = businessSnap.data();
  return {
    title: business?.name ? `Catálogo - ${business.name}` : "Catálogo Digital",
    description: business?.description || "Consulta nuestros productos disponibles.",
  };
}

export default async function CatalogLayout({ children, params }: Props) {
  const db = await getAdminFirestore();
  const businessSnap = await db.collection("businesses").doc(params.businessId).get();
  
  const business = businessSnap.data();
  // El favicon puede ser la URL de faviconUrl o el logoURL como respaldo
  const faviconUrl = business?.faviconUrl || business?.logoURL || null;

  return (
    <>
      <FaviconInjector faviconUrl={faviconUrl} />
      {children}
    </>
  );
}
