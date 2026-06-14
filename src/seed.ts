import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}

// ── Logger ────────────────────────────────────────────────────────────────────
const log = {
  section: (msg: string) => console.log(`\n${'═'.repeat(56)}\n  ${msg}\n${'═'.repeat(56)}`),
  success: (msg: string) => console.log(`  ✅  ${msg}`),
  info:    (msg: string) => console.log(`  ℹ️   ${msg}`),
  warn:    (msg: string) => console.warn(`  ⚠️   ${msg}`),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(d: number, extraMinutes = 0): Date {
  return new Date(Date.now() - d * 86_400_000 - extraMinutes * 60_000);
}
function round2(n: number): number { return Math.round(n * 100) / 100; }

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'admin@cafepos.com',   name: 'Admin User',     password: 'admin123',   role: 'OWNER'   as const },
  { email: 'hemal@gmail.com',     name: 'Hemal Patel',    password: 'Hemu@123',   role: 'OWNER'   as const },
  { email: 'maya@cafepos.com',    name: 'Maya Sharma',    password: 'manager123', role: 'MANAGER' as const },
  { email: 'john@cafepos.com',    name: 'John Mathews',   password: 'cashier123', role: 'STAFF'   as const },
  { email: 'priya@cafepos.com',   name: 'Priya Verma',    password: 'staff123',   role: 'STAFF'   as const },
  { email: 'neha@cafepos.com',    name: 'Neha Desai',     password: 'staff456',   role: 'STAFF'   as const },
  { email: 'kitchen@cafepos.com', name: 'Chef Rohan',     password: 'kitchen123', role: 'KITCHEN' as const },
  { email: 'chef2@cafepos.com',   name: 'Chef Ananya',    password: 'kitchen456', role: 'KITCHEN' as const },
];

