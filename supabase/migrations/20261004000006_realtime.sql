-- Realtime: mudanças chegam aos outros membros da lista (o Realtime respeita a RLS).
alter publication supabase_realtime add table public.items, public.categories, public.item_images, public.lists;
