'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { LandingPageData, NavLink, CustomPlan } from '@/models/landing-page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Phone, Mail, Clock, MapPin, Youtube, Linkedin, Star, Loader2, Check } from 'lucide-react';
import { PublicContactForm } from './public-contact-form';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { HybridPlan } from '@/models/hybrid-plan';

interface PlanButton {
  label: string;
  onClick: () => void;
  variant: 'free' | 'popular' | 'paid';
}

interface HotmartLink {
  planId: string;
  planName: string;
  hotmartUrl: string;
}

interface LandingPageContentProps {
  data: LandingPageData;
  plans?: SubscriptionPlan[];
  hybridPlans?: HybridPlan[];
  businessId?: string;
  logoUrl?: string;
}

const getLinkUrl = (link: NavLink, currentBusinessId: string | undefined): string => {
  if (link.url && link.url !== '#') {
    return link.url;
  }
  const text = link.text.toLowerCase();
  if (text.includes('blog')) return currentBusinessId ? `/blog/${currentBusinessId}` : '/blog';
  if (text.includes('catálogo')) return currentBusinessId ? `/catalog/${currentBusinessId}` : '#';
  if (text.includes('contacto')) return '/contacto';
  if (text.includes('inicio')) return currentBusinessId ? `/landing/${currentBusinessId}` : '/';
  return '#';
};

const CustomPlanCard = ({ plan }: { plan: CustomPlan }) => {
    return (
        <div
            className={cn(
                "rounded-2xl p-6 bg-white relative flex flex-col h-full transition-all hover:shadow-lg",
                plan.isPopular ? 'border-2 border-primary shadow-md scale-105 z-10' : 'border border-gray-200'
            )}
        >
            {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Recomendado
                </span>
            )}
            <div className="flex-grow flex flex-col">
                {plan.imageUrl && (
                    <div className="relative aspect-square w-full mb-6 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <Image 
                          src={plan.imageUrl} 
                          alt={plan.name} 
                          fill 
                          sizes="(max-width: 768px) 100vw, 30vw"
                          className="object-cover" 
                        />
                    </div>
                )}
                <h3 className="text-xl font-bold text-gray-800 text-center mb-1">
                    {plan.name}
                </h3>
                <p className="text-xs text-center text-gray-500 mb-4 line-clamp-2 h-8">
                    {plan.description}
                </p>
                <div className="text-center mb-6">
                    <span className="text-sm font-bold text-gray-500 mr-1">{plan.currency}</span>
                    <span className="text-4xl font-black text-gray-900">
                        {plan.price.toLocaleString('es-CO')}
                    </span>
                    <span className="text-gray-400 text-sm ml-1">
                        {plan.period}
                    </span>
                </div>
                <ul className="space-y-3 mb-6 border-t pt-4">
                    {plan.features.map((feature, idx) => (
                        <li key={feature.id || idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <Check className="text-primary h-4 w-4 mt-0.5 shrink-0" />
                            <span>{feature.value}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="mt-auto">
                <Button 
                    className={cn(
                        "w-full py-6 rounded-xl font-bold transition-all",
                        plan.isPopular ? "bg-primary text-white shadow-lg" : "variant-outline"
                    )}
                    onClick={() => window.open(plan.buttonUrl, '_self')}
                    variant={plan.isPopular ? 'default' : 'outline'}
                >
                    {plan.buttonText}
                </Button>
            </div>
        </div>
    );
};

const getPlanButtonConfig = (plan: SubscriptionPlan | HybridPlan, hotmartLinks: HotmartLink[], user: any): PlanButton => {
    const hotmartLink = hotmartLinks.find((h) => h.planId === plan.id);
    const isHybrid = 'commissionType' in plan;
    const price = isHybrid ? (plan as HybridPlan).basePrice : (plan as SubscriptionPlan).price;

    const handleRedirect = async () => {
        if (hotmartLink?.hotmartUrl) {
          window.open(hotmartLink.hotmartUrl, '_blank');
          return;
        }

        // Cambio quirúrgico: Capturar ref de la URL actual y propagarlo
        const refCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null;
        const baseRegisterUrl = `/register?plan=${plan.id}`;
        const finalUrl = refCode ? `${baseRegisterUrl}&ref=${refCode}` : baseRegisterUrl;

        if (!isHybrid && (plan as SubscriptionPlan).stripePriceId && !(plan as SubscriptionPlan).stripePriceId.includes('placeholder') && user) {
          try {
            const res = await fetch('/api/stripe/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                priceId: (plan as SubscriptionPlan).stripePriceId,
                businessId: user.uid,
                userId: user.uid,
                email: user.email,
              }),
            });
            const sessionData = await res.json();
            if (sessionData.url) {
              window.open(sessionData.url, '_self');
              return;
            }
          } catch (e) {
            console.error("Stripe error:", e);
          }
        }
        
        window.location.href = finalUrl;
    };
  
    if (price === 0) {
      return {
        label: 'Empezar Gratis',
        variant: 'free',
        onClick: handleRedirect,
      };
    }
  
    return {
      label: 'Suscribirse',
      variant: (plan as any).isMostPopular ? 'popular' : 'paid',
      onClick: handleRedirect,
    };
};