// ── 10 Categories with 80+ items ──────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'Hot Beverages', color: '#EF4444', icon: '☕', preparationStation: 'Barista Station',
    items: [
      { name: 'Espresso',           price: 180, isPopular: true,  description: 'Rich double shot of pure arabica espresso' },
      { name: 'Cappuccino',         price: 260, isPopular: true,  description: 'Velvety espresso layered with steamed milk foam' },
      { name: 'Flat White',         price: 280, isPopular: false, description: 'Smooth ristretto with micro-foam whole milk' },
      { name: 'Caramel Latte',      price: 320, isPopular: true,  description: 'Espresso with steamed milk and house caramel sauce' },
      { name: 'Americano',          price: 200, isPopular: false, description: 'Bold espresso topped with hot filtered water' },
      { name: 'Mocha',              price: 300, isPopular: true,  description: 'Espresso blended with rich chocolate and steamed milk' },
      { name: 'Masala Chai',        price: 150, isPopular: true,  description: 'Spiced Indian tea brewed with ginger and cardamom' },
      { name: 'Hot Chocolate',      price: 280, isPopular: false, description: 'Creamy Belgian cocoa with whipped cream on top' },
      { name: 'Turmeric Latte',     price: 260, isPopular: false, description: 'Golden milk with turmeric, ginger and oat milk' },
      { name: 'Hazelnut Macchiato', price: 300, isPopular: false, description: 'Espresso with steamed milk and hazelnut drizzle' },
    ],
  },
  {
    name: 'Cold Beverages', color: '#3B82F6', icon: '🧊', preparationStation: 'Barista Station',
    items: [
      { name: 'Iced Latte',         price: 300, isPopular: true,  description: 'Chilled espresso poured over milk and ice' },
      { name: 'Cold Brew',          price: 320, isPopular: true,  description: '18-hour slow-steeped coffee, served black over ice' },
      { name: 'Mango Smoothie',     price: 280, isPopular: true,  description: 'Fresh Alphonso mango blended with yogurt' },
      { name: 'Strawberry Shake',   price: 260, isPopular: false, description: 'Farm-fresh strawberries blended with chilled milk' },
      { name: 'Watermelon Juice',   price: 180, isPopular: false, description: 'Fresh-pressed seasonal watermelon juice, no sugar' },
      { name: 'Lemonade',           price: 160, isPopular: true,  description: 'House mint lemonade with Himalayan pink salt' },
      { name: 'Blue Lagoon',        price: 220, isPopular: false, description: 'Blue curacao, lemon, soda and fresh mint' },
      { name: 'Iced Americano',     price: 220, isPopular: false, description: 'Double espresso over ice with chilled water' },
      { name: 'Oreo Shake',         price: 280, isPopular: true,  description: 'Creamy Oreo blended with vanilla ice cream and milk' },
      { name: 'Cold Coffee',        price: 240, isPopular: true,  description: 'Chilled brewed coffee with whipped cream' },
    ],
  },
  {
    name: 'Fresh Juices & Mocktails', color: '#F97316', icon: '🍹', preparationStation: 'Juice Bar',
    items: [
      { name: 'Orange Juice',       price: 160, isPopular: true,  description: 'Freshly squeezed Valencia oranges, served chilled' },
      { name: 'Green Detox',        price: 220, isPopular: false, description: 'Spinach, cucumber, apple, ginger and lemon blend' },
      { name: 'Pineapple Cooler',   price: 180, isPopular: false, description: 'Fresh pineapple with mint and a dash of Tajin' },
      { name: 'Virgin Mojito',      price: 200, isPopular: true,  description: 'Muddled fresh mint, lime juice and soda water' },
      { name: 'Passion Fruit Punch', price: 240, isPopular: false, description: 'Passion fruit, mango nectar and sparkling water' },
      { name: 'Kiwi Cooler',        price: 200, isPopular: false, description: 'Fresh kiwi with lemon juice and honey' },
      { name: 'Berry Blast',        price: 240, isPopular: true,  description: 'Strawberry, blueberry and raspberry blended fresh' },
      { name: 'Watermelon Mint',    price: 180, isPopular: false, description: 'Watermelon juice muddled with fresh mint leaves' },
    ],
  },
  {
    name: 'All-Day Breakfast', color: '#F59E0B', icon: '🍳', preparationStation: 'Hot Kitchen',
    items: [
      { name: 'Avocado Toast',      price: 420, isPopular: true,  description: 'Sourdough toast, smashed avocado, chilli flakes and poached egg' },
      { name: 'Eggs Benedict',      price: 480, isPopular: true,  description: 'Poached eggs on English muffin with hollandaise sauce' },
      { name: 'Pancake Stack',      price: 360, isPopular: true,  description: 'Fluffy buttermilk pancakes with maple syrup and berries' },
      { name: 'Greek Omelette',     price: 380, isPopular: false, description: 'Three-egg omelette with feta, olives and sun-dried tomato' },
      { name: 'Granola Bowl',       price: 320, isPopular: false, description: 'House granola with Greek yogurt, honey and seasonal fruit' },
      { name: 'Full English',       price: 550, isPopular: false, description: 'Eggs, grilled bacon, sausage, beans, toast and grilled tomato' },
      { name: 'Veggie Scramble',    price: 340, isPopular: false, description: 'Scrambled eggs with bell peppers, mushrooms and herbs' },
      { name: 'Shakshuka',          price: 400, isPopular: true,  description: 'Eggs poached in spiced tomato and pepper sauce, served with pita' },
    ],
  },
  {
    name: 'Mains & Bites', color: '#8B5CF6', icon: '🍔', preparationStation: 'Hot Kitchen',
    items: [
      { name: 'Grilled Chicken Wrap',   price: 420, isPopular: true,  description: 'Marinated chicken, lettuce, pesto aioli in flour tortilla' },
      { name: 'Classic Burger',         price: 480, isPopular: true,  description: 'Beef patty, cheddar, caramelised onion and brioche bun' },
      { name: 'Margherita Pizza',       price: 520, isPopular: true,  description: 'San Marzano tomato, fresh mozzarella, basil on thin crust' },
      { name: 'Caesar Salad',           price: 360, isPopular: false, description: 'Romaine, parmesan, house croutons, Caesar dressing' },
      { name: 'Club Sandwich',          price: 400, isPopular: false, description: 'Triple-decker with chicken, bacon, egg and lettuce' },
      { name: 'Pasta Arrabbiata',       price: 440, isPopular: false, description: 'Penne in spicy tomato, garlic and fresh basil sauce' },
      { name: 'BBQ Pulled Pork Sliders',price: 460, isPopular: true,  description: 'Slow-cooked pulled pork in BBQ sauce with coleslaw on mini buns' },
      { name: 'Mushroom Risotto',       price: 480, isPopular: false, description: 'Creamy arborio rice with wild mushrooms and truffle oil' },
      { name: 'Grilled Paneer Wrap',    price: 380, isPopular: false, description: 'Tandoori paneer with green chutney and pickled onions in tortilla' },
      { name: 'Fish & Chips',           price: 520, isPopular: false, description: 'Beer-battered fish fillet with seasoned fries and tartar sauce' },
    ],
  },
  {
    name: 'Snacks & Starters', color: '#06B6D4', icon: '🍟', preparationStation: 'Hot Kitchen',
    items: [
      { name: 'Loaded Nachos',       price: 320, isPopular: true,  description: 'Crispy tortilla chips with cheese, jalapeños, salsa and sour cream' },
      { name: 'Chicken Wings',       price: 380, isPopular: true,  description: 'Crispy wings tossed in buffalo sauce with blue cheese dip' },
      { name: 'Garlic Bread',        price: 160, isPopular: true,  description: 'Toasted sourdough with garlic herb butter and parmesan' },
      { name: 'Bruschetta',          price: 240, isPopular: false, description: 'Grilled bread topped with fresh tomato, basil and balsamic glaze' },
      { name: 'Spring Rolls',        price: 260, isPopular: false, description: 'Crispy vegetable spring rolls with sweet chilli dipping sauce' },
      { name: 'Onion Rings',         price: 180, isPopular: false, description: 'Beer-battered golden onion rings with chipotle mayo' },
      { name: 'Cheese Quesadilla',   price: 300, isPopular: false, description: 'Flour tortilla filled with melted cheddar and fresh salsa' },
      { name: 'Peri Peri Fries',     price: 200, isPopular: true,  description: 'Golden fries tossed in peri peri seasoning with garlic aioli' },
    ],
  },
  {
    name: 'Desserts', color: '#EC4899', icon: '🍰', preparationStation: 'Bakery & Desserts',
    items: [
      { name: 'Chocolate Brownie',    price: 220, isPopular: true,  description: 'Warm fudge brownie served with vanilla gelato' },
      { name: 'New York Cheesecake',  price: 280, isPopular: true,  description: 'Classic baked cheesecake with blueberry compote' },
      { name: 'Tiramisu',             price: 300, isPopular: true,  description: 'Espresso-soaked ladyfingers, mascarpone, cocoa dust' },
      { name: 'Panna Cotta',          price: 260, isPopular: false, description: 'Vanilla bean panna cotta with raspberry coulis' },
      { name: 'Lemon Tart',           price: 240, isPopular: false, description: 'Crisp pastry shell filled with tangy lemon curd' },
      { name: 'Ice Cream Sundae',     price: 220, isPopular: false, description: 'Three scoops of artisan gelato with toppings of choice' },
      { name: 'Gulab Jamun',          price: 180, isPopular: true,  description: 'Warm milk-solid dumplings soaked in rose sugar syrup' },
      { name: 'Waffles & Nutella',    price: 320, isPopular: true,  description: 'Crispy Belgian waffles with Nutella, banana and whipped cream' },
    ],
  },
  {
    name: 'Bakery', color: '#10B981', icon: '🥐', preparationStation: 'Bakery & Desserts',
    items: [
      { name: 'Butter Croissant',    price: 160, isPopular: true,  description: 'Classic laminated butter croissant, baked fresh daily' },
      { name: 'Blueberry Muffin',    price: 140, isPopular: false, description: 'Soft muffin packed with fresh blueberries and lemon zest' },
      { name: 'Banana Bread',        price: 180, isPopular: true,  description: 'Moist banana bread with walnut and honey drizzle' },
      { name: 'Cinnamon Roll',       price: 200, isPopular: true,  description: 'Soft yeasted roll with cinnamon swirl and cream cheese glaze' },
      { name: 'Focaccia',            price: 180, isPopular: false, description: 'Rosemary and sea salt focaccia with olive oil dip' },
      { name: 'Almond Danish',       price: 200, isPopular: false, description: 'Flaky pastry with almond cream topped with flaked almonds' },
      { name: 'Chocolate Croissant', price: 180, isPopular: true,  description: 'Buttery croissant filled with dark chocolate chunks' },
      { name: 'Sourdough Loaf',      price: 280, isPopular: false, description: 'Artisan slow-fermented sourdough, sold by the slice or loaf' },
    ],
  },
  {
    name: 'Healthy & Vegan', color: '#22C55E', icon: '🥗', preparationStation: 'Cold Kitchen',
    items: [
      { name: 'Acai Bowl',           price: 380, isPopular: true,  description: 'Frozen acai blend topped with granola, banana, and chia seeds' },
      { name: 'Quinoa Power Bowl',   price: 420, isPopular: false, description: 'Roasted quinoa with chickpeas, avocado and tahini dressing' },
      { name: 'Mediterranean Wrap',  price: 360, isPopular: false, description: 'Hummus, falafel, roasted veggies and tzatziki in a whole wheat wrap' },
      { name: 'Buddha Bowl',         price: 400, isPopular: true,  description: 'Brown rice, edamame, carrot ribbons, cucumber and miso dressing' },
      { name: 'Green Goddess Salad', price: 340, isPopular: false, description: 'Kale, broccoli, avocado, toasted seeds with lemon tahini dressing' },
      { name: 'Chia Pudding',        price: 260, isPopular: false, description: 'Overnight oat milk chia with mixed berry compote' },
      { name: 'Avocado Smoothie',    price: 280, isPopular: false, description: 'Creamy avocado blended with banana, honey and oat milk' },
      { name: 'Protein Pancakes',    price: 360, isPopular: false, description: 'High-protein oat pancakes with almond butter and fresh berries' },
    ],
  },
  {
    name: 'Combos & Deals', color: '#EAB308', icon: '🎁', preparationStation: 'General Kitchen',
    items: [
      { name: 'Morning Combo',        price: 380, isPopular: true,  description: 'Any hot beverage + Butter Croissant or Blueberry Muffin' },
      { name: 'Brunch Special',       price: 680, isPopular: true,  description: 'Avocado Toast + any cold beverage + Chocolate Brownie' },
      { name: 'Burger & Brew',        price: 720, isPopular: true,  description: 'Classic Burger + any fries + Cold Brew or Iced Latte' },
      { name: 'Cafe Delight Box',     price: 580, isPopular: false, description: 'Club Sandwich + Peri Peri Fries + any house lemonade' },
      { name: 'Sweet Treat Combo',    price: 480, isPopular: false, description: 'Any dessert + any hot beverage at a special price' },
      { name: 'Office Pack (4 Pax)', price: 1280, isPopular: true,  description: '4x any hot beverage + 4x any bakery item' },
    ],
  },
];

// ── Floors ────────────────────────────────────────────────────────────────────
const FLOORS = [
  {
    name: 'Ground Floor', position: 1,
    tables: [
      { number: 'T-101', seats: 2,  shape: 'ROUND'     as const, posX: 80,  posY: 80,  width: 90,  height: 90  },
      { number: 'T-102', seats: 4,  shape: 'SQUARE'    as const, posX: 220, posY: 80,  width: 110, height: 110 },
      { number: 'T-103', seats: 4,  shape: 'SQUARE'    as const, posX: 380, posY: 80,  width: 110, height: 110 },
      { number: 'T-104', seats: 6,  shape: 'RECTANGLE' as const, posX: 80,  posY: 240, width: 160, height: 110 },
      { number: 'T-105', seats: 2,  shape: 'ROUND'     as const, posX: 310, posY: 240, width: 90,  height: 90  },
      { number: 'T-106', seats: 8,  shape: 'RECTANGLE' as const, posX: 80,  posY: 400, width: 200, height: 110 },
    ],
  },
  {
    name: 'Rooftop Lounge', position: 2,
    tables: [
      { number: 'RT-201', seats: 2, shape: 'ROUND'     as const, posX: 80,  posY: 80,  width: 90,  height: 90  },
      { number: 'RT-202', seats: 4, shape: 'SQUARE'    as const, posX: 220, posY: 80,  width: 110, height: 110 },
      { number: 'RT-203', seats: 4, shape: 'SQUARE'    as const, posX: 380, posY: 80,  width: 110, height: 110 },
      { number: 'RT-204', seats: 6, shape: 'RECTANGLE' as const, posX: 80,  posY: 240, width: 160, height: 110 },
    ],
  },
  {
    name: 'Private Dining', position: 3,
    tables: [
      { number: 'PD-301', seats: 10, shape: 'RECTANGLE' as const, posX: 80, posY: 80,  width: 280, height: 120 },
      { number: 'PD-302', seats: 6,  shape: 'ROUND'     as const, posX: 80, posY: 260, width: 160, height: 160 },
    ],
  },
];

