const fs = require('fs');

const items_text = `
BREAKFAST
Egg Omelette — Egg, Tomato, Onion, Green Pepper; served with 3 slices of bread — 300
Beef Omelette — Egg, Grounded Beef, Tomato, Onion, Green Pepper; served with 3 slices of bread — 420
Scrambled Egg — Egg, Tomato, Onion, Green Pepper; served with bread — 360
Scrambled Egg with Meat — Egg, Grounded Beef, Tomato, Onion, Green Pepper; served with 3 slices of bread — 440
Scrambled Egg with Tuna — Egg, Tuna; served with flatbread — 650
Egg Sandwich — Egg, Tomato, Onion, Green Pepper — 340
Fetira — Flatbread with honey — 230
Fetira with Egg — Flatbread with egg and honey — 290
Special Fetira — Flatbread, Grounded Beef, Egg, Honey — 400
Chechebsa (Fasting/Non-Fasting) — Chopped flatbread of wheat flour, Red powdered pepper, Butter — 260
Special Chechebsa — Chopped flatbread of wheat flour, Red powdered pepper, Butter, Egg — 360
Teff Chechebsa (Fasting/Non-Fasting) — Chopped flatbread of teff flour, Red powdered pepper, Butter — 290
Special Teff Chechebsa (Fasting/Non-Fasting) — Chopped flatbread of teff flour, Red powdered pepper, Butter, Egg — 400
French Toast — Sliced bread toasted with Egg; served with salad — 290
Waffle (Fasting/Non-Fasting) — Wheat flour, Egg, Milk, Vanilla, Syrup; served with salad — 290
Teff Waffle (Fasting/Non-Fasting) — Teff flour, Egg, Milk, Vanilla, Syrup; served with salad — 310
Pancake (Fasting/Non-Fasting) — Wheat flour, Vanilla, Egg, Syrup; served with salad — 260
Oatmeal Pancake (Fasting/Non-Fasting) — Oat flour, Vanilla, Egg, Syrup; served with salad — 350
Teff Pancake (Fasting/Non-Fasting) — Teff flour, Egg, Vanilla, Syrup; served with salad — 300
Ful — Fava beans with flatbread — 220
Special Ful — Fava beans garnished with vegetables, served with flatbread — 295

SANDWICH SECTION
Vegetable Sandwich — Tomato, Onion, Cucumber, Carrot, Cabbage, Lettuce; served with salad or fries — 330
Tuna Sandwich — Tuna, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 630
Chicken Sandwich — Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 630
BBQ Chicken Sandwich — BBQ Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 650
Special Chicken Sandwich — Grilled Chicken, Cheese, Egg, Chicken Mortadella, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 730
Beef Sandwich — Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 600
BBQ Beef Sandwich — BBQ Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 620
Special Beef Sandwich — Grilled Beef, Cheese, Egg, Beef Mortadella, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 680
Club Sandwich / Chicken — Chicken, Cheese, Egg, Green Pepper, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 650
Club Sandwich / Tuna — Tuna, Cheese, Egg, Green Pepper, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 640

WRAP SECTION
Vegetable Wrap — Tomato, Onion, Cucumber, Lettuce; served with salad or fries — 300
Tuna Wrap — Tuna, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 600
Chicken Wrap — Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 595
BBQ Chicken Wrap — BBQ Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 640
Special Chicken Wrap — Grilled Chicken, Cheese, Chicken Mortadella, Egg, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 750
Beef Wrap — Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 580
BBQ Beef Wrap — BBQ Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 630
Special Beef Wrap — Grilled Beef, Cheese, Beef Mortadella, Egg, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries — 750

BURGER SECTION
Beef Burger — Beef, Lettuce, Tomato, Onion, Mayonnaise; served with fries — 430
Cheese Burger — Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with fries — 490
Double Beef Burger — Double Beef, Double Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with fries — 595
Special Burger — Double Beef, Double Cheese, Double Beef Mortadella, Egg, Lettuce, Tomato, Onion, Mayonnaise; served with fries — 680
French Fries — 280

DRINKS
Cool Drinks
Ice Coffee — 140
Iced Latte — 170
Iced Caramel Latte — 220
Iced Mocha — 210
Smoothies
Strawberry/Banana — 240
Banana/Avocado/Peanut — 220
Banana/Papaya — 220
Strawberry — 250
House Special (Banana, Avocado, Strawberry, Papaya, Milk, Cinnamon) — 240
Mocha Frappe Smoothie — 230
Caramel Frappe Smoothie — 230
Fasting Special — 220
Peanut Banana Espresso — 240
Mojito
Strawberry Mojito — 240
Orange Mojito — 150
Lemon Mojito — 240
Mint Mojito — 150
Pineapple Mojito — 230
Juice
Papaya — 190
Avocado — 220
Watermelon — 200
Mixed Juice (Banana, Avocado, Strawberry, Papaya) — 210
Mango — 250
Fasting Special Juice (Banana, Avocado, Papaya, Strawberry, Peanut) — 220
Strawberry — 280
Lemonade — 220
Special Shake — 230
Soft Drink
Soft Drink — 60
Mineral Water 500ml — 45
Mineral Water 1L — 60
Hot Drinks
Tea — 45
Tea with Lemon — 60
Tea with Coffee / Spice — 80
Special Tea — 160
Ginger Tea — 95
Ginger Tea with Honey — 130
Green Tea / Flavored Tea — 45
Peanut Tea (Lewz) — 95
Machine Coffee — 80
Macchiato — 95
Double Macchiato — 180
Milk — 110
Espresso — 80
Americano — 85
Café Latte — 180
Tea Latte — 150
Cappuccino — 195
Coffee Karavat — 80
Steamed Coffee — 75

Extras
Egg — 35
Bread — 35
Cheese — 70
Honey — 50
Mayonnaise — 45
`.split('\n');

