
-- =================================================================
--  SCRIPT DE MIGRACIÓN DE FIREBASE A SUPABASE/POSTGRESQL
-- =================================================================
-- Este script convierte la estructura de la base de datos de Firestore
-- del proyecto Negocio V03 a un esquema relacional para PostgreSQL,
-- optimizado para su uso con Supabase.

-- =================================================================
-- 1. FUNCIÓN TRIGGER PARA ACTUALIZAR TIMESTAMPS
-- =================================================================
-- Esta función se ejecutará automáticamente cada vez que se actualice una fila,
-- para mantener la columna `updated_at` al día.

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 2. CREACIÓN DE TABLAS
-- =================================================================

-- Tabla para perfiles de usuario, vinculada a la autenticación de Supabase.
-- Corresponde a la colección `users` de Firestore.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('cliente_admin', 'staff', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  business_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Stores user profile information, linked to Supabase auth.';

-- Tabla para los negocios/empresas.
-- Corresponde a la colección `businesses` de Firestore.
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  google_analytics_id TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.businesses IS 'Stores information about each business on the platform.';

-- Alterar la tabla de perfiles para añadir la FK a `businesses`.
-- Se hace después para evitar dependencias circulares.
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_business_id
FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


-- Tabla para los productos de cada negocio.
-- Corresponde a la subcolección `businesses/{businessId}/products`.
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[],
  rating NUMERIC(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.products IS 'Stores product information for each business.';

-- Tabla para las órdenes/pedidos de cada negocio.
-- Corresponde a la subcolección `businesses/{businessId}/orders`.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  order_status TEXT NOT NULL CHECK (order_status IN ('Pendiente', 'En proceso', 'Enviado', 'Entregado', 'Cancelado')),
  payment_method TEXT,
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.orders IS 'Stores customer orders for each business.';

-- Tabla para los detalles de cada orden (productos en la orden).
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);
COMMENT ON TABLE public.order_items IS 'Stores the individual product items for each order.';


-- Tabla para las configuraciones de landing pages de cada negocio.
-- Corresponde a la subcolección `businesses/{businessId}/landingPages`.
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB, -- Usamos JSONB para estructuras complejas.
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.landing_pages IS 'Stores landing page configurations for each business.';

-- Tabla para la configuración del chatbot.
-- Corresponde al documento `businesses/{businessId}/chatbotConfig/main`.
CREATE TABLE IF NOT EXISTS public.chatbot_configs (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  config JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.chatbot_configs IS 'Stores chatbot settings for each business.';

-- Tabla para la base de conocimiento del chatbot.
-- Corresponde a la subcolección `knowledgeBase`.
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  status TEXT CHECK (status IN ('training', 'ready', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.knowledge_documents IS 'Knowledge base documents for the chatbot.';

-- Tabla para las conversaciones del chatbot.
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_identifier TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status TEXT CHECK (status IN ('active', 'resolved', 'abandoned', 'escalated')),
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    summary TEXT
);
COMMENT ON TABLE public.chat_conversations IS 'Stores chat sessions between users and the chatbot.';

-- Tabla para los mensajes del chatbot.
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
    content TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.chat_messages IS 'Stores individual messages within a chat conversation.';

-- Tabla para la configuración global.
-- Corresponde a la colección `globalConfig`.
CREATE TABLE IF NOT EXISTS public.global_config (
  id TEXT PRIMARY KEY,
  maintenance BOOLEAN DEFAULT false,
  allow_user_registration BOOLEAN DEFAULT true,
  logo_url TEXT,
  theme TEXT,
  support_email TEXT,
  main_business_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.global_config IS 'Global settings for the entire platform.';


-- =================================================================
-- 3. CREACIÓN DE TRIGGERS
-- =================================================================
-- Aplicar el trigger `handle_updated_at` a todas las tablas que lo necesiten.

CREATE TRIGGER on_profiles_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER on_businesses_update BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER on_products_update BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER on_orders_update BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER on_landing_pages_update BEFORE UPDATE ON public.landing_pages FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER on_chatbot_configs_update BEFORE UPDATE ON public.chatbot_configs FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER on_global_config_update BEFORE UPDATE ON public.global_config FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();


-- =================================================================
-- 4. CREACIÓN DE ÍNDICES
-- =================================================================
-- Crear índices en columnas frecuentemente consultadas para mejorar el rendimiento.

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_business_id ON public.chat_conversations(business_id);

-- =================================================================
-- 5. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- =================================================================
-- Estas políticas aseguran que los usuarios solo puedan acceder a sus propios datos.

-- Perfiles (profiles)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Negocios (businesses)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage their own business" ON public.businesses FOR ALL USING (auth.uid() = owner_id);

-- Productos (products)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view products of their own business" ON public.products FOR SELECT USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid())
);
CREATE POLICY "Users can manage products of their own business" ON public.products FOR ALL USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid())
);

-- Órdenes (orders)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage their orders" ON public.orders FOR ALL USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid())
);

-- =================================================================
-- 6. INSERCIONES DE EJEMPLO
-- =================================================================
-- NOTA: Estos INSERTs asumen que ya existen usuarios en `auth.users`.
-- Deberás reemplazar los UUIDs con los IDs de usuarios reales de tu instancia de Supabase.

-- Asumamos que tenemos un super_admin con un UUID conocido
-- y un cliente_admin con otro UUID.
-- Reemplaza 'uuid_del_super_admin' y 'uuid_del_cliente_admin' con valores reales.

-- INSERT INTO public.profiles (id, name, email, role) VALUES
-- ('uuid_del_super_admin', 'Super Admin', 'super@admin.com', 'super_admin'),
-- ('uuid_del_cliente_admin', 'Cliente Admin Uno', 'cliente@uno.com', 'cliente_admin');

-- INSERT INTO public.businesses (name, owner_id) VALUES
-- ('Negocio del Cliente Uno', 'uuid_del_cliente_admin');

-- INSERT INTO public.products (business_id, name, price, stock, category)
-- SELECT id, 'Producto de Ejemplo', 19.99, 100, 'Categoría Ejemplo'
-- FROM public.businesses WHERE owner_id = 'uuid_del_cliente_admin';

-- INSERT INTO public.global_config (id, maintenance, theme, support_email) VALUES
-- ('system', false, 'default', 'support@negociov03.com');

-- Ejemplo de inserción de una orden (reemplaza los UUIDs)
-- INSERT INTO public.orders (business_id, customer_name, order_status)
-- SELECT b.id, 'Cliente de Prueba', 'Pendiente'
-- FROM public.businesses b WHERE b.owner_id = 'uuid_del_cliente_admin';

-- INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
-- SELECT o.id, p.id, 2, p.price
-- FROM public.orders o, public.products p
-- WHERE o.business_id = p.business_id
-- LIMIT 1;