// ── 40 Customers ──────────────────────────────────────────────────────────────
const CUSTOMERS = [
  { name: 'Aarav Mehta',       email: 'aarav.mehta@email.com',     phone: '+91 98765 43210' },
  { name: 'Priya Nair',        email: 'priya.nair@email.com',      phone: '+91 87654 32109' },
  { name: 'Rohan Desai',       email: 'rohan.desai@email.com',     phone: '+91 76543 21098' },
  { name: 'Sneha Patel',       email: 'sneha.patel@email.com',     phone: '+91 65432 10987' },
  { name: 'Vikram Joshi',      email: 'vikram.joshi@email.com',    phone: '+91 54321 09876' },
  { name: 'Anjali Sharma',     email: 'anjali.sharma@email.com',   phone: '+91 43210 98765' },
  { name: 'Karan Kapoor',      email: 'karan.kapoor@email.com',    phone: '+91 32109 87654' },
  { name: 'Meera Reddy',       email: 'meera.reddy@email.com',     phone: '+91 21098 76543' },
  { name: 'Arjun Singh',       email: 'arjun.singh@email.com',     phone: '+91 10987 65432' },
  { name: 'Pooja Gupta',       email: 'pooja.gupta@email.com',     phone: '+91 98761 23450' },
  { name: 'Siddharth Rao',     email: 'sid.rao@email.com',         phone: '+91 87652 34501' },
  { name: 'Kavya Krishnan',    email: 'kavya.k@email.com',         phone: '+91 76543 45612' },
  { name: 'Aditya Bose',       email: 'aditya.bose@email.com',     phone: '+91 65434 56723' },
  { name: 'Riya Malhotra',     email: 'riya.m@email.com',          phone: '+91 54325 67834' },
  { name: 'Nikhil Tandon',     email: 'nikhil.t@email.com',        phone: '+91 43216 78945' },
  { name: 'Divya Menon',       email: 'divya.menon@email.com',     phone: '+91 98762 11223' },
  { name: 'Sahil Chaudhary',   email: 'sahil.c@email.com',         phone: '+91 87653 22334' },
  { name: 'Nisha Iyer',        email: 'nisha.iyer@email.com',      phone: '+91 76544 33445' },
  { name: 'Tarun Bajaj',       email: 'tarun.bajaj@email.com',     phone: '+91 65435 44556' },
  { name: 'Ananya Pillai',     email: 'ananya.p@email.com',        phone: '+91 54326 55667' },
  { name: 'Rahul Khanna',      email: 'rahul.khanna@email.com',    phone: '+91 43217 66778' },
  { name: 'Simran Sethi',      email: 'simran.sethi@email.com',    phone: '+91 32108 77889' },
  { name: 'Kunal Shah',        email: 'kunal.shah@email.com',      phone: '+91 21099 88990' },
  { name: 'Ishita Roy',        email: 'ishita.roy@email.com',      phone: '+91 10988 99001' },
  { name: 'Manav Luthra',      email: 'manav.l@email.com',         phone: '+91 98763 00112' },
  { name: 'Tanvi Mishra',      email: 'tanvi.m@email.com',         phone: '+91 87654 11223' },
  { name: 'Dhruv Aggarwal',    email: 'dhruv.a@email.com',         phone: '+91 76545 22334' },
  { name: 'Neha Choudhury',    email: 'neha.c@email.com',          phone: '+91 65436 33445' },
  { name: 'Varun Tiwari',      email: 'varun.t@email.com',         phone: '+91 54327 44556' },
  { name: 'Kritika Sen',       email: 'kritika.s@email.com',       phone: '+91 43218 55667' },
  { name: 'Ayaan Khan',        email: 'ayaan.k@email.com',         phone: '+91 32101 66778' },
  { name: 'Shriya Nambiar',    email: 'shriya.n@email.com',        phone: '+91 21092 77889' },
  { name: 'Parth Trivedi',     email: 'parth.tri@email.com',       phone: '+91 10983 88990' },
  { name: 'Aditi Ghosh',       email: 'aditi.g@email.com',         phone: '+91 98764 99001' },
  { name: 'Samarth Verma',     email: 'samarth.v@email.com',       phone: '+91 87655 00112' },
  { name: 'Pallavi Deshpande', email: 'pallavi.d@email.com',       phone: '+91 76546 11223' },
  { name: 'Arnav Saxena',      email: 'arnav.s@email.com',         phone: '+91 65437 22334' },
  { name: 'Gauri Kulkarni',    email: 'gauri.k@email.com',         phone: '+91 54328 33445' },
  { name: 'Rishabh Singhania', email: 'rishabh.s@email.com',       phone: '+91 43219 44556' },
  { name: 'Tara Nayak',        email: 'tara.nayak@email.com',      phone: '+91 32110 55667' },
];