let current_cat = '';
let current_sub = '';
const items = [];
let id_counter = 1;

for (let line of items_text) {
  line = line.trim();
  if (!line) continue;
  
  if (['BREAKFAST', 'SANDWICH SECTION', 'WRAP SECTION', 'BURGER SECTION', 'DRINKS', 'Extras'].includes(line)) {
    current_cat = line;
    current_sub = '';
    continue;
  }
  
  if (current_cat === 'DRINKS' && ['Cool Drinks', 'Smoothies', 'Mojito', 'Juice', 'Soft Drink', 'Hot Drinks'].includes(line)) {
    current_sub = line;
    continue;
  }
  
  let name = '';
  let description = '';
  let price = 0;
  
  let parts = line.split('—').map(p => p.trim());
  if (parts.length >= 2) {
    if (parts.length === 3) {
      name = parts[0];
      description = parts[1];
      price = parseFloat(parts[2]);
    } else {
      name = parts[0];
      price = parseFloat(parts[1]);
    }
  } else {
    // Might be single name, but format is mostly NAME - PRICE
    continue;
  }
  
  let tags = [];
  if (name.includes('Fasting/Non-Fasting') || name.includes('Fasting')) {
    tags.push('Fasting');
    name = name.replace('(Fasting/Non-Fasting)', '').trim();
    name = name.replace('(Fasting)', '').trim();
  }
  
  let catId = '';
  if (current_cat === 'BREAKFAST') catId = 'cat-breakfast';
  if (current_cat === 'SANDWICH SECTION') catId = 'cat-sandwich';
  if (current_cat === 'WRAP SECTION') catId = 'cat-wrap';
  if (current_cat === 'BURGER SECTION') catId = 'cat-burger';
  if (current_cat === 'Extras') catId = 'cat-extras';
  if (current_cat === 'DRINKS') {
    if (current_sub === 'Cool Drinks') catId = 'cat-drinks-cool';
    if (current_sub === 'Smoothies') catId = 'cat-drinks-smoothies';
    if (current_sub === 'Mojito') catId = 'cat-drinks-mojito';
    if (current_sub === 'Juice') catId = 'cat-drinks-juice';
    if (current_sub === 'Soft Drink') catId = 'cat-drinks-soft';
    if (current_sub === 'Hot Drinks') catId = 'cat-drinks-hot';
  }
  
  if (catId) {
    items.push({
      id: 'item-' + id_counter++,
      name: name,
      description: description,
      price: price,
      categoryId: catId,
      image: '',
      extras: [],
      available: true,
      tags: tags
    });
  }
}

fs.writeFileSync('menu_data_generated.json', JSON.stringify(items, null, 2));
console.log('done');
