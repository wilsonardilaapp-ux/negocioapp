export type User = {
    id: string;
    name: string;
    email: string;
    role: 'cliente_admin' | 'staff' | 'super_admin';
    status: 'active' | 'inactive';
    createdAt: string;
    lastLogin: string;
};