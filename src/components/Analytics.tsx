'use client';

import { usePathname } from 'next/navigation';
import AnalyticsContent from './AnalyticsContent';

export default function Analytics() {
    const pathname = usePathname();
    const isPrivatePage = pathname.startsWith('/dashboard') || pathname.startsWith('/superadmin');

    if (!isPrivatePage) return null;

    return <AnalyticsContent />;
}
