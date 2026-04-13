
import { getAdminFirestore } from "@/firebase/server-init";
import Link from "next/link";
import { Calendar, User, ArrowRight, BookOpen, FileText, Newspaper, Rss } from "lucide-react";
import type { LandingPageData } from "@/models/landing-page";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import type { BlogAppearanceConfig } from "@/models/blog-post";
import type { LucideProps } from 'lucide-react';
import React from 'react';

export const dynamic = 'force-dynamic';

const iconMap: { [key: string]: React.FC<LucideProps> } = {
  BookOpen,
  FileText,
  Newspaper,
  Rss,
};

const DynamicIcon = ({ name, ...props }: { name: string } & LucideProps) => {
    const IconComponent = iconMap[name] || BookOpen;
    return <IconComponent {...props} />;
};

async function getHeaderData(businessId: string | null): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;

        if (!businessId) { // If no businessId is passed, use the main one
            businessId = mainBusinessId;
        }

        if (!businessId) {
            return { businessId: null, navigation: null };
        }

        const landingSnap = await db.collection("businesses").doc(businessId).collection("landingPages").doc("main").get();
        const navigation = landingSnap.exists ? (landingSnap.data() as LandingPageData).navigation : null;
        
        return { businessId: businessId, navigation };
    } catch (error) {
        console.error("Error fetching header data:", error);
        return { businessId: null, navigation: null };
    }
}

async function getBlogData(businessId: string) {
  try {
    const db = await getAdminFirestore();
    
    // Fetch per-business appearance settings
    const appearanceSnap = await db.collection("businesses").doc(businessId).collection("settings").doc("blog_appearance").get();
    let config: Partial<BlogAppearanceConfig> = {};

    if (appearanceSnap.exists) {
        config = appearanceSnap.data() as BlogAppearanceConfig;
    } else {
        // Fallback to global settings if per-business doesn't exist
        const globalAppearanceSnap = await db.collection("settings").doc("blog_appearance").get();
        if (globalAppearanceSnap.exists) {
            config = globalAppearanceSnap.data() as BlogAppearanceConfig;
        } else {
            // Hardcoded fallback if nothing exists
            config = { title: "Blog", content: "Nuestros últimos artículos.", iconName: "BookOpen" };
        }
    }

    const q = db.collection("blog_posts")
                .where("businessId", "==", businessId);

    const snapshot = await q.get();
    
    const posts = snapshot.docs
        .map(doc => {
            const data = doc.data();
            const createdAtRaw = data.createdAt;
            let createdAtISO = new Date().toISOString(); 
            if (createdAtRaw) {
                if (typeof createdAtRaw === 'string') {
                    createdAtISO = createdAtRaw;
                } else if (createdAtRaw.toDate && typeof createdAtRaw.toDate === 'function') {
                    createdAtISO = createdAtRaw.toDate().toISOString();
                }
            }
            return {
                id: doc.id,
                ...data,
                createdAt: createdAtISO
            };
        })
        .filter((post: any) => post.isActive === true)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { config, posts };
  } catch (error: any) {
    console.error(`Error cargando blog para businessId ${businessId}:`, error);
    return { config: { title: "Blog", content: `Error al cargar: ${error.message}`, iconName: "BookOpen" }, posts: [] };
  }
}

export default async function BusinessBlogPage({ params }: { params: { businessId: string } }) {
  const { businessId } = params;
  const { config, posts } = await getBlogData(businessId);
  const { navigation } = await getHeaderData(businessId);

  return (
    <div className="w-full bg-background">
      <Header businessId={businessId} navigation={navigation} />
      <main className="min-h-screen bg-gray-50/30">
        <section className="relative bg-white pt-24 pb-16 border-b border-gray-100 overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10 space-y-6">
            <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg mb-4">
                <DynamicIcon name={config?.iconName || 'BookOpen'} className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                {config?.title || "Nuestro Blog"}
              </h1>
               <div
                className="text-lg text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed prose"
                dangerouslySetInnerHTML={{ __html: config?.content || "" }}
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
                    src={post.imageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop"} 
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
                      href={`/blog/${businessId}/${post.slug}`} 
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
              <p className="text-gray-400 font-bold text-lg">Este negocio aún no tiene publicaciones.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
