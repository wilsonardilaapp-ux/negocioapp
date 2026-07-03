import * as React from 'react';
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { getLandingData } from "@/lib/get-landing-data";
import { ContactFormSpanish } from "@/components/contact/ContactFormSpanish";
import { History, ShieldCheck, HeartHandshake } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ContactoPage() {
  const landingData = await getLandingData();
  const navigation = landingData?.navigation || null;

  return (
    <div className="w-full bg-gray-50/50">
      <Header businessId={null} navigation={navigation} />
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">Estamos aquí para ayudarte</h1>
          <p className="mt-4 text-lg text-gray-600">
            ¿Tienes una pregunta o necesitas ayuda? Nuestro equipo está listo para asistirte. Respondemos en menos de 24 horas.
          </p>
        </section>

        <ContactFormSpanish />

        {/* Trust Section */}
        <section className="text-center mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="flex flex-col items-center gap-2">
                    <History className="h-8 w-8 text-primary"/>
                    <p className="font-semibold">Respuesta en menos de 24h</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="h-8 w-8 text-primary"/>
                    <p className="font-semibold">Tus datos están seguros</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <HeartHandshake className="h-8 w-8 text-primary"/>
                    <p className="font-semibold">Soporte personalizado</p>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mt-20 bg-white py-16 rounded-lg shadow-sm">
            <h2 className="text-3xl font-bold text-gray-900">¿Listo para transformar tu negocio?</h2>
            <p className="mt-2 text-gray-600 max-w-xl mx-auto">Únete a miles de negocios que ya están creciendo de forma más inteligente con Markix.</p>
            <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" asChild><Link href="/register">Empieza gratis hoy</Link></Button>
                <Button size="lg" variant="outline" asChild><Link href="/#precios">Ver planes y precios</Link></Button>
            </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
