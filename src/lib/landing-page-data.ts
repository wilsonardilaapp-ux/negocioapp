import type { LandingPageData } from '@/models/landing-page';

// Helper function to recursively transform Firestore REST API response values
function transformValue(value: any): any {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.nullValue !== undefined) return null;
    if (value.mapValue) return transformFirestoreRestToRegularObject(value.mapValue.fields);
    if (value.arrayValue) {
        return value.arrayValue.values ? value.arrayValue.values.map(transformValue) : [];
    }
    // Return the raw value if no type is matched, to handle potential edge cases
    return value;
}

// Helper function to transform a Firestore REST API map object
function transformFirestoreRestToRegularObject(fields: any): any {
    if (!fields) return {};
    const regularObject: { [key: string]: any } = {};
    for (const key in fields) {
        regularObject[key] = transformValue(fields[key]);
    }
    return regularObject;
}

/**
 * Fetches landing page data from the Firestore REST API.
 * This function runs on the server.
 * @returns {Promise<LandingPageData | null>} The transformed landing page data or null if an error occurs.
 */
export async function getLandingDataFromRestApi(): Promise<LandingPageData | null> {
    try {
        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/negociod-v03-14457184/databases/(default)/documents/landing_configs/main`,
          { cache: 'no-store' } // Ensure fresh data on every request
        );

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Failed to fetch from Firestore REST API: ${response.status} ${response.statusText}`, errorBody);
            return null;
        }

        const responseJson = await response.json();
        
        // Handle cases where the document might not exist (which returns a different JSON structure)
        if (responseJson && responseJson.fields) {
            return transformFirestoreRestToRegularObject(responseJson.fields) as LandingPageData;
        }

        // If response is OK but 'fields' is missing, it likely means the document doesn't exist.
        console.log("Document 'landing_configs/main' does not exist or is empty.");
        return null;

    } catch (error) {
        console.error("Critical error fetching landing data via REST:", error);
        return null;
    }
}
