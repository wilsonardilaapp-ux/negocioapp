
import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/icons";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const LoadingScreen = () => (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="text-center flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
);

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
       <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <Link href="/" className="flex items-center gap-2 text-foreground">
                <Logo className="h-10 w-10 text-primary" />
                <span className="text-2xl font-bold font-headline">Zentry</span>
            </Link>
        </div>
        <Suspense fallback={<LoadingScreen />}>
          {children}
        </Suspense>
       </div>
    </main>
  );
}