// ── Ingredients ───────────────────────────────────────────────────────────────
const INGREDIENTS = [
  { name: 'Espresso Beans',    quantity: 5000, unit: 'g',   minThreshold: 500  },
  { name: 'Decaf Beans',       quantity: 1000, unit: 'g',   minThreshold: 200  },
  { name: 'Whole Milk',        quantity: 8000, unit: 'ml',  minThreshold: 1500 },
  { name: 'Oat Milk',          quantity: 4000, unit: 'ml',  minThreshold: 600  },
  { name: 'Heavy Cream',       quantity: 2000, unit: 'ml',  minThreshold: 300  },
  { name: 'Butter',            quantity: 1500, unit: 'g',   minThreshold: 200  },
  { name: 'Cheddar Cheese',    quantity: 1000, unit: 'g',   minThreshold: 150  },
  { name: 'Feta Cheese',       quantity: 600,  unit: 'g',   minThreshold: 100  },
  { name: 'Mascarpone',        quantity: 800,  unit: 'g',   minThreshold: 150  },
  { name: 'Greek Yogurt',      quantity: 3000, unit: 'g',   minThreshold: 500  },
  { name: 'Chicken Breasts',   quantity: 50,   unit: 'pcs', minThreshold: 10   },
  { name: 'Beef Patties',      quantity: 40,   unit: 'pcs', minThreshold: 8    },
  { name: 'Eggs',              quantity: 120,  unit: 'pcs', minThreshold: 24   },
  { name: 'Smoked Bacon',      quantity: 1500, unit: 'g',   minThreshold: 250  },
  { name: 'Avocados',          quantity: 40,   unit: 'pcs', minThreshold: 8    },
  { name: 'Sourdough Slices',  quantity: 60,   unit: 'pcs', minThreshold: 12   },
  { name: 'Mango',             quantity: 30,   unit: 'pcs', minThreshold: 6    },
  { name: 'Strawberries',      quantity: 2000, unit: 'g',   minThreshold: 400  },
  { name: 'Blueberries',       quantity: 1200, unit: 'g',   minThreshold: 200  },
  { name: 'Lemon',             quantity: 40,   unit: 'pcs', minThreshold: 8    },
  { name: 'Fresh Basil',       quantity: 400,  unit: 'g',   minThreshold: 60   },
  { name: 'Romaine Lettuce',   quantity: 20,   unit: 'pcs', minThreshold: 4    },
  { name: 'All-Purpose Flour', quantity: 8000, unit: 'g',   minThreshold: 1200 },
  { name: 'Chocolate Fudge',   quantity: 2000, unit: 'g',   minThreshold: 400  },
  { name: 'Cocoa Powder',      quantity: 1000, unit: 'g',   minThreshold: 150  },
  { name: 'Sugar',             quantity: 5000, unit: 'g',   minThreshold: 800  },
  { name: 'Vanilla Extract',   quantity: 400,  unit: 'ml',  minThreshold: 60   },
  { name: 'Ladyfingers',       quantity: 300,  unit: 'pcs', minThreshold: 50   },
  { name: 'Almond Flour',      quantity: 1200, unit: 'g',   minThreshold: 200  },
  { name: 'Hollandaise Sauce', quantity: 800,  unit: 'ml',  minThreshold: 120  },
  { name: 'Caramel Sauce',     quantity: 800,  unit: 'ml',  minThreshold: 120  },
  { name: 'Tomato Sauce',      quantity: 4000, unit: 'ml',  minThreshold: 600  },
  { name: 'Maple Syrup',       quantity: 2000, unit: 'ml',  minThreshold: 300  },
  { name: 'Pesto',             quantity: 800,  unit: 'g',   minThreshold: 120  },
  { name: 'Hummus',            quantity: 1000, unit: 'g',   minThreshold: 150  },
  { name: 'Quinoa',            quantity: 2000, unit: 'g',   minThreshold: 300  },
  { name: 'Chia Seeds',        quantity: 500,  unit: 'g',   minThreshold: 80   },
  { name: 'Paneer',            quantity: 1500, unit: 'g',   minThreshold: 250  },
  { name: 'Tortilla Chips',    quantity: 2000, unit: 'g',   minThreshold: 300  },
  { name: 'Chicken Wings',     quantity: 5000, unit: 'g',   minThreshold: 800  },
  { name: 'Orange Juice',      quantity: 5000, unit: 'ml',  minThreshold: 800  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error('DATABASE_URL not defined'); process.exit(1); }

  const pool    = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma  = new PrismaClient({ adapter });

  try {
    log.section('Connecting to database...');
    await prisma.$connect();
    log.success('Connected!');

    // ── Wipe (cascade-safe) ───────────────────────────────────────────────────
    log.section('Clearing existing records...');
    await prisma.refundItem.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.recipeIngredient.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.posSession.deleteMany();
    await prisma.table.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.modifierOption.deleteMany();
    await prisma.modifierGroup.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.promotion.deleteMany();
    log.success('Cleared all existing records');

    // ── Users ─────────────────────────────────────────────────────────────────
    log.section(`Seeding ${USERS.length} users...`);
    const userMap: Record<string, string> = {};
    for (const u of USERS) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        const hash = await bcrypt.hash(u.password, 12);
        const created = await prisma.user.create({
          data: {
            name: u.name, email: u.email, role: u.role,
            accounts: { create: { accountId: u.email, providerId: 'credential', password: hash } },
          },
        });
        userMap[u.email] = created.id;
        log.success(`User: ${u.name} (${u.role})`);
      } else {
        userMap[u.email] = existing.id;
        log.info(`Exists: ${u.email}`);
      }
    }

    // ── Categories + Menu Items ───────────────────────────────────────────────
    log.section(`Seeding ${CATEGORIES.length} categories & menu items...`);
    const menuItemMap: Record<string, { id: string; price: number }> = {};

    for (const [catIdx, catData] of CATEGORIES.entries()) {
      const cat = await prisma.category.create({
        data: {
          name: catData.name, color: catData.color, icon: catData.icon,
          preparationStation: catData.preparationStation,
          isActive: true, position: catIdx,
        },
      });
      for (const [itemIdx, itemData] of catData.items.entries()) {
        const item = await prisma.menuItem.create({
          data: {
            categoryId: cat.id, name: itemData.name, price: itemData.price,
            description: itemData.description, isAvailable: true,
            isPopular: itemData.isPopular, position: itemIdx,
          },
        });
        menuItemMap[item.name] = { id: item.id, price: item.price };
      }
      log.success(`${cat.name}: ${catData.items.length} items`);
    }
    const totalItems = Object.keys(menuItemMap).length;
    log.success(`Total: ${totalItems} menu items across ${CATEGORIES.length} categories`);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    log.section('Seeding modifiers...');
    const mods: { itemName: string; groups: { name: string; min: number; max: number; opts: { name: string; adj: number }[] }[] }[] = [
      {
        itemName: 'Cappuccino',
        groups: [
          { name: 'Milk Choice', min: 1, max: 1, opts: [{ name: 'Whole Milk', adj: 0 }, { name: 'Oat Milk', adj: 40 }, { name: 'Almond Milk', adj: 50 }, { name: 'Soy Milk', adj: 30 }] },
          { name: 'Extras',      min: 0, max: 3, opts: [{ name: 'Extra Shot', adj: 40 }, { name: 'Caramel Drizzle', adj: 20 }, { name: 'Vanilla Syrup', adj: 20 }] },
        ],
      },
      {
        itemName: 'Classic Burger',
        groups: [
          { name: 'Patty Size', min: 1, max: 1, opts: [{ name: 'Single', adj: 0 }, { name: 'Double', adj: 120 }, { name: 'Triple', adj: 220 }] },
          { name: 'Add-ons',    min: 0, max: 4, opts: [{ name: 'Extra Cheddar', adj: 30 }, { name: 'Crispy Bacon', adj: 60 }, { name: 'Fried Egg', adj: 40 }, { name: 'Jalapeños', adj: 20 }] },
        ],
      },
      {
        itemName: 'Caramel Latte',
        groups: [
          { name: 'Size',       min: 1, max: 1, opts: [{ name: 'Regular', adj: 0 }, { name: 'Large', adj: 60 }] },
          { name: 'Milk',       min: 1, max: 1, opts: [{ name: 'Whole Milk', adj: 0 }, { name: 'Oat Milk', adj: 40 }, { name: 'Skimmed', adj: 0 }] },
        ],
      },
      {
        itemName: 'Margherita Pizza',
        groups: [
          { name: 'Crust',      min: 1, max: 1, opts: [{ name: 'Thin Crust', adj: 0 }, { name: 'Thick Crust', adj: 40 }, { name: 'Stuffed Crust', adj: 80 }] },
          { name: 'Extra Toppings', min: 0, max: 3, opts: [{ name: 'Extra Cheese', adj: 60 }, { name: 'Olives', adj: 30 }, { name: 'Jalapeños', adj: 20 }, { name: 'Mushrooms', adj: 40 }] },
        ],
      },
      {
        itemName: 'Ice Cream Sundae',
        groups: [
          { name: 'Flavour',    min: 1, max: 2, opts: [{ name: 'Vanilla', adj: 0 }, { name: 'Chocolate', adj: 0 }, { name: 'Strawberry', adj: 0 }, { name: 'Butter Pecan', adj: 30 }] },
          { name: 'Toppings',   min: 0, max: 3, opts: [{ name: 'Hot Fudge', adj: 30 }, { name: 'Caramel', adj: 30 }, { name: 'Sprinkles', adj: 0 }, { name: 'Whipped Cream', adj: 20 }] },
        ],
      },
    ];
    for (const modDef of mods) {
      const item = menuItemMap[modDef.itemName];
      if (!item) { log.warn(`No item for modifier: ${modDef.itemName}`); continue; }
      for (const g of modDef.groups) {
        await prisma.modifierGroup.create({
          data: {
            menuItemId: item.id, name: g.name, minSelection: g.min, maxSelection: g.max,
            options: { create: g.opts.map(o => ({ name: o.name, priceAdjustment: o.adj })) },
          },
        });
      }
      log.success(`Modifiers → ${modDef.itemName}`);
    }

    // ── Floors + Tables ───────────────────────────────────────────────────────
    log.section(`Seeding ${FLOORS.length} floors...`);
    const tableMap: Record<string, string> = {};
    for (const floorData of FLOORS) {
      const floor = await prisma.floor.create({ data: { name: floorData.name, position: floorData.position } });
      for (const t of floorData.tables) {
        const table = await prisma.table.create({
          data: { floorId: floor.id, number: t.number, seats: t.seats, shape: t.shape, posX: t.posX, posY: t.posY, width: t.width, height: t.height, status: 'AVAILABLE' },
        });
        tableMap[table.number] = table.id;
      }
      log.success(`Floor: ${floor.name} (${floorData.tables.length} tables)`);
    }

    // ── Customers ─────────────────────────────────────────────────────────────
    log.section(`Seeding ${CUSTOMERS.length} customers...`);
    const customerMap: Record<string, string> = {};
    for (const c of CUSTOMERS) {
      const cust = await prisma.customer.create({ data: c });
      customerMap[cust.email] = cust.id;
    }
    log.success(`Seeded ${CUSTOMERS.length} customers`);

    // ── Bookings ──────────────────────────────────────────────────────────────
    log.section('Seeding 30 bookings...');
    const now = Date.now();
    const bookingsData = [
      { custEmail: 'aarav.mehta@email.com',    tableNum: 'T-101',  minsFromNow: 30,    guests: 2, status: 'confirmed', notes: 'Anniversary dinner — quiet corner preferred' },
      { custEmail: 'priya.nair@email.com',     tableNum: 'T-102',  minsFromNow: 90,    guests: 4, status: 'confirmed', notes: 'Vegetarian menu please' },
      { custEmail: 'anjali.sharma@email.com',  tableNum: 'T-103',  minsFromNow: 60,    guests: 2, status: 'confirmed', notes: 'Window seat preferred' },
      { custEmail: 'meera.reddy@email.com',    tableNum: 'T-105',  minsFromNow: 20,    guests: 2, status: 'confirmed', notes: 'High chair needed for toddler' },
      { custEmail: 'divya.menon@email.com',    tableNum: 'RT-201', minsFromNow: 120,   guests: 2, status: 'confirmed', notes: 'Sunset seating requested' },
      { custEmail: 'sahil.c@email.com',        tableNum: 'RT-202', minsFromNow: 180,   guests: 3, status: 'confirmed', notes: 'Birthday surprise' },
      { custEmail: 'nisha.iyer@email.com',     tableNum: 'T-104',  minsFromNow: 240,   guests: 5, status: 'confirmed', notes: 'Gluten-free options needed' },
      { custEmail: 'rahul.khanna@email.com',   tableNum: 'PD-301', minsFromNow: 300,   guests: 9, status: 'confirmed', notes: 'Corporate lunch — need AV setup' },
      { custEmail: 'rohan.desai@email.com',    tableNum: 'RT-202', minsFromNow: 150,   guests: 3, status: 'pending',   notes: 'Allergic to nuts' },
      { custEmail: 'vikram.joshi@email.com',   tableNum: 'PD-301', minsFromNow: 450,   guests: 8, status: 'pending',   notes: 'Separate billing required' },
      { custEmail: 'karan.kapoor@email.com',   tableNum: 'RT-201', minsFromNow: 360,   guests: 2, status: 'pending',   notes: 'Prefer non-smoking area' },
      { custEmail: 'tarun.bajaj@email.com',    tableNum: 'T-106',  minsFromNow: 500,   guests: 7, status: 'pending',   notes: 'Vegan options for 2 guests' },
      { custEmail: 'ananya.p@email.com',       tableNum: 'RT-203', minsFromNow: 600,   guests: 4, status: 'pending',   notes: 'First time visitors' },
      { custEmail: 'simran.sethi@email.com',   tableNum: 'T-102',  minsFromNow: 720,   guests: 4, status: 'pending',   notes: 'Will call to reconfirm' },
      { custEmail: 'kunal.shah@email.com',     tableNum: 'PD-302', minsFromNow: 840,   guests: 6, status: 'pending',   notes: 'Engagement dinner — needs decoration' },
      { custEmail: 'sneha.patel@email.com',    tableNum: 'T-104',  minsFromNow: -30,   guests: 6, status: 'confirmed', notes: 'Birthday celebration' },
      { custEmail: 'arjun.singh@email.com',    tableNum: 'T-103',  minsFromNow: -120,  guests: 3, status: 'confirmed', notes: 'Regular weekly visit' },
      { custEmail: 'pooja.gupta@email.com',    tableNum: 'T-101',  minsFromNow: -200,  guests: 2, status: 'confirmed', notes: 'Ordered the tasting menu' },
      { custEmail: 'sid.rao@email.com',        tableNum: 'RT-204', minsFromNow: -350,  guests: 6, status: 'confirmed', notes: 'Team outing' },
      { custEmail: 'kavya.k@email.com',        tableNum: 'T-102',  minsFromNow: -500,  guests: 4, status: 'confirmed', notes: 'Preferred table by window' },
      { custEmail: 'riya.m@email.com',         tableNum: 'RT-201', minsFromNow: -400,  guests: 2, status: 'cancelled', notes: 'No-show' },
      { custEmail: 'nikhil.t@email.com',       tableNum: 'T-103',  minsFromNow: -700,  guests: 4, status: 'cancelled', notes: 'Cancelled due to emergency' },
      { custEmail: 'manav.l@email.com',        tableNum: 'RT-202', minsFromNow: -800,  guests: 3, status: 'cancelled', notes: 'Rescheduling requested' },
      { custEmail: 'dhruv.a@email.com',        tableNum: 'PD-301', minsFromNow: 1440,  guests:10, status: 'confirmed', notes: 'Family reunion — need 2 joining tables' },
      { custEmail: 'neha.c@email.com',         tableNum: 'T-106',  minsFromNow: 1800,  guests: 8, status: 'pending',   notes: 'Pre-wedding lunch' },
      { custEmail: 'varun.t@email.com',        tableNum: 'RT-204', minsFromNow: 2160,  guests: 6, status: 'pending',   notes: 'Client entertainment' },
      { custEmail: 'kritika.s@email.com',      tableNum: 'PD-302', minsFromNow: 2880,  guests: 6, status: 'pending',   notes: 'Office farewell party' },
      { custEmail: 'ayaan.k@email.com',        tableNum: 'T-102',  minsFromNow: 4320,  guests: 4, status: 'pending',   notes: 'Blogger meetup' },
      { custEmail: 'aditi.g@email.com',        tableNum: 'RT-203', minsFromNow: 5760,  guests: 3, status: 'pending',   notes: 'Friends reunion' },
      { custEmail: 'tara.nayak@email.com',     tableNum: 'T-104',  minsFromNow: 7200,  guests: 5, status: 'pending',   notes: 'Corporate team lunch' },
    ];
    for (const b of bookingsData) {
      const custId  = customerMap[b.custEmail];
      const tableId = tableMap[b.tableNum];
      if (!custId || !tableId) { log.warn(`Skipping: ${b.custEmail}/${b.tableNum}`); continue; }
      await prisma.booking.create({
        data: { customerId: custId, tableId, bookingTime: new Date(now + b.minsFromNow * 60_000), guestsCount: b.guests, status: b.status, notes: b.notes },
      });
    }
    log.success(`Seeded ${bookingsData.length} bookings`);

    // ── Coupons ───────────────────────────────────────────────────────────────
    log.section('Seeding coupons...');
    const couponsData = [
      { code: 'WELCOME10',  discountType: 'percentage', discountValue: 10, isActive: true  },
      { code: 'FLAT50',     discountType: 'fixed',      discountValue: 50, isActive: true  },
      { code: 'MONSOON20',  discountType: 'percentage', discountValue: 20, isActive: true  },
      { code: 'FIRSTORDER', discountType: 'fixed',      discountValue: 30, isActive: true  },
      { code: 'HAPPY15',    discountType: 'percentage', discountValue: 15, isActive: false },
      { code: 'LOYALTY25',  discountType: 'percentage', discountValue: 25, isActive: false },
      { code: 'SUMMER30',   discountType: 'percentage', discountValue: 30, isActive: true  },
      { code: 'BDAY100',    discountType: 'fixed',      discountValue: 100, isActive: true },
    ];
    for (const c of couponsData) { await prisma.coupon.create({ data: c }); }
    log.success(`Seeded ${couponsData.length} coupons`);

    // ── Promotions ────────────────────────────────────────────────────────────
    log.section('Seeding promotions...');
    const espressoId = menuItemMap['Espresso']?.id;
    const burgerPromoId = menuItemMap['Classic Burger']?.id;
    const promos = [
      { name: 'Espresso Lovers — 3+ shots 15% off',    promoType: 'product', targetProductId: espressoId ?? null,  minQuantity: 3,    minOrderAmount: null, discountType: 'percentage', discountValue: 15, isActive: true  },
      { name: 'Big Order — ₹800+ get ₹80 off',         promoType: 'order',   targetProductId: null,                 minQuantity: null, minOrderAmount: 800,  discountType: 'fixed',      discountValue: 80, isActive: true  },
      { name: 'Happy Hours — 10% off all 3–5pm',       promoType: 'order',   targetProductId: null,                 minQuantity: null, minOrderAmount: 200,  discountType: 'percentage', discountValue: 10, isActive: false },
      { name: 'Burger Bonanza — Buy 2 get 20% off',    promoType: 'product', targetProductId: burgerPromoId ?? null, minQuantity: 2,   minOrderAmount: null, discountType: 'percentage', discountValue: 20, isActive: true  },
      { name: 'Weekend Feast — Orders ₹1200+ get ₹150 off', promoType: 'order', targetProductId: null,            minQuantity: null, minOrderAmount: 1200, discountType: 'fixed',      discountValue: 150, isActive: true },
    ];
    for (const p of promos) { await prisma.promotion.create({ data: p }); }
    log.success(`Seeded ${promos.length} promotions`);

    // ── Ingredients ───────────────────────────────────────────────────────────
    log.section(`Seeding ${INGREDIENTS.length} ingredients...`);
    const ingMap: Record<string, string> = {};
    for (const ingData of INGREDIENTS) {
      const ing = await prisma.ingredient.create({ data: ingData });
      ingMap[ing.name] = ing.id;
      log.info(`  ${ing.name} — ${ing.quantity}${ing.unit}`);
    }
    log.success(`Seeded ${INGREDIENTS.length} ingredients`);

    // ── Recipes ───────────────────────────────────────────────────────────────
    log.section('Seeding recipe links...');
    const recipes = [
      { itemName: 'Espresso',             ings: [['Espresso Beans', 18]] },
      { itemName: 'Cappuccino',           ings: [['Espresso Beans', 18], ['Whole Milk', 150]] },
      { itemName: 'Flat White',           ings: [['Espresso Beans', 18], ['Whole Milk', 130]] },
      { itemName: 'Caramel Latte',        ings: [['Espresso Beans', 18], ['Whole Milk', 200], ['Caramel Sauce', 20]] },
      { itemName: 'Americano',            ings: [['Espresso Beans', 18]] },
      { itemName: 'Mocha',                ings: [['Espresso Beans', 18], ['Whole Milk', 150], ['Cocoa Powder', 15]] },
      { itemName: 'Hot Chocolate',        ings: [['Whole Milk', 250], ['Cocoa Powder', 20]] },
      { itemName: 'Iced Latte',           ings: [['Espresso Beans', 18], ['Whole Milk', 200]] },
      { itemName: 'Iced Americano',       ings: [['Espresso Beans', 18]] },
      { itemName: 'Cold Brew',            ings: [['Espresso Beans', 30]] },
      { itemName: 'Cold Coffee',          ings: [['Espresso Beans', 20], ['Whole Milk', 150]] },
      { itemName: 'Mango Smoothie',       ings: [['Mango', 1], ['Greek Yogurt', 80], ['Sugar', 15]] },
      { itemName: 'Strawberry Shake',     ings: [['Strawberries', 120], ['Whole Milk', 200], ['Sugar', 20]] },
      { itemName: 'Lemonade',             ings: [['Lemon', 2], ['Sugar', 30]] },
      { itemName: 'Avocado Toast',        ings: [['Sourdough Slices', 2], ['Avocados', 1], ['Eggs', 1], ['Lemon', 1]] },
      { itemName: 'Eggs Benedict',        ings: [['Eggs', 2], ['Smoked Bacon', 60], ['Hollandaise Sauce', 50], ['Butter', 15]] },
      { itemName: 'Pancake Stack',        ings: [['All-Purpose Flour', 120], ['Eggs', 2], ['Whole Milk', 150], ['Maple Syrup', 40], ['Blueberries', 50]] },
      { itemName: 'Greek Omelette',       ings: [['Eggs', 3], ['Feta Cheese', 40], ['Butter', 10]] },
      { itemName: 'Granola Bowl',         ings: [['Greek Yogurt', 150], ['Blueberries', 30], ['Strawberries', 40]] },
      { itemName: 'Full English',         ings: [['Eggs', 2], ['Smoked Bacon', 80], ['Butter', 15], ['Tomato Sauce', 50]] },
      { itemName: 'Grilled Chicken Wrap', ings: [['Chicken Breasts', 1], ['Pesto', 20], ['Romaine Lettuce', 0.5]] },
      { itemName: 'Classic Burger',       ings: [['Beef Patties', 1], ['Cheddar Cheese', 30], ['Romaine Lettuce', 0.3]] },
      { itemName: 'Caesar Salad',         ings: [['Romaine Lettuce', 1], ['Cheddar Cheese', 20]] },
      { itemName: 'Club Sandwich',        ings: [['Chicken Breasts', 1], ['Smoked Bacon', 40], ['Eggs', 1], ['Romaine Lettuce', 0.3]] },
      { itemName: 'Pasta Arrabbiata',     ings: [['All-Purpose Flour', 100], ['Tomato Sauce', 120], ['Fresh Basil', 10]] },
      { itemName: 'Grilled Paneer Wrap',  ings: [['Paneer', 120], ['Hummus', 30]] },
      { itemName: 'Chocolate Brownie',    ings: [['Chocolate Fudge', 50], ['All-Purpose Flour', 60], ['Eggs', 2], ['Butter', 60], ['Sugar', 80]] },
      { itemName: 'New York Cheesecake',  ings: [['Mascarpone', 120], ['Sugar', 60], ['Eggs', 2], ['Blueberries', 30]] },
      { itemName: 'Tiramisu',             ings: [['Mascarpone', 100], ['Ladyfingers', 5], ['Espresso Beans', 15], ['Cocoa Powder', 10], ['Heavy Cream', 50]] },
      { itemName: 'Panna Cotta',          ings: [['Heavy Cream', 150], ['Sugar', 30], ['Vanilla Extract', 5]] },
      { itemName: 'Lemon Tart',           ings: [['All-Purpose Flour', 80], ['Butter', 40], ['Eggs', 3], ['Lemon', 2], ['Sugar', 60]] },
      { itemName: 'Butter Croissant',     ings: [['All-Purpose Flour', 80], ['Butter', 50]] },
      { itemName: 'Blueberry Muffin',     ings: [['All-Purpose Flour', 80], ['Blueberries', 40], ['Eggs', 1], ['Sugar', 40]] },
      { itemName: 'Banana Bread',         ings: [['All-Purpose Flour', 100], ['Eggs', 2], ['Sugar', 60]] },
      { itemName: 'Cinnamon Roll',        ings: [['All-Purpose Flour', 120], ['Butter', 30], ['Sugar', 40], ['Heavy Cream', 30]] },
      { itemName: 'Almond Danish',        ings: [['All-Purpose Flour', 100], ['Almond Flour', 40], ['Butter', 30], ['Eggs', 1]] },
      { itemName: 'Loaded Nachos',        ings: [['Tortilla Chips', 150], ['Cheddar Cheese', 60]] },
      { itemName: 'Chicken Wings',        ings: [['Chicken Wings', 300]] },
      { itemName: 'Garlic Bread',         ings: [['Sourdough Slices', 3], ['Butter', 40]] },
      { itemName: 'Quinoa Power Bowl',    ings: [['Quinoa', 120], ['Avocados', 0.5], ['Hummus', 40]] },
      { itemName: 'Acai Bowl',            ings: [['Greek Yogurt', 100], ['Blueberries', 40], ['Chia Seeds', 15]] },
      { itemName: 'Chia Pudding',         ings: [['Chia Seeds', 40], ['Oat Milk', 200], ['Sugar', 15]] },
      { itemName: 'Orange Juice',         ings: [['Orange Juice', 250]] },
    ];
    let recipeCount = 0;
    for (const recipe of recipes) {
      const item = menuItemMap[recipe.itemName];
      if (!item) continue;
      for (const [ingName, qty] of recipe.ings) {
        const ingredientId = ingMap[ingName as string];
        if (!ingredientId) continue;
        await prisma.recipeIngredient.create({ data: { menuItemId: item.id, ingredientId, quantityRequired: qty as number } });
        recipeCount++;
      }
      log.info(`  Recipe: ${recipe.itemName}`);
    }
    log.success(`Seeded ${recipeCount} recipe links`);

    // ── POS Sessions (6 sessions — 2 weeks history) ───────────────────────────
    log.section('Seeding 6 POS sessions...');
    const ownerId  = userMap['admin@cafepos.com'];
    const staffId  = userMap['john@cafepos.com'] ?? ownerId;
    const staff2Id = userMap['priya@cafepos.com'] ?? ownerId;
    const mgr      = userMap['maya@cafepos.com'] ?? ownerId;
    const allStaffIds = [ownerId, staffId, staff2Id, mgr].filter(Boolean);

    const sessions = await Promise.all([
      prisma.posSession.create({ data: { openedBy: ownerId,  openedAt: daysAgo(14, 480), closedAt: daysAgo(14, 0), openingBalance: 2000, closingFloat: 5200, countedCash: 5180, discrepancy: -20,  status: 'CLOSED' } }),
      prisma.posSession.create({ data: { openedBy: staffId,  openedAt: daysAgo(10, 480), closedAt: daysAgo(10, 0), openingBalance: 1500, closingFloat: 7800, countedCash: 7850, discrepancy: 50,   status: 'CLOSED' } }),
      prisma.posSession.create({ data: { openedBy: mgr,      openedAt: daysAgo(7,  480), closedAt: daysAgo(7,  0), openingBalance: 2000, closingFloat: 6500, countedCash: 6450, discrepancy: -50,  status: 'CLOSED' } }),
      prisma.posSession.create({ data: { openedBy: staff2Id, openedAt: daysAgo(4,  480), closedAt: daysAgo(4,  0), openingBalance: 1500, closingFloat: 9200, countedCash: 9280, discrepancy: 80,   status: 'CLOSED' } }),
      prisma.posSession.create({ data: { openedBy: staffId,  openedAt: daysAgo(1,  480), closedAt: daysAgo(1,  0), openingBalance: 2000, closingFloat: 8100, countedCash: 8050, discrepancy: -50,  status: 'CLOSED' } }),
      prisma.posSession.create({ data: { openedBy: ownerId,  openedAt: daysAgo(0,  480), openingBalance: 2000, status: 'OPEN' } }),
    ]);
    log.success('Seeded 6 POS sessions (5 closed, 1 open today)');

    // ── Orders (200+ realistic orders across 6 sessions) ─────────────────────
    log.section('Seeding 200+ historical orders...');

    const allItems  = Object.values(menuItemMap);
    const allTableIds = Object.values(tableMap);
    const allCustIds  = Object.values(customerMap);
    const payMethods: ('CASH' | 'CARD' | 'UPI')[] = ['CASH', 'CARD', 'UPI'];
    const orderTypes: ('DINE_IN' | 'TAKEAWAY')[]  = ['DINE_IN', 'DINE_IN', 'DINE_IN', 'TAKEAWAY'];

    // Rich order templates — realistic cafe combos
    const templates = [
      // ─ Quick beverages ─
      [{ n: 'Espresso', q: 1 }],
      [{ n: 'Espresso', q: 2 }],
      [{ n: 'Americano', q: 1 }],
      [{ n: 'Cappuccino', q: 1 }],
      [{ n: 'Cappuccino', q: 2 }],
      [{ n: 'Flat White', q: 1 }],
      [{ n: 'Caramel Latte', q: 1 }],
      [{ n: 'Masala Chai', q: 2 }],
      [{ n: 'Cold Brew', q: 1 }],
      [{ n: 'Iced Latte', q: 1 }],
      [{ n: 'Cold Coffee', q: 2 }],
      [{ n: 'Mocha', q: 1 }],
      [{ n: 'Turmeric Latte', q: 1 }],
      [{ n: 'Hazelnut Macchiato', q: 1 }],
      [{ n: 'Hot Chocolate', q: 1 }],
      // ─ Beverages + bakery ─
      [{ n: 'Cappuccino', q: 1 }, { n: 'Butter Croissant', q: 1 }],
      [{ n: 'Americano', q: 1 }, { n: 'Blueberry Muffin', q: 1 }],
      [{ n: 'Cold Brew', q: 1 }, { n: 'Banana Bread', q: 1 }],
      [{ n: 'Masala Chai', q: 2 }, { n: 'Butter Croissant', q: 2 }],
      [{ n: 'Espresso', q: 1 }, { n: 'Almond Danish', q: 1 }],
      [{ n: 'Caramel Latte', q: 1 }, { n: 'Cinnamon Roll', q: 1 }],
      [{ n: 'Flat White', q: 2 }, { n: 'Chocolate Croissant', q: 2 }],
      [{ n: 'Iced Latte', q: 1 }, { n: 'Banana Bread', q: 1 }],
      // ─ Breakfast tables ─
      [{ n: 'Avocado Toast', q: 1 }, { n: 'Cappuccino', q: 1 }],
      [{ n: 'Avocado Toast', q: 2 }, { n: 'Iced Latte', q: 2 }],
      [{ n: 'Eggs Benedict', q: 1 }, { n: 'Americano', q: 1 }],
      [{ n: 'Eggs Benedict', q: 2 }, { n: 'Iced Latte', q: 2 }],
      [{ n: 'Pancake Stack', q: 1 }, { n: 'Mango Smoothie', q: 1 }],
      [{ n: 'Pancake Stack', q: 2 }, { n: 'Cappuccino', q: 2 }],
      [{ n: 'Full English', q: 1 }, { n: 'Flat White', q: 1 }],
      [{ n: 'Full English', q: 2 }, { n: 'Orange Juice', q: 2 }],
      [{ n: 'Greek Omelette', q: 1 }, { n: 'Cappuccino', q: 1 }],
      [{ n: 'Granola Bowl', q: 2 }, { n: 'Strawberry Shake', q: 1 }],
      [{ n: 'Shakshuka', q: 1 }, { n: 'Flat White', q: 1 }],
      [{ n: 'Veggie Scramble', q: 1 }, { n: 'Masala Chai', q: 1 }],
      // ─ Lunch mains ─
      [{ n: 'Classic Burger', q: 1 }, { n: 'Lemonade', q: 1 }],
      [{ n: 'Classic Burger', q: 2 }, { n: 'Cold Brew', q: 2 }],
      [{ n: 'Grilled Chicken Wrap', q: 1 }, { n: 'Lemonade', q: 1 }],
      [{ n: 'Grilled Chicken Wrap', q: 2 }, { n: 'Cold Brew', q: 2 }],
      [{ n: 'Margherita Pizza', q: 1 }, { n: 'Iced Latte', q: 2 }],
      [{ n: 'Caesar Salad', q: 1 }, { n: 'Flat White', q: 1 }],
      [{ n: 'Club Sandwich', q: 2 }, { n: 'Cold Coffee', q: 2 }],
      [{ n: 'Pasta Arrabbiata', q: 1 }, { n: 'Cappuccino', q: 1 }],
      [{ n: 'BBQ Pulled Pork Sliders', q: 1 }, { n: 'Cold Brew', q: 1 }],
      [{ n: 'Mushroom Risotto', q: 1 }, { n: 'Caramel Latte', q: 1 }],
      [{ n: 'Fish & Chips', q: 1 }, { n: 'Lemonade', q: 2 }],
      [{ n: 'Grilled Paneer Wrap', q: 2 }, { n: 'Mango Smoothie', q: 1 }],
      // ─ Snacks ─
      [{ n: 'Loaded Nachos', q: 1 }, { n: 'Lemonade', q: 2 }],
      [{ n: 'Chicken Wings', q: 1 }, { n: 'Cold Brew', q: 1 }],
      [{ n: 'Garlic Bread', q: 2 }, { n: 'Cappuccino', q: 2 }],
      [{ n: 'Peri Peri Fries', q: 1 }, { n: 'Cold Coffee', q: 1 }],
      [{ n: 'Onion Rings', q: 1 }, { n: 'Strawberry Shake', q: 1 }],
      [{ n: 'Cheese Quesadilla', q: 1 }, { n: 'Blue Lagoon', q: 1 }],
      [{ n: 'Bruschetta', q: 1 }, { n: 'Espresso', q: 1 }],
      [{ n: 'Spring Rolls', q: 1 }, { n: 'Lemonade', q: 1 }],
      // ─ Desserts + coffee ─
      [{ n: 'Chocolate Brownie', q: 1 }, { n: 'Cappuccino', q: 1 }],
      [{ n: 'Chocolate Brownie', q: 2 }, { n: 'Espresso', q: 2 }],
      [{ n: 'Tiramisu', q: 2 }, { n: 'Flat White', q: 2 }],
      [{ n: 'New York Cheesecake', q: 1 }, { n: 'Cappuccino', q: 1 }],
      [{ n: 'Panna Cotta', q: 2 }, { n: 'Masala Chai', q: 2 }],
      [{ n: 'Lemon Tart', q: 1 }, { n: 'Hot Chocolate', q: 1 }],
      [{ n: 'Gulab Jamun', q: 2 }, { n: 'Masala Chai', q: 2 }],
      [{ n: 'Waffles & Nutella', q: 1 }, { n: 'Cold Coffee', q: 1 }],
      [{ n: 'Ice Cream Sundae', q: 2 }, { n: 'Cold Brew', q: 1 }],
      // ─ Healthy / vegan ─
      [{ n: 'Acai Bowl', q: 1 }, { n: 'Avocado Smoothie', q: 1 }],
      [{ n: 'Quinoa Power Bowl', q: 1 }, { n: 'Green Detox', q: 1 }],
      [{ n: 'Buddha Bowl', q: 2 }, { n: 'Lemonade', q: 2 }],
      [{ n: 'Green Goddess Salad', q: 1 }, { n: 'Pineapple Cooler', q: 1 }],
      [{ n: 'Mediterranean Wrap', q: 1 }, { n: 'Virgin Mojito', q: 1 }],
      [{ n: 'Chia Pudding', q: 2 }, { n: 'Kiwi Cooler', q: 2 }],
      [{ n: 'Protein Pancakes', q: 1 }, { n: 'Berry Blast', q: 1 }],
      // ─ Juices & mocktails ─
      [{ n: 'Orange Juice', q: 2 }, { n: 'Butter Croissant', q: 2 }],
      [{ n: 'Virgin Mojito', q: 2 }],
      [{ n: 'Berry Blast', q: 2 }, { n: 'Butter Croissant', q: 1 }],
      [{ n: 'Passion Fruit Punch', q: 2 }],
      [{ n: 'Watermelon Mint', q: 2 }],
      [{ n: 'Blue Lagoon', q: 2 }],
      // ─ Combos ─
      [{ n: 'Morning Combo', q: 2 }],
      [{ n: 'Brunch Special', q: 1 }],
      [{ n: 'Burger & Brew', q: 2 }],
      [{ n: 'Sweet Treat Combo', q: 2 }],
      [{ n: 'Office Pack (4 Pax)', q: 1 }],
      // ─ Large group orders ─
      [{ n: 'Cappuccino', q: 4 }, { n: 'Iced Latte', q: 2 }, { n: 'Avocado Toast', q: 3 }, { n: 'Chocolate Brownie', q: 2 }],
      [{ n: 'Classic Burger', q: 4 }, { n: 'Caesar Salad', q: 2 }, { n: 'Lemonade', q: 4 }, { n: 'Ice Cream Sundae', q: 2 }],
      [{ n: 'Eggs Benedict', q: 3 }, { n: 'Full English', q: 2 }, { n: 'Americano', q: 3 }, { n: 'Mango Smoothie', q: 2 }],
      [{ n: 'Margherita Pizza', q: 2 }, { n: 'Loaded Nachos', q: 1 }, { n: 'Tiramisu', q: 2 }, { n: 'Iced Latte', q: 3 }],
      [{ n: 'BBQ Pulled Pork Sliders', q: 2 }, { n: 'Fish & Chips', q: 2 }, { n: 'Peri Peri Fries', q: 2 }, { n: 'Cold Brew', q: 4 }],
    ];

    // Sessions and their order counts: [14 days ago=25, 10 days ago=35, 7 days ago=30, 4 days ago=40, 1 day ago=35, today=20]
    const sessionConfig = [
      { session: sessions[0], count: 25, daysBack: 14 },
      { session: sessions[1], count: 35, daysBack: 10 },
      { session: sessions[2], count: 30, daysBack: 7  },
      { session: sessions[3], count: 40, daysBack: 4  },
      { session: sessions[4], count: 35, daysBack: 1  },
      { session: sessions[5], count: 20, daysBack: 0  }, // today — mix of statuses
    ];

    let ordersSeeded = 0;
    let itemsSeeded  = 0;
    let paymentsSeeded = 0;

    for (const { session, count, daysBack } of sessionConfig) {
      const isToday = daysBack === 0;
      const todayStatuses: ('PAID' | 'PREPARING' | 'PENDING' | 'SERVED')[] = ['PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PREPARING', 'PREPARING', 'PREPARING', 'PENDING', 'PENDING', 'SERVED', 'SERVED', 'SERVED'];

      for (let i = 0; i < count; i++) {
        const template = templates[rand(0, templates.length - 1)];
        const orderType = pick(orderTypes);
        const tableId   = orderType === 'DINE_IN' ? pick(allTableIds) : null;
        const custId    = Math.random() > 0.4 ? pick(allCustIds) : null;
        const payMethod = pick(payMethods);
        const createdAt = daysAgo(daysBack, rand(5, 500));
        const orderStatus = isToday ? todayStatuses[i % todayStatuses.length] : 'PAID';
        const isPaid = orderStatus === 'PAID';

        let subtotal = 0;
        const lineItems: { menuItemId: string; quantity: number; unitPrice: number }[] = [];

        for (const line of template) {
          const item = menuItemMap[line.n];
          if (!item || line.q < 1) continue;
          subtotal += item.price * line.q;
          lineItems.push({ menuItemId: item.id, quantity: line.q, unitPrice: item.price });
        }
        if (lineItems.length === 0) continue;

        const tax   = round2(subtotal * 0.05);
        const total = round2(subtotal + tax);

        const order = await prisma.order.create({
          data: {
            staffId:      pick(allStaffIds),
            tableId,
            customerId:   custId,
            posSessionId: session.id,
            type:         orderType,
            status:       orderStatus,
            subtotal, tax, total,
            completedAt:  isPaid ? createdAt : null,
            createdAt,
            updatedAt:    createdAt,
            items: {
              create: lineItems.map(l => ({
                menuItemId: l.menuItemId,
                quantity:   l.quantity,
                unitPrice:  l.unitPrice,
                status:     isPaid ? 'SERVED' : 'PENDING',
              })),
            },
          },
        });

        if (isPaid) {
          await prisma.payment.create({
            data: { orderId: order.id, method: payMethod, amount: total, paidAt: createdAt },
          });
          paymentsSeeded++;
        }

        ordersSeeded++;
        itemsSeeded += lineItems.length;
      }
      log.success(`Session (${daysBack === 0 ? 'Today' : `-${daysBack}d`}): seeded ${count} orders`);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    log.section('🎉 Database seeding completed!');
    console.log(`
  ┌──────────────────────────────────────────────────────┐
  │               SEED SUMMARY                           │
  ├──────────────────────────────────────────────────────┤
  │  Users           : ${String(USERS.length).padEnd(32)}│
  │  Categories      : ${String(CATEGORIES.length).padEnd(32)}│
  │  Menu Items      : ${String(totalItems).padEnd(32)}│
  │  Floors          : ${String(FLOORS.length).padEnd(32)}│
  │  Tables          : ${String(Object.keys(tableMap).length).padEnd(32)}│
  │  Customers       : ${String(CUSTOMERS.length).padEnd(32)}│
  │  Bookings        : ${String(bookingsData.length).padEnd(32)}│
  │  Coupons         : ${String(couponsData.length).padEnd(32)}│
  │  Promotions      : ${String(promos.length).padEnd(32)}│
  │  Ingredients     : ${String(INGREDIENTS.length).padEnd(32)}│
  │  Recipe Links    : ${String(recipeCount).padEnd(32)}│
  │  POS Sessions    : 6 (5 closed + 1 open)             │
  │  Orders          : ${String(ordersSeeded).padEnd(32)}│
  │  Order Items     : ${String(itemsSeeded).padEnd(32)}│
  │  Payments        : ${String(paymentsSeeded).padEnd(32)}│
  ├──────────────────────────────────────────────────────┤
  │  TOTAL RECORDS ≈ ${String(USERS.length + CATEGORIES.length + totalItems + FLOORS.length + Object.keys(tableMap).length + CUSTOMERS.length + bookingsData.length + couponsData.length + promos.length + INGREDIENTS.length + recipeCount + 6 + ordersSeeded + itemsSeeded + paymentsSeeded).padEnd(33)}│
  └──────────────────────────────────────────────────────┘
    `);

  } catch (err) {
    console.error('\n❌ Seeding error:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
