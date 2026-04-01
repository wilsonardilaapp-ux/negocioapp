'use server';

import { getAdminFirestore } from "@/firebase/server-init";
import type { ContactSubmission } from "@/models/contact-submission";

interface SendClientMessageInput {
    businessId: string;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
}

export async function sendClientMessage(input: SendClientMessageInput): Promise<{ success: boolean; error?: string }> {
    const { businessId, name, email, phone, subject, message } = input;

    if (!businessId || !name || !email || !subject || !message) {
        return { success: false, error: "Faltan campos obligatorios." };
    }

    try {
        const firestore = await getAdminFirestore();
        const submissionsCollection = firestore.collection(`businesses/${businessId}/contactSubmissions`);

        // We use the 'whatsapp' field to store the phone number as per the model
        const submissionData: Omit<ContactSubmission, 'id'> = {
            businessId: businessId,
            formId: 'public_contact_form',
            sender: name,
            email: email,
            whatsapp: phone,
            message: `Asunto: ${subject}\n\n${message}`, // Prepend subject to message body
            date: new Date().toISOString(),
        };

        await submissionsCollection.add(submissionData);

        return { success: true };

    } catch (error: any) {
        console.error("Error sending client message:", error);
        return { success: false, error: "No se pudo enviar el mensaje. Por favor, intente de nuevo más tarde." };
    }
}
