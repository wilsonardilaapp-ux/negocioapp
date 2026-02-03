
import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/icons";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
       <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <Link href="/" className="flex items-center gap-2 text-foreground">
                <Logo className="h-10 w-10 text-primary" />
                <span className="text-2xl font-bold font-headline">Negocio V03</span>
            </Link>
        </div>
        {children}
       </div>
    </main>
  );
}

    