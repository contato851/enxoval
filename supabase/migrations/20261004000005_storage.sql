-- Storage: bucket privado. Caminho: <list_id>/<item_id>/<arquivo>.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "item-images: membros leem" on storage.objects
  for select to authenticated
  using (bucket_id = 'item-images' and (select public.is_list_member_text((storage.foldername(name))[1])));

create policy "item-images: membros enviam" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-images' and (select public.is_list_member_text((storage.foldername(name))[1])));

create policy "item-images: membros alteram" on storage.objects
  for update to authenticated
  using (bucket_id = 'item-images' and (select public.is_list_member_text((storage.foldername(name))[1])));

create policy "item-images: membros excluem" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-images' and (select public.is_list_member_text((storage.foldername(name))[1])));
