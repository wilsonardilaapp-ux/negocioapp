
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full">
            {children}
        </div>
      </main>
    </div>
  );
}
