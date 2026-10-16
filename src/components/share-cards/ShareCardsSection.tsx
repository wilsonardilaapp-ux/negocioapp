'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Download, Copy, Check, Pencil, Archive, Store, Sparkles } from "lucide-react";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { checkShareCardsModuleActive } from "@/actions/share-cards-module";
import { getBusinessShareCards, archiveShareCard } from "@/actions/share-cards-actions";
import { ShareCardModal } from "./ShareCardModal";
import { QrDownloadMenu } from "./QrDownloadMenu";
import { SHARE_CARDS_MODULE } from "@/constants/share-cards";
import type { ShareCard } from "@/models/share-card";

interface ShareCardsSectionProps {
  businessId?: string;
  baseUrl: string;
  cardsProp?: ShareCard[];
}

export function ShareCardsSection({ businessId, baseUrl, cardsProp }: ShareCardsSectionProps) {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [limit, setLimit] = useState<number>(SHARE_CARDS_MODULE.DEFAULT_LIMIT);
  const [cards, setCards] = useState<ShareCard[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<ShareCard | null>(null);

  const loadModuleAndCards = useCallback(async () => {
    if (!businessId) return;
    const { active, limit: serverLimit } = await checkShareCardsModuleActive(businessId);
    setIsActive(active);
    setLimit(serverLimit);
    if (active) {
      const res = await getBusinessShareCards(businessId);
      setCards(res.cards || []);
    }
  }, [businessId]);

  useEffect(() => {
    loadModuleAndCards();
  }, [loadModuleAndCards]);

  if (!isActive || !businessId) {
    return null; // Aislado por completo: si el módulo está apagado, no renderiza nada
  }

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Enlace copiado", description: "Listo para compartir." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQR = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast({ variant: "destructive", title: "Error al generar QR" });
    }
  };

  const handleArchive = async (card: ShareCard) => {
    const confirmMessage = SHARE_CARDS_MODULE.TEXTS.ARCHIVE_CONFIRMATION;
    if (window.confirm(confirmMessage)) {
      const res = await archiveShareCard(businessId, card.id);
      if (res.success) {
        toast({ title: "Archivada", description: SHARE_CARDS_MODULE.TEXTS.SUCCESS_ARCHIVE });
        loadModuleAndCards();
      } else {
        toast({ variant: "destructive", title: "Error", description: res.error || "No se pudo archivar." });
      }
    }
  };

  const directoryUrl = `${baseUrl}?ref=${SHARE_CARDS_MODULE.CANAL_DIRECTORIO}`;
  const currentCards = cardsProp !== undefined ? cardsProp : cards;
  const activeCards = currentCards.filter(c => !c.isArchived);

  return (
    <section className="space-y-4 pt-4 border-t border-dashed border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5" /> {SHARE_CARDS_MODULE.NAME}
          </h2>
          <p className="text-sm text-muted-foreground">
            Mide canales específicos con enlaces rastreados y códigos QR descargables.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            <span>Límite de tarjetas:</span>
            <span className="font-black font-mono">{activeCards.length} / {limit === -1 ? '∞' : limit}</span>
          </div>
          <Button 
            disabled={activeCards.length >= limit && limit !== -1}
            title={activeCards.length >= limit && limit !== -1 ? "Has alcanzado el límite de tarjetas permitido en tu plan" : ""}
            onClick={() => { setCardToEdit(null); setIsModalOpen(true); }}
            className="font-bold gap-2 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {SHARE_CARDS_MODULE.TEXTS.ADD_BUTTON}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 1. Tarjeta Fija: Directorio de Markix */}
        <Card className="overflow-hidden border-primary/30 bg-primary/[0.02] flex flex-col">
          <CardHeader className="p-4 pb-2 border-b bg-primary/10">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center justify-between text-primary">
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4" /> {SHARE_CARDS_MODULE.TEXTS.DIRECTORY_CARD_TITLE}
              </span>
              <span className="text-[10px] font-mono lowercase bg-primary/20 px-1.5 py-0.5 rounded text-primary font-bold">
                ref={SHARE_CARDS_MODULE.CANAL_DIRECTORIO}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-grow flex flex-col items-center justify-center">
            <div id="qr-directorio-fijo" className="bg-white p-2 rounded-xl border">
              <QRCode value={directoryUrl} size={100} level="M" />
            </div>
            <QrDownloadMenu url={directoryUrl} channelName="directorio-markix" />
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <div className="relative w-full">
              <Input readOnly value={directoryUrl} className="h-8 text-[10px] pr-8 bg-muted/30 border-none font-mono" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-0 top-0 h-8 w-8 text-primary" 
                onClick={() => handleCopy(directoryUrl, "directorio-fijo")}
              >
                {copiedId === "directorio-fijo" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* 2. Tarjetas Personalizadas */}
        {activeCards.map(card => {
          const cardUrl = `${baseUrl}?ref=${card.ref}`;
          return (
            <Card key={card.id} className="overflow-hidden border-gray-200 flex flex-col hover:border-primary/40 transition-all">
              <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-widest truncate max-w-[170px]" title={card.name}>
                    {card.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => { setCardToEdit(card); setIsModalOpen(true); }}
                      title="Editar nombre"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleArchive(card)}
                      title="Archivar tarjeta"
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 flex-grow flex flex-col items-center justify-center">
                <div id={`qr-custom-${card.id}`} className="bg-white p-2 rounded-xl border">
                  <QRCode value={cardUrl} size={100} level="M" />
                </div>
                <QrDownloadMenu url={cardUrl} channelName={card.ref} />
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <div className="relative w-full">
                  <Input readOnly value={cardUrl} className="h-8 text-[10px] pr-8 bg-muted/30 border-none font-mono" />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-8 w-8 text-primary" 
                    onClick={() => handleCopy(cardUrl, card.id)}
                  >
                    {copiedId === card.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <ShareCardModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        businessId={businessId}
        cardToEdit={cardToEdit}
        onSuccess={loadModuleAndCards}
      />
    </section>
  );
}
