with member_price_seed (name, price, normal_price) as (
  values
    ('Chicken Breast 0.5 kg', 3.80, 4.50),
    ('Eggs (12 pack)', 3.50, 4.20),
    ('Brown Rice 5 kg', 8.20, 9.20),
    ('Pasta 500 g', 1.60, 2.00),
    ('Sugar 1 kg', 1.40, 1.70),
    ('Apples 1 kg', 3.20, 3.90),
    ('Bottled Water 1.5 L', 0.75, 1.00),
    ('Cheese 200 g', 2.90, 3.50)
)
insert into public.member_prices (name, price, normal_price)
select member_price_seed.name, member_price_seed.price, member_price_seed.normal_price
from member_price_seed
where not exists (
  select 1
  from public.member_prices
  where lower(public.member_prices.name) = lower(member_price_seed.name)
);
