'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import type { LandingPageData, NavLink } from '@/models/landing-page';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, Clock, MapPin, Youtube, Linkedin, ArrowUp, Star } from 'lucide-react';
import { PublicContactForm } from './public-contact-form';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import type { SubscriptionPlan } from '@/models/subscription-plan';

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
  businessId?: string;
  logoUrl?: string;
}

const getLinkUrl = (link: NavLink, currentBusinessId: string | undefined): string => {
  if (link.url && link.url !== '#') {
    return link.url;
  }
  const text = link.text.toLowerCase();
  if (text.includes('blog')) return '/blog';
  if (text.includes('catálogo')) return currentBusinessId ? `/catalog/${currentBusinessId}` : '#';
  if (text.includes('contacto')) return '/contacto';
  if (text.includes('inicio')) return currentBusinessId ? `/landing/${currentBusinessId}` : '/';
  return '#';
};

const getPlanButtonConfig = (plan: SubscriptionPlan, hotmartLinks: HotmartLink[]): PlanButton => {
    const hotmartLink = hotmartLinks.find((h) => h.planId === plan.id);
  
    if (plan.price === 0) {
      return {
        label: 'Empezar Gratis',
        variant: 'free',
        onClick: () => {
          const url = hotmartLink?.hotmartUrl || `/register?plan=${plan.id}`;
          window.open(url, '_self');
        },
      };
    }
  
    return {
      label: 'Suscribirse',
      variant: plan.isMostPopular ? 'popular' : 'paid',
      onClick: () => {
        if (hotmartLink?.hotmartUrl) {
          window.open(hotmartLink.hotmartUrl, '_blank');
          return;
        }
        window.location.href = `/register?plan=${plan.id}`;
      },
    };
  };