const SocialIconsMap: { [key: string]: React.ReactNode } = {
  tiktok: <TikTokIcon className="h-5 w-5" />,
  instagram: <InstagramIcon className="h-5 w-5" />,
  facebook: <FacebookIcon className="h-5 w-5" />,
  whatsapp: <WhatsAppIcon className="h-5 w-5" />,
  twitter: <XIcon className="h-5 w-5" />,
  youtube: <YoutubeIcon className="h-5 w-5" />,
  facebookUrl: <FacebookIcon className="h-5 w-5" />,
  instagramUrl: <InstagramIcon className="h-5 w-5" />,
  tiktokUrl: <TikTokIcon className="h-5 w-5" />,
  youtubeUrl: <Youtube className="h-5 w-5" />,
  linkedinUrl: <Linkedin className="h-5 w-5" />,
};

const PlanCard = ({ 
    plan, 
    hotmartLinks, 
    user 
}: { 
    plan: SubscriptionPlan | HybridPlan, 
    hotmartLinks: HotmartLink[],
    user: any 
}) => {
    const [expanded, setExpanded] = useState(false);
    const ITEMS_LIMIT = 5;
    
    const btn = getPlanButtonConfig(plan, hotmartLinks, user);
    const isHybrid = 'commissionType' in plan;
    const hybridPlan = isHybrid ? plan as HybridPlan : null;
    const subscriptionPlan = !isHybrid ? plan as SubscriptionPlan : null;
    
    const price = isHybrid ? hybridPlan?.basePrice : subscriptionPlan?.price;
    const features = (isHybrid ? hybridPlan?.features : subscriptionPlan?.features) || [];
    const limits = isHybrid ? hybridPlan?.limits : subscriptionPlan?.limits;
    const isMostPopular = (plan as any).isMostPopular === true;

    const visibleFeatures = expanded ? features : features.slice(0, ITEMS_LIMIT);

    return (
      <div
        className={cn(
          "rounded-2xl p-6 bg-white relative flex flex-col h-full",
          isMostPopular ? 'border-2 border-primary shadow-md' : 'border border-gray-200'
        )}
      >
        {isMostPopular && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            Más Popular
          </span>
        )}
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-gray-800">
              {plan.name}
            </h3>
            {isHybrid && <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">Híbrido</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-1 min-h-[40px]">
            {!isHybrid ? subscriptionPlan?.description : `Pago base + comisión por pedido.`}
          </p>
          <div className="mb-4">
            <span className="text-4xl font-bold text-gray-900">
              ${price?.toLocaleString('es-CO')}
            </span>
            <span className="text-gray-400 text-sm">
              /mes
            </span>
            {isHybrid && (
              <p className="text-sm font-bold text-orange-600 mt-1">
                + {hybridPlan?.commissionType === 'percent' ? `${hybridPlan.pricePerOrder}%` : `$${hybridPlan?.pricePerOrder.toLocaleString('es-CO')}`} por pedido
              </p>
            )}
          </div>
          <ul className="space-y-2 mb-2">
            {visibleFeatures.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <span className="text-primary font-bold">
                  ✓
                </span>
                {feature.value}
              </li>
            ))}
          </ul>
          
          {features.length > ITEMS_LIMIT && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-primary hover:underline mb-6 flex items-center gap-1 font-medium"
            >
              {expanded ? "Ver menos ▲" : `Ver más (${features.length - ITEMS_LIMIT} más) ▼`}
            </button>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-1 text-sm text-gray-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Límites:
            </p>
            <div className="flex justify-between">
              <span>Productos:</span>
              <span className="font-medium text-gray-700">
                {limits?.products === -1 ? 'Ilimitados' : limits?.products}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Posts de Blog:</span>
              <span className="font-medium text-gray-700">
                {limits?.blogPosts === -1 ? 'Ilimitados' : limits?.blogPosts}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Landing Pages:</span>
              <span className="font-medium text-gray-700">
                {limits?.landingPages === -1 ? 'Ilimitadas' : limits?.landingPages}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={btn.onClick}
            className={cn(
              "w-full py-3 px-6 rounded-xl text-white font-semibold text-sm transition-colors duration-200",
              btn.variant === 'free' ? 'bg-green-500 hover:bg-green-600' :
              btn.variant === 'popular' ? 'bg-green-500 hover:bg-green-600' :
              'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {btn.label}
          </button>
        </div>
      </div>
    );
};

export default function LandingPageContent({ data, plans = [], hybridPlans = [], businessId, logoUrl }: LandingPageContentProps) {
  const { hero, navigation, sections, testimonials, form, footer, header, plans: customPlans } = data;

  const finalLogoUrl = logoUrl || navigation.logoUrl;

  const hotmartLinks: HotmartLink[] = useMemo(() => {
    const links = (plans || []).map(p => ({
        planId: p.id,
        planName: p.name,
        hotmartUrl: (p as any).hotmartUrl || '',
    }));
    const hybridLinks = (hybridPlans || []).map(p => ({
      planId: p.id || '',
      planName: p.name,
      hotmartUrl: '', 
    }));
    return [...links, ...hybridLinks];
  }, [plans, hybridPlans]);

  const sortedPlans = useMemo(() => {
    const all = [...(plans || []), ...(hybridPlans || [])];
    return all.sort((a, b) => {
      const priceA = 'price' in a ? a.price : (a as HybridPlan).basePrice;
      const priceB = 'price' in b ? b.price : (a as HybridPlan).basePrice;
      return priceA - priceB;
    });
  }, [plans, hybridPlans]);

  const navStyle = {
    backgroundColor: navigation.backgroundColor || '#FFFFFF',
    color: navigation.textColor || '#000000'
  };

  const heroBaseStyle = useMemo(() => ({
    backgroundColor: hero.backgroundColor && hero.backgroundColor.trim() !== '' ? hero.backgroundColor : '#FFFFFF',
    color: hero.textColor && hero.textColor.trim() !== '' ? hero.textColor : '#000000'
  }), [hero.backgroundColor, hero.textColor]);

  const hasValidImage = useMemo(() => {
    return !!(
      hero.imageUrl && 
      typeof hero.imageUrl === 'string' && 
      hero.imageUrl.trim().length > 0 &&
      hero.imageUrl.startsWith('http')
    );
  }, [hero.imageUrl]);

  const renderCarousel = () => (
    header?.carouselItems && header.carouselItems.some(item => item.mediaUrl) && (
      <Carousel 
          className="w-full" 
          opts={{ loop: true }}
          plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: true,
              }),
          ]}
      >
          <CarouselContent>
              {header.carouselItems.map(item => item.mediaUrl && (
                  <CarouselItem key={item.id}>
                       <div className="relative aspect-[1920/600] w-full">
                          {item.mediaType === 'image' ? (
                              <Image src={item.mediaUrl} alt={item.slogan || 'Carousel image'} fill sizes="100vw" className="object-cover" />
                          ) : (
                              <video src={item.mediaUrl} autoPlay loop muted controls={false} className="w-full h-full object-cover"/>
                          )}
                          {item.slogan && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <p className="text-white text-2xl md:text-4xl font-bold text-center drop-shadow-md p-4">{item.slogan}</p>
                              </div>
                          )}
                      </div>
                  </CarouselItem>
              ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white text-foreground" />
          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white text-foreground" />
      </Carousel>
    )
  );

  const renderMainBanner = () => (
    <section className="bg-card shadow-sm py-8">
      <div className="container mx-auto px-4 space-y-8">
          {header?.banner?.mediaUrl && (
              <div className="relative aspect-[1920/500] w-full rounded-lg overflow-hidden">
                  {header.banner.mediaType === 'image' ? (
                      <Image src={header.banner.mediaUrl} alt="Banner" fill sizes="100vw" className="object-cover"/>
                  ) : (
                      <video src={header.banner.mediaUrl} autoPlay loop muted controls={false} className="w-full h-full object-cover" />
                  )}
              </div>
          )}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                  <h2 className="text-3xl font-bold font-headline">{header?.businessInfo?.name}</h2>
                  <p className="text-md text-muted-foreground">{header?.businessInfo?.address}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-2 text-sm">
                      {header?.businessInfo?.phone && <p className="text-muted-foreground">{header.businessInfo.phone}</p>}
                      {header?.businessInfo?.email && <a href={`mailto:${header.businessInfo.email}`} className="text-muted-foreground hover:text-primary">{header.businessInfo.email}</a>}
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  {header?.socialLinks && Object.entries(header.socialLinks).filter(([_, value]) => value).map(([key, value]) => (
                      <a key={key} href={value as string} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          {SocialIconsMap[key]}
                      </a>
                  ))}
              </div>
          </div>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col">
      {/* Navegación */}
      {navigation.enabled && (
        <nav 
          style={navStyle} 
          className={cn('sticky top-0 z-50 py-4 transition-shadow', navigation.useShadow && 'shadow-md')}
        >
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className={cn('flex items-center', navigation.logoAlignment === 'center' ? 'mx-auto' : navigation.logoAlignment === 'right' ? 'ml-auto' : '')}>
              {finalLogoUrl ? (
                <img src={finalLogoUrl} alt={navigation.logoAlt} style={{ width: `${navigation.logoWidth}px` }} className="h-auto" />
              ) : (
                <span className="font-bold text-xl">{navigation.businessName}</span>
              )}
            </div>
            <div className="hidden md:flex items-center gap-6">
              {navigation.links.filter(l => l.enabled).map(link => (
                <a key={link.id} href={getLinkUrl(link, businessId)} className="hover:opacity-70 transition-opacity" style={{ fontSize: `${navigation.fontSize}px` }}>
                  {link.text}
                </a>
              ))}
            </div>
          </div>
        </nav>
      )}
      
      {header?.bannerPosition === 'above' ? (
        <>
          {renderMainBanner()}
          {renderCarousel()}
        </>
      ) : (
        <>
          {renderCarousel()}
          {renderMainBanner()}
        </>
      )}

      {/* Hero Section */}
      <section 
        id="hero" 
        style={heroBaseStyle} 
        className="relative overflow-hidden flex items-center min-h-[600px] w-full"
      >
        {hasValidImage && (
          <>
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${hero.imageUrl})` }}
            />
            <div className="absolute inset-0 z-[1] bg-black/40" />
          </>
        )}

        <div 
          className="container mx-auto px-4 relative z-10 text-center py-20" 
          style={{ color: heroBaseStyle.color }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">{hero.title}</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-4xl mx-auto">{hero.subtitle}</p>
          {hero.additionalContent && (
            <div 
              className="max-w-3xl mx-auto mb-10 prose lg:prose-xl text-inherit" 
              dangerouslySetInnerHTML={{ __html: hero.additionalContent }} 
            />
          )}
          {hero.ctaButtonText && (
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 shadow-lg hover:scale-105 transition-transform" 
              style={{ backgroundColor: hero.buttonColor, color: '#FFFFFF' }} 
              asChild
            >
              <a href={hero.ctaButtonUrl}>{hero.ctaButtonText}</a>
            </Button>
          )}
        </div>
      </section>

      {/* Content Sections */}
      {sections.map(section => (
        <section key={section.id} className="py-16 md:py-24" style={{ backgroundColor: section.backgroundColor, color: section.textColor }}>
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
                    <p className="text-lg md:text-xl opacity-80">{section.subtitle}</p>
                    <div className="prose lg:prose-lg mx-auto mt-4" dangerouslySetInnerHTML={{ __html: section.content }} />
                </div>
                {section.subsections && section.subsections.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {section.subsections.map(sub => (
                            <div key={sub.id} className="text-center">
                                {sub.imageUrl && (
                                    <div className="relative aspect-video w-full mb-4 rounded-lg overflow-hidden">
                                        <Image src={sub.imageUrl} alt={sub.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover"/>
                                    </div>
                                )}
                                <h3 className="text-xl font-semibold mb-2">{sub.title}</h3>
                                <div className="prose prose-sm mx-auto" dangerouslySetInnerHTML={{ __html: sub.description }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
      ))}

      {/* Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4">
                 <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">Lo que dicen nuestros clientes</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map(testimonial => (
                        <div key={testimonial.id} className="bg-white p-8 rounded-xl shadow-lg flex flex-col">
                            <div className="flex mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={cn("h-5 w-5", testimonial.rating >= i + 1 ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                ))}
                            </div>
                            <div className="prose prose-sm text-gray-600 mb-6 flex-grow" dangerouslySetInnerHTML={{ __html: testimonial.text }} />
                            <div className="flex items-center gap-4 mt-auto">
                                <Image src={testimonial.avatarUrl} alt={testimonial.authorName} width={40} height={40} className="rounded-full" />
                                <div>
                                    <p className="font-semibold text-gray-900">{testimonial.authorName}</p>
                                    <p className="text-sm text-gray-500">{testimonial.authorRole}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </section>
      )}

      {/* Plans Section */}
      {(customPlans?.length ?? 0) > 0 ? (
          <section className="py-16 px-4 bg-gray-50" id="precios">
             <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900">Nuestros Planes</h2>
                    <p className="text-gray-500 mt-2">Elige la opción que mejor se adapte a lo que buscas.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-center items-stretch">
                    {customPlans?.map((plan) => (
                        <CustomPlanCard key={plan.id} plan={plan} />
                    ))}
                </div>
             </div>
          </section>
      ) : sortedPlans.length > 0 ? (
          <section className="py-16 px-4 bg-gray-50" id="precios">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900">
                  Planes y Precios
                </h2>
                <p className="text-gray-500 mt-2">
                  Elige el plan que mejor se adapta a tu negocio.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                {sortedPlans.map((plan) => (
                    <div key={plan.id} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] min-w-[300px] max-w-[350px]">
                        <PlanCard 
                          plan={plan} 
                          hotmartLinks={hotmartLinks} 
                          user={null} // Pass null for visitor view
                        />
                    </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

      {/* Formulario */}
      <section id="contact" className="py-24 bg-gray-50 flex-grow">
        <div className="container mx-auto px-4 flex justify-center">
          {form?.fields && form.fields.length > 0 && <PublicContactForm formConfig={form} businessId={businessId || ''} />}
        </div>
      </section>

      {/* Footer */}
      {footer.enabled && (
        <footer 
          className="py-16 text-sm" 
          style={{ 
            backgroundColor: footer.visuals.backgroundColor || '#F8F9FA', 
            color: footer.visuals.textColor || '#6c757d',
            backgroundImage: footer.visuals.backgroundImageUrl ? `url(${footer.visuals.backgroundImageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1 space-y-4">
              {footer.logo.url && (
                <div className="relative h-16 w-40">
                  <Image src={footer.logo.url} alt="Logo" fill sizes="10rem" className="object-contain" />
                </div>
              )}
              <p className="text-sm">{footer.logo.slogan}</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-lg" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Enlaces Rápidos</h4>
              <ul className="space-y-2">
                {footer.quickLinks.map(link => {
                    const lowerCaseText = link.text.toLowerCase();
                    const href = (lowerCaseText.includes('sobre nosotros')) ? '/sobre-nosotros' :
                               (lowerCaseText.includes('servicios')) ? '/servicios' :
                               (lowerCaseText.includes('contacto')) ? '/contacto' : link.url;
                    return (
                        <li key={link.id}>
                            <Link href={href} className="hover:underline">
                                {link.text}
                            </Link>
                        </li>
                    );
                })}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-lg" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Contacto</h4>
              <ul className="space-y-3">
                {footer.contactInfo.address && <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.address}</li>}
                {footer.contactInfo.phone && <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.phone}</li>}
                {footer.contactInfo.email && <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.email}</li>}
                {footer.contactInfo.hours && <li className="flex items-start gap-2"><Clock className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.hours}</li>}
              </ul>
            </div>
            
            <div className="space-y-6">
                {footer.socialLinks.showIcons && (
                     <div>
                        <h4 className="font-bold text-lg mb-3" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Síguenos</h4>
                        <div className="flex gap-4">
                            {Object.entries(footer.socialLinks).filter(([key, value]) => value && key !== 'showIcons' && SocialIconsMap[key]).map(([key, value]) => (
                                <a key={key} href={value as string} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                    {SocialIconsMap[key]}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                     <h4 className="font-bold text-lg mb-3" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Legal</h4>
                     <ul className="space-y-2 text-sm">
                        {footer.legalLinks.privacyPolicyUrl && <li><Link href="/politica-de-privacidad" className="hover:underline">Política de Privacidad</Link></li>}
                        {footer.legalLinks.termsAndConditionsUrl && <li><Link href="/terminos-y-condiciones" className="hover:underline">Términos y Condiciones</Link></li>}
                     </ul>
                </div>
            </div>
          </div>
          <div className="container mx-auto px-4 mt-12 border-t pt-8 text-center text-xs">
            © {new Date().getFullYear()} {footer.copyright.companyName}. {footer.copyright.additionalText}
          </div>
        </footer>
      )}

      <a 
        href={`https://api.whatsapp.com/send?phone=${String(data.header?.socialLinks?.whatsapp || footer.contactInfo.phone || '3228831634').replace(/\D/g, '')}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        <MessageCircle className="h-9 w-9" />
      </a>
    </div>
  );
}
