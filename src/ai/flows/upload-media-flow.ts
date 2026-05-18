
'use server';
/**
 * @fileOverview A flow for securely uploading media files to Cloudinary.
 *
 * - uploadMedia - A function that handles the media upload process.
 * - UploadMediaInput - The input type for the uploadMedia function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminFirestore } from '@/firebase/server-init';
import type { CloudinaryFields } from '@/models/integration';

// Full schema for the internal flow
const UploadMediaFlowInputSchema = z.object({
  mediaDataUri: z
    .string()
    .describe(
      "A media file (image or video) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  cloudinaryConfig: z.object({
      cloud_name: z.string(),
      api_key: z.string(),
      api_secret: z.string(),
  }).describe("Cloudinary credentials.")
});

// Type for the public-facing wrapper function, omitting the secure config
export type UploadMediaInput = Omit<z.infer<typeof UploadMediaFlowInputSchema>, 'cloudinaryConfig'>;

const UploadMediaOutputSchema = z.object({
  secure_url: z.string().url(),
});

/**
 * Wrapper function that fetches credentials and calls the upload flow.
 * Implements automatic WebP conversion for optimized SaaS performance.
 */
export async function uploadMedia(input: UploadMediaInput): Promise<{ secure_url: string }> {
  const firestore = await getAdminFirestore();
  const cloudinaryIntegrationDoc = await firestore.doc('integrations/cloudinary').get();

  if (!cloudinaryIntegrationDoc.exists) {
      throw new Error('La integración de Cloudinary no está configurada.');
  }
  
  const integrationData = cloudinaryIntegrationDoc.data();
  if (integrationData?.status !== 'active') {
      throw new Error('La integración de Cloudinary no está activa.');
  }

  let cloudinaryConfig: CloudinaryFields;
  try {
    if (typeof integrationData.fields === 'object' && integrationData.fields !== null) {
        cloudinaryConfig = integrationData.fields as CloudinaryFields;
    } else if (typeof integrationData.fields === 'string' && integrationData.fields.trim().startsWith('{')) {
        cloudinaryConfig = JSON.parse(integrationData.fields);
    } else {
      throw new Error('Formato de credenciales inválido o vacío.');
    }
  } catch (e) {
      console.error("Error parsing Cloudinary fields from Firestore:", e);
      throw new Error('Las credenciales de Cloudinary tienen un formato incorrecto y no se pueden leer.');
  }
  
  const missingFields = [];
  if (!cloudinaryConfig?.cloud_name) missingFields.push('Cloud Name');
  if (!cloudinaryConfig?.api_key) missingFields.push('API Key');
  if (!cloudinaryConfig?.api_secret) missingFields.push('API Secret');

  if (missingFields.length > 0) {
    throw new Error(`Las credenciales de Cloudinary están incompletas. Falta(n): ${missingFields.join(', ')}. Por favor, configúralas en el panel de Integraciones.`);
  }

  return uploadMediaFlow({
    ...input,
    cloudinaryConfig,
  });
}

const uploadMediaFlow = ai.defineFlow(
  {
    name: 'uploadMediaFlow',
    inputSchema: UploadMediaFlowInputSchema,
    outputSchema: UploadMediaOutputSchema,
  },
  async ({ mediaDataUri, cloudinaryConfig }) => {
    try {
      cloudinary.config(cloudinaryConfig);
      
      const isImage = mediaDataUri.startsWith('data:image/');
      
      // Configure upload with automatic optimization and WebP format for images
      const uploadOptions: any = {
        resource_type: "auto",
        folder: "saas_uploads",
      };

      if (isImage) {
        uploadOptions.format = 'webp';
        uploadOptions.transformation = [
          { quality: 'auto', fetch_format: 'auto' }
        ];
      }

      const result = await cloudinary.uploader.upload(mediaDataUri, uploadOptions);

      if (!result.secure_url) {
        throw new Error('Cloudinary did not return a secure URL.');
      }
      
      return {
        secure_url: result.secure_url,
      };

    } catch (error: any) {
      console.error('Error in uploadMediaFlow:', error);
      
      if (error.message?.includes('Invalid credentials') || error.message?.includes('Invalid API key')) {
          throw new Error('Las credenciales de Cloudinary no son válidas. Por favor, revísalas en el panel de integraciones.');
      }

      throw new Error(`Failed to upload media: ${error.message}`);
    }
  }
);