export default function LandingPageContent({ data, plans = [], businessId, logoUrl }: LandingPageContentProps) {
  const { hero, navigation, sections, testimonials, form, footer, header } = data;

  const finalLogoUrl = logoUrl || navigation.logoUrl;

  const hotmartLinks: HotmartLink[] = useMemo(() => {
    if (!plans) return [];
    return plans.map(p => ({
        planId: p.id,
        planName: p.name,
        hotmartUrl: (p as any).hotmartUrl || '',
    }));
  }, [plans]);

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

  const socialIcons: { [key: string]: React.ReactNode } = {
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

  const renderCarousel = () => (
    header.carouselItems && header.carouselItems.some(item => item.mediaUrl) && (
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
          {header.banner.mediaUrl && (
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
                  <h2 className="text-3xl font-bold font-headline">{header.businessInfo.name}</h2>
                  <p className="text-md text-muted-foreground">{header.businessInfo.address}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-2 text-sm">
                      {header.businessInfo.phone && <p className="text-muted-foreground">{header.businessInfo.phone}</p>}
                      {header.businessInfo.email && <a href={`mailto:${header.businessInfo.email}`} className="text-muted-foreground hover:text-primary">{header.businessInfo.email}</a>}
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  {Object.entries(header.socialLinks).filter(([_, value]) => value).map(([key, value]) => (
                      <a key={key} href={value as string} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          {socialIcons[key]}
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
          className={`sticky top-0 z-50 py-4 transition-shadow ${navigation.useShadow ? 'shadow-md' : ''}`}
        >
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className={`flex items-center ${navigation.logoAlignment === 'center' ? 'mx-auto' : navigation.logoAlignment === 'right' ? 'ml-auto' : ''}`}>
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
      
      {/* Conditional rendering for Carousel and Banner */}
      {header.bannerPosition === 'above' ? (
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
      {plans && plans.length > 0 && (
          <section className="py-16 px-4 bg-gray-50" id="precios">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900">
                  Planes y Precios
                </h2>
                <p className="text-gray-500 mt-2">
                  Elige el plan que mejor se adapta a tu negocio.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                    const btn = getPlanButtonConfig(plan, hotmartLinks);
                    return (
                        <div
                        key={plan.id}
                        className={cn(
                            "rounded-2xl p-6 bg-white relative flex flex-col",
                            plan.isMostPopular ? 'border-2 border-primary shadow-md' : 'border border-gray-200'
                        )}
                        >
                        {plan.isMostPopular && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                            Más Popular
                            </span>
                        )}
                        <div className="flex-grow">
                            <h3 className="text-xl font-bold text-gray-800">
                                {plan.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 h-10">
                                {plan.description}
                            </p>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">
                                ${plan.price.toFixed(2)}
                                </span>
                                <span className="text-gray-400 text-sm">
                                /mes
                                </span>
                            </div>
                            <ul className="space-y-2 mb-6">
                                {plan.features.map((feature, idx) => (
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
                            <div className="border-t border-gray-100 pt-4 space-y-1 text-sm text-gray-500">
                                <p className="text-sm font-semibold text-gray-700 mb-2">
                                Límites:
                                </p>
                                <div className="flex justify-between">
                                <span>Productos:</span>
                                <span className="font-medium text-gray-700">
                                    {plan.limits.products === -1 ? 'Ilimitados' : plan.limits.products}
                                </span>
                                </div>
                                <div className="flex justify-between">
                                <span>Posts de Blog:</span>
                                <span className="font-medium text-gray-700">
                                    {plan.limits.blogPosts === -1 ? 'Ilimitados' : plan.limits.blogPosts}
                                </span>
                                </div>
                                <div className="flex justify-between">
                                <span>Landing Pages:</span>
                                <span className="font-medium text-gray-700">
                                    {plan.limits.landingPages === -1 ? 'Ilimitadas' : plan.limits.landingPages}
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
                })}
              </div>
            </div>
          </section>
        )}

      {/* Formulario */}
      <section id="contact" className="py-24 bg-gray-50 flex-grow">
        <div className="container mx-auto px-4 flex justify-center">
          {form.fields.length > 0 && <PublicContactForm formConfig={form} businessId={businessId || ''} />}
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
            
            {/* Logo and Slogan */}
            <div className="md:col-span-1 space-y-4">
              {footer.logo.url && (
                <div className="relative h-16 w-40">
                  <Image src={footer.logo.url} alt="Logo" fill sizes="10rem" className="object-contain" />
                </div>
              )}
              <p className="text-sm">{footer.logo.slogan}</p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Enlaces Rápidos</h4>
              <ul className="space-y-2">
                {footer.quickLinks.map(link => {
                    const lowerCaseText = link.text.toLowerCase();
                    if (lowerCaseText.includes('sobre nosotros')) {
                        return (
                            <li key={link.id}>
                                <Link href="/sobre-nosotros" className="hover:underline">
                                    {link.text}
                                </Link>
                            </li>
                        );
                    }
                    if (lowerCaseText.includes('servicios')) {
                      return (
                          <li key={link.id}>
                              <Link href="/servicios" className="hover:underline">
                                  {link.text}
                              </Link>
                          </li>
                      );
                    }
                     if (lowerCaseText.includes('contacto')) {
                        return (
                            <li key={link.id}>
                                <Link href="/contacto" className="hover:underline">
                                    {link.text}
                                </Link>
                            </li>
                        );
                    }
                    return (
                        <li key={link.id}>
                            <a href={link.url} className="hover:underline">
                                {link.text}
                            </a>
                        </li>
                    );
                })}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Contacto</h4>
              <ul className="space-y-3">
                {footer.contactInfo.address && <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.address}</li>}
                {footer.contactInfo.phone && <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.phone}</li>}
                {footer.contactInfo.email && <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.email}</li>}
                {footer.contactInfo.hours && <li className="flex items-start gap-2"><Clock className="h-4 w-4 mt-1 shrink-0"/>{footer.contactInfo.hours}</li>}
              </ul>
            </div>
            
            {/* Social & Legal */}
            <div className="space-y-6">
                {footer.socialLinks.showIcons && (
                     <div>
                        <h4 className="font-bold text-lg mb-3" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Síguenos</h4>
                        <div className="flex gap-4">
                            {Object.entries(footer.socialLinks).filter(([key, value]) => value && key !== 'showIcons' && socialIcons[key as keyof typeof socialIcons]).map(([key, value]) => (
                                <a key={key} href={value as string} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                    {socialIcons[key as keyof typeof socialIcons]}
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
        href={`https://wa.me/${(data.header?.socialLinks?.whatsapp || footer.contactInfo.phone)?.replace(/\D/g, '')}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        <MessageCircle className="h-9 w-9" />
      </a>
    </div>
  );
}
