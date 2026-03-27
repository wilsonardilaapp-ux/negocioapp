'use server';

import { LandingPageEditor } from './editor';
import type { LandingPageData } from '@/models/landing-page';
import { v4 as uuidv4 } from 'uuid';

const initialLandingData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '',
    imageUrl: 'https://picsum.photos/seed/vintagecar/1200/800', 
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
    ctaButtonText: 'Contáctanos',
    ctaButtonUrl: '#contact'
  },
  navigation: { enabled: true, logoUrl: '', businessName: 'Mi Negocio', logoAlt: 'Logo', logoWidth: 120, logoAlignment: 'left', links: [], backgroundColor: '#FFFFFF', textColor: '#000000', hoverColor: '#4CAF50', fontSize: 16, spacing: 4, useShadow: true },
  sections: [], 
  testimonials: [], 
  seo: { title: 'Mi Negocio', description: '', keywords: [] }, 
  form: { fields: [], destinationEmail: '' }, 
  header: { 
    banner: { mediaUrl: null, mediaType: null }, 
    businessInfo: { name: '', address: '', phone: '', email: '' }, 
    socialLinks: { tiktok: '', instagram: '', facebook: '', whatsapp: '', twitter: '' }, 
    carouselItems: [
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
    ]
  },
  footer: { enabled: true, contactInfo: { address: '', phone: '', email: '', hours: '' }, quickLinks: [], legalLinks: { privacyPolicyUrl: '', termsAndConditionsUrl: '', cookiesPolicyUrl: '', legalNoticeUrl: '' }, socialLinks: { facebookUrl: '', instagramUrl: '', tiktokUrl: '', youtubeUrl: '', linkedinUrl: '', showIcons: true }, logo: { url: null, slogan: '' }, certifications: [], copyright: { companyName: '', additionalText: '' }, cta: { text: '', url: '', enabled: false }, visuals: { backgroundImageUrl: null, opacity: 80, backgroundColor: '#FFFFFF', textColor: '#000000', darkMode: false, showBackToTop: true }, adminExtras: { systemVersion: '1.0.0', supportLink: '', documentationLink: '' } },
};

// Firestore REST API value types
type FirestoreValue = 
  { stringValue: string } |
  { integerValue: string } |
  { doubleValue: number } |
  { booleanValue: boolean } |
  { nullValue: null } |
  { mapValue: { fields: { [key: string]: FirestoreValue } } } |
  { arrayValue: { values: FirestoreValue[] } };

// Function to transform Firestore REST API response to a plain JS object
function transformFirestoreData(fields: { [key: string]: FirestoreValue }): any {
  const transformed: { [key: string]: any } = {};
  for (const key in fields) {
    const value = fields[key];
    if ('stringValue' in value) {
      transformed[key] = value.stringValue;
    } else if ('integerValue' in value) {
      transformed[key] = parseInt(value.integerValue, 10);
    } else if ('doubleValue' in value) {
      transformed[key] = value.doubleValue;
    } else if ('booleanValue' in value) {
      transformed[key] = value.booleanValue;
    } else if ('nullValue' in value) {
      transformed[key] = null;
    } else if ('mapValue' in value && value.mapValue.fields) {
      transformed[key] = transformFirestoreData(value.mapValue.fields);
    } else if ('arrayValue' in value) {
      transformed[key] = (value.arrayValue.values || []).map(v => transformFirestoreData({ v }).v);
    }
  }
  return transformed;
}

function deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && key in target && typeof target[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
        Object.keys(target).forEach(key => {
            if (!(key in source)) {
                output[key] = target[key];
            }
        });
    }
    return output;
}

async function getLandingPageData(): Promise<LandingPageData> {
  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/negociod-v03-14457184/databases/(default)/documents/landing_configs/main`,
      { cache: 'no-store' } // Fetches fresh data on every request
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log("Document not found, returning initial data.");
        return initialLandingData;
      }
      throw new Error(`Failed to fetch from Firestore API, status: ${response.status}`);
    }

    const firestoreDoc = await response.json();
    if (!firestoreDoc.fields) {
      console.warn("Firestore document exists but has no fields. Using fallback data.");
      return initialLandingData;
    }

    const fetchedData = transformFirestoreData(firestoreDoc.fields);
    return deepMerge(initialLandingData, fetchedData);
    
  } catch (error) {
    console.error("Error fetching landing page data via REST API:", error);
    return initialLandingData;
  }
}

export default async function SuperAdminPublicLandingPage() {
    const data = await getLandingPageData();
    return <LandingPageEditor initialData={data} />;
}
