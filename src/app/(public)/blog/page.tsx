
import { getAdminFirestore } from "@/firebase/server-init";
import Link from "next/link";
import { Calendar, User, ArrowRight, BookOpen, FileText } from "lucide-react";
import type { LandingPageData } from "@/models/landing-page";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";


export const dynamic = 'force-dynamic';

// Función para obtener el ID del negocio principal
async function getMainBusinessId(): Promise<string | null> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        return configSnap.exists ? configSnap.data()?.mainBusinessId : null;
    } catch (error) {
        console.error("Error fetching global config:", error);
        return null;
    }
}

async function getBlogData() {
  try {
    const db = await getAdminFirestore();
    const appearanceSnap = await db.collection("settings").doc("blog_appearance").get();
    const config = appearanceSnap.exists ? appearanceSnap.data() : {
      title: "Nuestro Blog Informativo",
      content: "Bienvenido a nuestro espacio de noticias. Aquí encontrarás las últimas actualizaciones y artículos de interés.",
      bannerUrl: null,
      logoUrl: null,
      headerBannerUrl: null,
    };

    const q = db.collection("blog_posts").orderBy("createdAt", "desc");
    const snapshot = await q.get();
    const allPosts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
    }));

    const posts = allPosts;
    
    // Obtener datos de la landing page para el header
    const mainBusinessId = await getMainBusinessId();
    let landingData: LandingPageData | null = null;
    if (mainBusinessId) {
        const landingSnap = await db.collection("businesses").doc(mainBusinessId).collection("landingPages").doc("main").get();
        if (landingSnap.exists) {
            landingData = landingSnap.data() as LandingPageData;
        }
    }

    return { config, posts, landingData };
  } catch (error) {
    console.error("Error cargando blog:", error);
    return { config: {}, posts: [], landingData: null };
  }
}

export default async function BlogPage() {
  const { config, posts, landingData } = await getBlogData();
  const businessId = await getMainBusinessId();

  return (
    <div className="w-full bg-background">
      <Header businessId={businessId} navigation={landingData?.navigation || null} />
      <main className="min-h-screen bg-gray-50/30">
        <section className="relative bg-white pt-24 pb-16 border-b border-gray-100 overflow-hidden">
          {config.bannerUrl && (
            <div className="absolute inset-0 z-0">
              <img 
                src={config.bannerUrl} 
                className="w-full h-full object-cover opacity-[0.07] grayscale" 
                alt="Background Decorative" 
              />
            </div>
          )}
          <div className="container mx-auto px-4 text-center relative z-10 space-y-6">
            
            {config.headerBannerUrl && (
              <div className="relative w-full max-w-4xl mx-auto aspect-[1920/400] mb-8 rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={config.headerBannerUrl}
                  alt={config.title || "Banner de Cabecera"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="h-14 mx-auto object-contain mb-4 animate-in fade-in duration-1000" />
            ) : (
              <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
            )}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                {config.title}
              </h1>
               <div
                className="text-lg text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed prose"
                dangerouslySetInnerHTML={{ __html: config.content }}
              />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {posts.map((post: any) => (
              <article key={post.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 border border-gray-100 group flex flex-col h-full">
                <div className="aspect-[16/10] relative overflow-hidden bg-gray-100">
                  <img 
                    src={post.imageUrl || post.image_url || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop"} 
                    alt={post.title}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col space-y-4">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                      <Calendar className="h-3 w-3 text-primary" />
                      {new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                      <User className="h-3 w-3 text-primary" />
                      Admin
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-extrabold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">
                    {post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 140) + "..." : ''}
                  </p>

                  <div className="pt-4 mt-auto border-t border-gray-50">
                    <Link 
                      href={`/blog/${post.slug}`} 
                      className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider hover:gap-4 transition-all"
                    >
                      Seguir leyendo <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-32 space-y-4 bg-white rounded-[3rem] border border-dashed border-gray-200">
              <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-gray-400 font-bold text-lg">No hay publicaciones disponibles en este momento.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
