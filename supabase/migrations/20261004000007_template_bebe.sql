-- Template "bebê". Novos tipos de lista (casamento, casa nova) entram como novos templates.
insert into public.list_templates (tipo, nome) values ('bebe', 'Bebê')
on conflict (tipo) do nothing;

insert into public.list_template_categories (tipo, nome, icone, ordem, mostra_tamanhos) values
  ('bebe', 'Roupas', 'shirt', 1, true),
  ('bebe', 'Banho e higiene', 'bath', 2, false),
  ('bebe', 'Quarto e sono', 'bed', 3, false),
  ('bebe', 'Alimentação', 'milk', 4, false),
  ('bebe', 'Passeio', 'stroller', 5, false),
  ('bebe', 'Eletrônicos', 'plug', 6, false),
  ('bebe', 'Saúde e cuidados', 'health', 7, false),
  ('bebe', 'Mamãe', 'flower', 8, false)
on conflict (tipo, ordem) do nothing;
