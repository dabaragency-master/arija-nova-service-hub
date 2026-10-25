ALTER TABLE public.clients ADD COLUMN client_type text NOT NULL DEFAULT 'privatni', ADD COLUMN floor text, ADD COLUMN has_lift boolean, ADD COLUMN access_notes text;
ALTER TABLE public.devices ADD COLUMN refrigerant text, ADD COLUMN warranty_until date, ADD COLUMN last_service_at date;
ALTER TABLE public.work_orders ADD COLUMN checklist jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.work_order_photos ADD COLUMN category text NOT NULL DEFAULT 'ostalo';

CREATE TABLE public.materials_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kom',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials_catalog TO authenticated;
GRANT ALL ON public.materials_catalog TO service_role;
ALTER TABLE public.materials_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog read" ON public.materials_catalog FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));
CREATE POLICY "catalog staff insert" ON public.materials_catalog FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "catalog staff update" ON public.materials_catalog FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "catalog staff delete" ON public.materials_catalog FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO public.materials_catalog (name, unit) VALUES
('Bakrena cijev 1/4"', 'm'), ('Bakrena cijev 3/8"', 'm'), ('Bakrena cijev 1/2"', 'm'),
('Izolacija cijevi', 'm'), ('Nosač vanjske jedinice 450 mm', 'set'), ('Antivibracijske gume', 'set'),
('Kanalica 60x40', 'm'), ('Kondenzacijsko crijevo', 'm'), ('Kabel 5x1,5', 'm'),
('Plin R32', 'kg'), ('Plin R410A', 'kg'), ('Sredstvo za dezinfekciju', 'kom'), ('Pumpica za kondenzat', 'kom');