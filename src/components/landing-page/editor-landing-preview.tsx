'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LandingPageData } from '@/models/landing-page';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import LandingPageContent from '@/components/landing-page/landing-page-content';

interface EditorLandingPreviewProps {
  data: LandingPageData;
}

export default function EditorLandingPreview({ data }: EditorLandingPreviewProps) {
  const { user } = useUser();
  const { toast } = useToast();
  
  const publicUrl = user ? `${window.location.origin}/landing/${user.uid}` : '';

  const copyToClipboard = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast({
        title: "Enlace copiado",
        description: "El enlace público de tu landing page ha sido copiado al portapapeles.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <CardTitle>Acciones de la Landing Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Enlace Público</CardTitle>
                    <CardDescription className="text-xs">Comparte este enlace para mostrar tu landing page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Input value={publicUrl} readOnly />
                        <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!publicUrl}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button asChild variant="secondary" className="w-full mt-2" disabled={!publicUrl}>
                       <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                           <ExternalLink className="mr-2 h-4 w-4" />
                           Vista Previa Pública
                       </a>
                    </Button>
                </CardContent>
            </Card>
        </CardContent>
      </Card>
      <Card className="sticky top-6">
          <CardHeader>
              <CardTitle>Vista Previa en Tiempo Real</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg overflow-hidden w-full bg-slate-50">
                  {/* Mock Browser Header */}
                  <div className="h-8 bg-gray-200 flex items-center px-2 gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>

                  {/* Live Preview Content */}
                  <div className="bg-white max-h-[80vh] overflow-y-auto">
                    <LandingPageContent data={data} logoUrl={data.navigation.logoUrl}/>
                  </div>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
