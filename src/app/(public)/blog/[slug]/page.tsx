
import { notFound } from "next/navigation";
import { getAdminFirestore } from "@/firebase/server-init";
import { Timestamp } from "firebase-admin/firestore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, User } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import type { LandingPageData } from "@/models/landing-page";

export const dynamic = 'force-dynamic';

async function getHeaderData(): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;

        if (!mainBusinessId) {
            return { businessId: null, navigation: null };
        }

        const landingSnap = await db.collection("businesses").doc(mainBusinessId).collection("landingPages").doc("main").get();
        const navigation = landingSnap.exists ? (landingSnap.data() as LandingPageData).navigation : null;
        
        return { businessId: mainBusinessId, navigation };
    } catch (error) {
        console.error("Error fetching header data:", error);
        return { businessId: null, navigation: null };
    }
}


function getQueryDate(dateVal: any) {
  if (typeof dateVal === 'string') return dateVal;
  if (dateVal && typeof dateVal.seconds === 'number') {
    return new Timestamp(dateVal.seconds, dateVal.nanoseconds || 0);
  }
  if (dateVal instanceof Timestamp) return dateVal;
  return dateVal;
}

async function getPostBySlug(slug: string) {
  if (!slug) return null;
  
  try {
    const db = await getAdminFirestore();
    const decodedSlug = decodeURIComponent(slug);
    const q = db.collection("blog_posts")
      .where("slug", "==", decodedSlug)
      .limit(1);

    const snapshot = await q.get();
    if (snapshot.empty) {
        return null;
    }

    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data();
    
    let displayDate = "";
    if (data.createdAt instanceof Timestamp) {
        displayDate = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
        displayDate = data.createdAt;
    } else if (data.createdAt?.seconds) {
        displayDate = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate().toISOString();
    } else {
        displayDate = new Date().toISOString();
    }

    return {
      id: docSnapshot.id,
      title: data.title,
      content: data.content,
      image_url: data.image_url || data.imageUrl || "https://picsum.photos/seed/picsum/1200/800",
      createdAt: displayDate,
      rawDate: data.createdAt,
      seo: data.seo || {},
    };
  } catch (error: any) {
    if (error.message?.includes("project-id")) {
        console.error("CRÍTICO: El Project ID de Firebase no está llegando al servidor Next.js");
    }
    console.error("Error en getPostBySlug:", error);
    return null;
  }
}

async function getAdjacentPosts(currentPostDate: any) {
  if (!currentPostDate) return { prevPost: null, nextPost: null };
  
  let prevPost = null;
  let nextPost = null;

  try {
    const db = await getAdminFirestore();
    const pivot = getQueryDate(currentPostDate);
    const blogRef = db.collection("blog_posts");

    const prevQuery = blogRef
      .where("createdAt", "<", pivot)
      .orderBy("createdAt", "desc")
      .limit(1);
    
    const nextQuery = blogRef
      .where("createdAt", ">", pivot)
      .orderBy("createdAt", "asc")
      .limit(1);

    const [prevSnap, nextSnap] = await Promise.all([
      prevQuery.get(),
      nextQuery.get()
    ]);

    if (!prevSnap.empty) {
      const d = prevSnap.docs[0].data();
      prevPost = { title: d.title, slug: d.slug };
    }

    if (!nextSnap.empty) {
      const d = nextSnap.docs[0].data();
      nextPost = { title: d.title, slug: d.slug };
    }
  } catch (e) {
    console.error("Error buscando adyacentes:", e);
  }

  return { prevPost, nextPost };
}

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Artículo no encontrado" };
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || "Blog de Negocio",
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = params;
  const { businessId, navigation } = await getHeaderData();

  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { prevPost, nextPost } = await getAdjacentPosts(post.rawDate);

  return (
    <div className="bg-white">
      <Header businessId={businessId} navigation={navigation} />
      <article className="min-h-screen pb-20">
        <div className="container mx-auto px-4 py-6">
          <Link href="/blog"> 
            <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all text-gray-600 hover:text-primary">
              <ChevronLeft className="h-4 w-4" /> Volver al listado
            </Button>
          </Link>
        </div>

        <div className="container mx-auto px-4 max-w-3xl">
          <header className="mb-8 text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Admin
              </span>
            </div>
          </header>

          {post.image_url && (
            <div className="relative w-full h-[300px] md:h-[400px] mb-10 rounded-xl overflow-hidden shadow-sm bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={post.image_url} 
                alt={post.title}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          <div 
            className="prose prose-lg prose-primary max-w-none 
            prose-headings:font-bold prose-headings:text-gray-900 
            prose-p:text-gray-700 prose-a:text-primary prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <hr className="my-10 border-gray-200" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {prevPost ? (
              <Link href={`/blog/${prevPost.slug}`} className="w-full md:w-auto">
                <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 border-gray-300 hover:border-primary hover:text-primary group">
                  <ChevronLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <div className="text-left">
                    <span className="block text-xs text-gray-500">Anterior</span>
                    <span className="font-medium truncate max-w-[200px] block">{prevPost.title}</span>
                  </div>
                </Button>
              </Link>
            ) : <div className="flex-1"></div>}

            {nextPost ? (
              <Link href={`/blog/${nextPost.slug}`} className="w-full md:w-auto">
                <Button variant="outline" className="w-full justify-end h-auto py-3 px-4 border-gray-300 hover:border-primary hover:text-primary group">
                  <div className="text-right">
                    <span className="block text-xs text-gray-500">Siguiente</span>
                    <span className="font-medium truncate max-w-[200px] block">{nextPost.title}</span>
                  </div>
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : <div className="flex-1"></div>}
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
}
