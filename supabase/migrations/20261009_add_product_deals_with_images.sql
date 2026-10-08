with deal_seed (name, emoji, image_url, price, normal_price) as (
  values
    ('Coffee', '☕', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', 3.99, 5.00),
    ('Milk', '🥛', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', 2.70, 3.20),
    ('Fresh Produce', '🍅', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80', 3.80, 4.50),
    ('Bananas', '🍌', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80', 1.49, 1.99),
    ('Free-range Eggs (12 pack)', '🥚', 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=800&q=80', 3.99, 4.79),
    ('Wholegrain Bread', '🍞', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 2.49, 3.19),
    ('Greek Yogurt', '🥣', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', 3.29, 3.99),
    ('Orange Juice', '🍊', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80', 2.99, 3.79),
    ('Fresh Strawberries', '🍓', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80', 3.49, 4.29)
)
insert into deals (name, emoji, image_url, price, normal_price)
select deal_seed.name, deal_seed.emoji, deal_seed.image_url, deal_seed.price, deal_seed.normal_price
from deal_seed
where not exists (
  select 1
  from deals
  where lower(deals.name) = lower(deal_seed.name)
);
