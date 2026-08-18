import { getAdminFirestore } from '@/firebase/server-init';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getBusinessBranding(id: string) {
  try {
    const db = await getAdminFirestore();
    const snap = await db.collection('businesses').doc(id).get();
    if (snap.exists) {
      return snap.data();
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default async function BookingLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode, 
  params: { businessId: string } 
}) {
  const business = await getBusinessBranding(params.businessId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {business?.logoURL ? (
                <div className="relative h-10 w-10 rounded-xl overflow-hidden border shadow-sm bg-white">
                  <Image src={business.logoURL} alt={business.name || 'Logo'} fill className="object-cover" />
                </div>
             ) : <Logo className="h-8 w-8 text-primary" />}
             <span className="font-black tracking-tighter text-xl">{business?.name || 'Markix Reservas'}</span>
          </div>
          <Link href="/">
             <Button variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground">Volver</Button>
          </Link>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>
      <footer className="py-8 text-center border-t bg-white">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
          &copy; {new Date().getFullYear()} {business?.name || 'Markix'} — Potenciado por Markix SaaS
        </p>
      </footer>
    </div>
  );
}
