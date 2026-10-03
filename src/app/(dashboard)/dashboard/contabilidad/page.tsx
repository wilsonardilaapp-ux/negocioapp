'use client';

import Contabilidad from "@/components/contabilidad/Contabilidad";
import { useUser } from "@/firebase";
import { JevCopilotWidgetContabilidad } from "@/jev/JevCopilotWidgetContabilidad";

export default function ContabilidadPage() {
    const { user } = useUser();

    return (
        <>
            <Contabilidad />
            <JevCopilotWidgetContabilidad businessId={user?.uid} />
        </>
    );
}
