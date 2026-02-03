
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

// This is the wrapper function that will be called from the client.
// It securely injects credentials on the server side.
export async function uploadMedia(input: UploadMediaInput): Promise<{ secure_url: string }> {
  // Securely get credentials from environment variables on the server
  const cloudinaryConfig = {
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  };

  if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    throw new Error('Cloudinary credentials are not configured on the server.');
  }

  // Combine client input with server-side config and call the internal flow
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
      // Configure Cloudinary with the provided credentials
      cloudinary.config(cloudinaryConfig);
      
      // Upload the media file from the data URI
      const result = await cloudinary.uploader.upload(mediaDataUri, {
        resource_type: "auto", // Automatically detect if it's an image or video
      });

      if (!result.secure_url) {
        throw new Error('Cloudinary did not return a secure URL.');
      }
      
      return {
        secure_url: result.secure_url,
      };

    } catch (error: any) {
      console.error('Error in uploadMediaFlow:', error);
      
      // Provide a more user-friendly error message for common issues
      if (error.message?.includes('Invalid credentials') || error.message?.includes('Invalid API key')) {
          throw new Error('Las credenciales de Cloudinary no son válidas. Por favor, revísalas en el panel de integraciones.');
      }

      throw new Error(`Failed to upload media: ${error.message}`);
    }
  }
);
