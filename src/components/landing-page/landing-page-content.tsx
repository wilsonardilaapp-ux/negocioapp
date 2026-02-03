
'use client';

import React, { useMemo } from 'react';
import type { LandingPageData } from '@/models/landing-page';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, Clock, MapPin, Youtube, Linkedin, ArrowUp, Star } from 'lucide-react';
import { PublicContactForm } from './public-contact-form';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";


interface LandingPageContentProps {
  data: LandingPageData;
  businessId?: string;
  logoUrl?: string;
}

export default function LandingPageContent({ data, businessId, logoUrl }: LandingPageContentProps) {
  const { hero, navigation, sections, testimonials, form, footer, header } = data;

  const finalLogoUrl = logoUrl || navigation.logoUrl;

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
    <div className="min-h-screen flex flex-col font-sans bg-white text-black">
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
                <a key={link.id} href={link.url} className="hover:opacity-70 transition-opacity" style={{ fontSize: `${navigation.fontSize}px` }}>
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
                                        <Image src={sub.imageUrl} alt={sub.title} layout="fill" className="object-cover"/>
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
                                    <Star key={i} className={cn("h-5 w-5", i < testimonial.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                ))}
                            </div>
                            <div className="prose prose-sm text-gray-600 mb-6 flex-grow" dangerouslySetInnerHTML={{ __html: testimonial.text }} />
                            <div className="flex items-center gap-4 mt-auto">
                                <Image src={testimonial.avatarUrl} alt={testimonial.authorName} width={48} height={48} className="rounded-full" />
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
                  <Image src={footer.logo.url} alt="Logo" layout="fill" className="object-contain" />
                </div>
              )}
              <p className="text-sm">{footer.logo.slogan}</p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg" style={{color: footer.visuals.darkMode ? '#FFFFFF' : '#000000'}}>Enlaces Rápidos</h4>
              <ul className="space-y-2">
                {footer.quickLinks.map(link => (
                  <li key={link.id}><a href={link.url} className="hover:underline">{link.text}</a></li>
                ))}
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
                        {footer.legalLinks.privacyPolicyUrl && <li><a href={footer.legalLinks.privacyPolicyUrl} className="hover:underline">Política de Privacidad</a></li>}
                        {footer.legalLinks.termsAndConditionsUrl && <li><a href={footer.legalLinks.termsAndConditionsUrl} className="hover:underline">Términos y Condiciones</a></li>}
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
