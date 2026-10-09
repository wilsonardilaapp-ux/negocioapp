import { getAdminFirestore } from "@/firebase/server-init";
import Link from "next/link";
import { Calendar, User, ArrowRight, BookOpen, FileText } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { getLandingData } from "@/lib/get-landing-data";
import React from 'react';

export const dynamic = 'force-dynamic';

function formatSafeDate(rawDate: any): string {
  if (!rawDate) return '—';
  let d: Date;
  if (typeof rawDate.toDate === 'function') {
    d = rawDate.toDate();
  } else if (rawDate.seconds) {
    d = new Date(rawDate.seconds * 1000);
  } else {
    d = new Date(rawDate);
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function getGlobalPosts() {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("blog_posts").where("isActive", "==", true).get();

    if (snapshot.empty) {
      return [];
    }

    const posts = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          slug: data.slug || doc.id,
          content: data.content || '',
          imageUrl: data.imageUrl || null,
          seoDescription: data.seoDescription || '',
          createdAt: data.createdAt,
          businessId: data.businessId,
        };
      })
      // Filtrar solo los posts globales del superadmin (sin businessId o marcado como global)
      .filter(p => !p.businessId || p.businessId === 'undefined' || p.businessId === 'global')
      // Ordenar por fecha descendente en memoria
      .sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime() || 0;
        const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime() || 0;
        return db - da;
      });

    return posts;
  } catch (error: any) {
    console.error("Error al obtener posts globales:", error);
    return [];
  }
}

export default async function GlobalBlogPage() {
  const [landingData, posts] = await Promise.all([
    getLandingData().catch(() => null),
    getGlobalPosts()
  ]);

  return (
    <div className="w-full bg-background min-h-screen flex flex-col">
      <Header businessId={null} navigation={landingData?.navigation || null} />
      
      <main className="flex-1 bg-gray-50/30">
        {/* Encabezado oficial de la plataforma Markix */}
        <section className="relative bg-white pt-24 pb-16 border-b border-gray-100 overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10 space-y-4">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto bg-primary text-primary-foreground shadow-lg mb-2">
              <BookOpen className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Blog de Markix
              </h1>
              <p className="text-base md:text-lg font-medium text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Novedades, estrategias e inteligencia artificial para impulsar y transformar tu negocio.
              </p>
            </div>
          </div>
        </section>

        {/* Listado de Artículos Globales */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200 max-w-lg mx-auto">
              <FileText className="h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Aún no hay publicaciones</h3>
              <p className="text-xs text-muted-foreground">
                Pronto compartiremos nuevos artículos y guías de interés.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 border border-gray-100 group flex flex-col h-full"
                >
                  <div className="aspect-[16/10] relative overflow-hidden bg-gray-100">
                    <img
                      src={post.imageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop"}
                      alt={post.title}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  </div>
                  <div className="p-8 flex-1 flex flex-col space-y-4">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                        <Calendar className="h-3 w-3 text-primary" />
                        {formatSafeDate(post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                        <User className="h-3 w-3 text-primary" />
                        Markix Admin
                      </span>
                    </div>

                    <h2 className="text-xl font-extrabold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>

                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">
                      {post.seoDescription || (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 140) + "..." : '')}
                    </p>

                    <div className="pt-4 mt-auto border-t border-gray-50">
                      <Link
                        href={`/blog/global/${post.slug}`}
                        className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider hover:gap-4 transition-all"
                      >
                        Seguir leyendo <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
