create table if not exists sys_spu (
  id uuid default gen_random_uuid() primary key,
  style_demand_id uuid references b_style_demand(id),
  spu_code text not null,
  image_url text,
  shop_id uuid references sys_shop(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
