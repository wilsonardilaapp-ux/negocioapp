export type User = {
    id: string;
    name: string;
    email: string;
    role: 'cliente_admin' | 'staff' | 'super_admin';
    title?: string;
    phone?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    lastLogin: string;
    photoURL?: string;
};
