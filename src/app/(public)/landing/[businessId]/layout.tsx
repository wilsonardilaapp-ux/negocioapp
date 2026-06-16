import { getAdminFirestore } from "@/firebase/server-init";
import FaviconInjector from "@/components/layout/FaviconInjector";
import { Metadata } from "next";

type Props = {
  params: { businessId: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: { businessId: string } }): Promise<Metadata> {
  const db = await getAdminFirestore();
  const businessSnap = await db.collection("businesses").doc(params.businessId).get();
  
  if (!businessSnap.exists) return { title: "Bienvenido" };
  
  const business = businessSnap.data();
  return {
    title: business?.name || "Bienvenido",
    description: business?.description || "Página de inicio del negocio.",
  };
}

export default async function LandingLayout({ children, params }: Props) {
  const db = await getAdminFirestore();
  const businessSnap = await db.collection("businesses").doc(params.businessId).get();
  
  const business = businessSnap.data();
  const faviconUrl = business?.faviconUrl || business?.logoURL || null;

  return (
    <>
      <FaviconInjector faviconUrl={faviconUrl} />
      {children}
    </>
  );
}
