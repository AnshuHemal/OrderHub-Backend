import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// ── Load .env (try both project root and one level up from src/) ──────────────
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// ── Logger helper ─────────────────────────────────────────────────────────────
const log = {
  section: (msg: string) => console.log(`\n${'═'.repeat(50)}\n  ${msg}\n${'═'.repeat(50)}`),
  success:  (msg: string) => console.log(`  ✅  ${msg}`),
  info:     (msg: string) => console.log(`  ℹ️   ${msg}`),
  warn:     (msg: string) => console.warn(`  ⚠️   ${msg}`),
};


// ── Seed Data ─────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'admin@cafepos.com',   name: 'Admin User',      password: 'admin123',    role: 'OWNER'   as const },
  { email: 'hemal@gmail.com',     name: 'Hemal Patel',     password: 'Hemu@123',    role: 'OWNER'   as const },
  { email: 'maya@cafepos.com',    name: 'Maya Sharma',     password: 'manager123',  role: 'MANAGER' as const },
  { email: 'john@cafepos.com',    name: 'John Mathews',    password: 'cashier123',  role: 'STAFF'   as const },
  { email: 'priya@cafepos.com',   name: 'Priya Verma',     password: 'staff123',    role: 'STAFF'   as const },
  { email: 'kitchen@cafepos.com', name: 'Chef Rohan',      password: 'kitchen123',  role: 'KITCHEN' as const },
];

const CATEGORIES = [
  {
    name: 'Hot Beverages',
    color: '#EF4444',
    icon: '☕',
    preparationStation: 'Barista Station',
    items: [
      { name: 'Espresso',           price: 180,  description: 'Rich double shot of pure arabica espresso', isPopular: true  },
      { name: 'Cappuccino',         price: 260,  description: 'Velvety espresso layered with steamed milk foam', isPopular: true  },
      { name: 'Flat White',         price: 280,  description: 'Smooth ristretto with micro-foam whole milk', isPopular: false },
      { name: 'Caramel Latte',      price: 320,  description: 'Espresso with steamed milk and house caramel sauce', isPopular: true  },
      { name: 'Americano',          price: 200,  description: 'Bold espresso topped with hot filtered water', isPopular: false },
      { name: 'Mocha',              price: 300,  description: 'Espresso blended with rich chocolate and steamed milk', isPopular: false },
      { name: 'Masala Chai',        price: 150,  description: 'Spiced Indian tea brewed with ginger, cardamom and cinnamon', isPopular: true  },
      { name: 'Hot Chocolate',      price: 280,  description: 'Creamy Belgian cocoa with whipped cream on top', isPopular: false },
    ],
  },
  {
    name: 'Cold Beverages',
    color: '#3B82F6',
    icon: '🧊',
    preparationStation: 'Barista Station',
    items: [
      { name: 'Iced Latte',         price: 300,  description: 'Chilled espresso poured over milk and ice', isPopular: true  },
      { name: 'Cold Brew',          price: 320,  description: '18-hour slow-steeped coffee, served black over ice', isPopular: true  },
      { name: 'Mango Smoothie',     price: 280,  description: 'Fresh Alphonso mango blended with yogurt', isPopular: true  },
      { name: 'Strawberry Shake',   price: 260,  description: 'Farm-fresh strawberries blended with chilled milk', isPopular: false },
      { name: 'Watermelon Juice',   price: 180,  description: 'Fresh-pressed seasonal watermelon juice, no sugar', isPopular: false },
      { name: 'Lemonade',           price: 160,  description: 'House mint lemonade with Himalayan pink salt', isPopular: true  },
      { name: 'Blue Lagoon',        price: 220,  description: 'Blue curacao, lemon, soda and fresh mint', isPopular: false },
    ],
  },
  {
    name: 'All-Day Breakfast',
    color: '#F59E0B',
    icon: '🍳',
    preparationStation: 'Hot Kitchen',
    items: [
      { name: 'Avocado Toast',      price: 420,  description: 'Sourdough toast, smashed avocado, chilli flakes and poached egg', isPopular: true  },
      { name: 'Eggs Benedict',      price: 480,  description: 'Poached eggs on English muffin with hollandaise sauce', isPopular: true  },
      { name: 'Pancake Stack',      price: 360,  description: 'Fluffy buttermilk pancakes with maple syrup and berries', isPopular: true  },
      { name: 'Greek Omelette',     price: 380,  description: 'Three-egg omelette with feta, olives and sun-dried tomato', isPopular: false },
      { name: 'Granola Bowl',       price: 320,  description: 'House granola with Greek yogurt, honey and seasonal fruit', isPopular: false },
      { name: 'Full English',       price: 550,  description: 'Eggs, grilled bacon, sausage, beans, toast and grilled tomato', isPopular: false },
    ],
  },
  {
    name: 'Mains & Bites',
    color: '#8B5CF6',
    icon: '🍔',
    preparationStation: 'Hot Kitchen',
    items: [
      { name: 'Grilled Chicken Wrap',  price: 420, description: 'Marinated chicken breast, lettuce, pesto aioli in a flour tortilla', isPopular: true  },
      { name: 'Classic Burger',        price: 480, description: 'Beef patty, cheddar, caramelised onion, house pickles and brioche bun', isPopular: true  },
      { name: 'Margherita Pizza',      price: 520, description: 'San Marzano tomato, fresh mozzarella, basil on thin crust', isPopular: false },
      { name: 'Caesar Salad',          price: 360, description: 'Romaine lettuce, parmesan, house croutons, Caesar dressing', isPopular: false },
      { name: 'Club Sandwich',         price: 400, description: 'Triple-decker with chicken, bacon, egg and lettuce', isPopular: false },
      { name: 'Pasta Arrabbiata',      price: 440, description: 'Penne in spicy tomato, garlic and fresh basil sauce', isPopular: false },
    ],
  },
  {
    name: 'Desserts',
    color: '#EC4899',
    icon: '🍰',
    preparationStation: 'Bakery & Desserts',
    items: [
      { name: 'Chocolate Brownie',    price: 220, description: 'Warm fudge brownie served with vanilla gelato', isPopular: true  },
      { name: 'New York Cheesecake',  price: 280, description: 'Classic baked cheesecake with blueberry compote', isPopular: true  },
      { name: 'Tiramisu',             price: 300, description: 'Espresso-soaked ladyfingers, mascarpone, cocoa dust', isPopular: true  },
      { name: 'Panna Cotta',          price: 260, description: 'Vanilla bean panna cotta with raspberry coulis', isPopular: false },
      { name: 'Lemon Tart',           price: 240, description: 'Crisp pastry shell filled with tangy lemon curd', isPopular: false },
      { name: 'Ice Cream Sundae',     price: 220, description: 'Three scoops of artisan gelato with toppings of choice', isPopular: false },
    ],
  },
  {
    name: 'Bakery',
    color: '#10B981',
    icon: '🥐',
    preparationStation: 'Bakery & Desserts',
    items: [
      { name: 'Butter Croissant',     price: 160, description: 'Classic laminated butter croissant, baked fresh daily', isPopular: true  },
      { name: 'Blueberry Muffin',     price: 140, description: 'Soft muffin packed with fresh blueberries and lemon zest', isPopular: false },
      { name: 'Banana Bread',         price: 180, description: 'Moist banana bread with walnut and honey drizzle', isPopular: true  },
      { name: 'Cinnamon Roll',        price: 200, description: 'Soft yeasted roll with cinnamon swirl and cream cheese glaze', isPopular: true  },
      { name: 'Focaccia',             price: 180, description: 'Rosemary and sea salt focaccia with olive oil dip', isPopular: false },
      { name: 'Almond Danish',        price: 200, description: 'Flaky pastry filled with almond cream and topped with flaked almonds', isPopular: false },
    ],
  },
];

const FLOORS = [
  {
    name: 'Ground Floor',
    position: 1,
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
    name: 'Rooftop Lounge',
    position: 2,
    tables: [
      { number: 'RT-201', seats: 2, shape: 'ROUND'     as const, posX: 80,  posY: 80,  width: 90,  height: 90  },
      { number: 'RT-202', seats: 4, shape: 'SQUARE'    as const, posX: 220, posY: 80,  width: 110, height: 110 },
      { number: 'RT-203', seats: 4, shape: 'SQUARE'    as const, posX: 380, posY: 80,  width: 110, height: 110 },
      { number: 'RT-204', seats: 6, shape: 'RECTANGLE' as const, posX: 80,  posY: 240, width: 160, height: 110 },
    ],
  },
  {
    name: 'Private Dining',
    position: 3,
    tables: [
      { number: 'PD-301', seats: 10, shape: 'RECTANGLE' as const, posX: 80,  posY: 80,  width: 280, height: 120 },
      { number: 'PD-302', seats: 6,  shape: 'ROUND'     as const, posX: 80,  posY: 260, width: 160, height: 160 },
    ],
  },
];

const CUSTOMERS = [
  { name: 'Aarav Mehta',        email: 'aarav.mehta@email.com',      phone: '+91 98765 43210' },
  { name: 'Priya Nair',         email: 'priya.nair@email.com',       phone: '+91 87654 32109' },
  { name: 'Rohan Desai',        email: 'rohan.desai@email.com',      phone: '+91 76543 21098' },
  { name: 'Sneha Patel',        email: 'sneha.patel@email.com',      phone: '+91 65432 10987' },
  { name: 'Vikram Joshi',       email: 'vikram.joshi@email.com',     phone: '+91 54321 09876' },
  { name: 'Anjali Sharma',      email: 'anjali.sharma@email.com',    phone: '+91 43210 98765' },
  { name: 'Karan Kapoor',       email: 'karan.kapoor@email.com',     phone: '+91 32109 87654' },
  { name: 'Meera Reddy',        email: 'meera.reddy@email.com',      phone: '+91 21098 76543' },
  { name: 'Arjun Singh',        email: 'arjun.singh@email.com',      phone: '+91 10987 65432' },
  { name: 'Pooja Gupta',        email: 'pooja.gupta@email.com',      phone: '+91 98761 23450' },
  { name: 'Siddharth Rao',      email: 'sid.rao@email.com',          phone: '+91 87652 34501' },
  { name: 'Kavya Krishnan',     email: 'kavya.k@email.com',          phone: '+91 76543 45612' },
  { name: 'Aditya Bose',        email: 'aditya.bose@email.com',      phone: '+91 65434 56723' },
  { name: 'Riya Malhotra',      email: 'riya.m@email.com',           phone: '+91 54325 67834' },
  { name: 'Nikhil Tandon',      email: 'nikhil.t@email.com',         phone: '+91 43216 78945' },
];

const INGREDIENTS = [
  // ── Coffee ──
  { name: 'Espresso Beans',        quantity: 2000, unit: 'g',   minThreshold: 400  },
  { name: 'Decaf Beans',           quantity: 800,  unit: 'g',   minThreshold: 150  },
  // ── Dairy ──
  { name: 'Whole Milk',            quantity: 5000, unit: 'ml',  minThreshold: 1000 },
  { name: 'Oat Milk',              quantity: 2000, unit: 'ml',  minThreshold: 400  },
  { name: 'Heavy Cream',           quantity: 1000, unit: 'ml',  minThreshold: 200  },
  { name: 'Butter',                quantity: 800,  unit: 'g',   minThreshold: 150  },
  { name: 'Cheddar Cheese',        quantity: 600,  unit: 'g',   minThreshold: 100  },
  { name: 'Feta Cheese',           quantity: 400,  unit: 'g',   minThreshold: 80   },
  { name: 'Mascarpone',            quantity: 500,  unit: 'g',   minThreshold: 100  },
  { name: 'Greek Yogurt',          quantity: 2000, unit: 'g',   minThreshold: 400  },
  // ── Proteins ──
  { name: 'Chicken Breasts',       quantity: 30,   unit: 'pcs', minThreshold: 6    },
  { name: 'Beef Patties',          quantity: 20,   unit: 'pcs', minThreshold: 5    },
  { name: 'Eggs',                  quantity: 60,   unit: 'pcs', minThreshold: 12   },
  { name: 'Smoked Bacon',          quantity: 800,  unit: 'g',   minThreshold: 150  },
  // ── Produce ──
  { name: 'Avocados',              quantity: 20,   unit: 'pcs', minThreshold: 5    },
  { name: 'Sourdough Slices',      quantity: 30,   unit: 'pcs', minThreshold: 6    },
  { name: 'Mango',                 quantity: 15,   unit: 'pcs', minThreshold: 4    },
  { name: 'Strawberries',          quantity: 1000, unit: 'g',   minThreshold: 200  },
  { name: 'Blueberries',           quantity: 600,  unit: 'g',   minThreshold: 100  },
  { name: 'Lemon',                 quantity: 20,   unit: 'pcs', minThreshold: 5    },
  { name: 'Fresh Basil',           quantity: 200,  unit: 'g',   minThreshold: 40   },
  { name: 'Romaine Lettuce',       quantity: 10,   unit: 'pcs', minThreshold: 3    },
  // ── Dry Goods ──
  { name: 'All-Purpose Flour',     quantity: 5000, unit: 'g',   minThreshold: 800  },
  { name: 'Chocolate Fudge',       quantity: 1500, unit: 'g',   minThreshold: 300  },
  { name: 'Cocoa Powder',          quantity: 600,  unit: 'g',   minThreshold: 100  },
  { name: 'Sugar',                 quantity: 3000, unit: 'g',   minThreshold: 500  },
  { name: 'Vanilla Extract',       quantity: 200,  unit: 'ml',  minThreshold: 40   },
  { name: 'Ladyfingers',           quantity: 200,  unit: 'pcs', minThreshold: 30   },
  { name: 'Almond Flour',          quantity: 800,  unit: 'g',   minThreshold: 150  },
  // ── Sauces & Condiments ──
  { name: 'Hollandaise Sauce',     quantity: 500,  unit: 'ml',  minThreshold: 80   },
  { name: 'Caramel Sauce',         quantity: 500,  unit: 'ml',  minThreshold: 80   },
  { name: 'Tomato Sauce',          quantity: 2000, unit: 'ml',  minThreshold: 400  },
  { name: 'Maple Syrup',           quantity: 1000, unit: 'ml',  minThreshold: 150  },
  { name: 'Pesto',                 quantity: 400,  unit: 'g',   minThreshold: 80   },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in env');
    process.exit(1);
  }

  const pool    = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma  = new PrismaClient({ adapter });

  try {
    log.section('Connecting to database...');
    await prisma.$connect();
    log.success('Connected!');

    // ── Wipe ──────────────────────────────────────────────────────────────────
    log.section('Clearing existing records (cascade-safe order)...');
    await prisma.recipeIngredient.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.table.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.promotion.deleteMany();
    log.success('Cleared all existing records');

    // ── Users ─────────────────────────────────────────────────────────────────
    log.section(`Seeding ${USERS.length} users...`);
    for (const u of USERS) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        const hash = await bcrypt.hash(u.password, 12);
        await prisma.user.create({
          data: {
            name: u.name, email: u.email, role: u.role,
            accounts: { create: { accountId: u.email, providerId: 'credential', password: hash } },
          },
        });
        log.success(`User: ${u.name} (${u.role})`);
      } else {
        log.info(`User already exists: ${u.email}`);
      }
    }

    // ── Categories + Menu Items ───────────────────────────────────────────────
    log.section(`Seeding ${CATEGORIES.length} categories...`);
    const menuItemMap: Record<string, string> = {}; // name -> id

    for (const [catIndex, catData] of CATEGORIES.entries()) {
      const cat = await prisma.category.create({
        data: {
          name: catData.name,
          color: catData.color,
          icon: catData.icon,
          preparationStation: catData.preparationStation,
          isActive: true,
          position: catIndex,
        },
      });
      log.success(`Category: ${cat.name} (${catData.items.length} items)`);

      for (const [itemIndex, itemData] of catData.items.entries()) {
        const item = await prisma.menuItem.create({
          data: {
            categoryId: cat.id,
            name:        itemData.name,
            price:       itemData.price,
            description: itemData.description,
            isAvailable: true,
            isPopular:   itemData.isPopular,
            position:    itemIndex,
          },
        });
        menuItemMap[item.name] = item.id;
        log.info(`  MenuItem: ${item.name} — ₹${item.price}`);
      }
    }

    const totalItems = Object.keys(menuItemMap).length;
    log.success(`Seeded ${totalItems} menu items across ${CATEGORIES.length} categories`);

    // ── Floors + Tables ───────────────────────────────────────────────────────
    log.section(`Seeding ${FLOORS.length} floors...`);
    const tableMap: Record<string, string> = {}; // number -> id

    for (const floorData of FLOORS) {
      const floor = await prisma.floor.create({
        data: { name: floorData.name, position: floorData.position },
      });
      log.success(`Floor: ${floor.name} (${floorData.tables.length} tables)`);

      for (const tableData of floorData.tables) {
        const table = await prisma.table.create({
          data: {
            floorId: floor.id,
            number:  tableData.number,
            seats:   tableData.seats,
            shape:   tableData.shape,
            posX:    tableData.posX,
            posY:    tableData.posY,
            width:   tableData.width,
            height:  tableData.height,
            status:  'AVAILABLE',
          },
        });
        tableMap[table.number] = table.id;
        log.info(`  Table: ${table.number} (${table.seats} seats)`);
      }
    }

    const totalTables = Object.keys(tableMap).length;
    log.success(`Seeded ${totalTables} tables across ${FLOORS.length} floors`);

    // ── Customers ─────────────────────────────────────────────────────────────
    log.section(`Seeding ${CUSTOMERS.length} customers...`);
    const customerMap: Record<string, string> = {}; // email -> id

    for (const custData of CUSTOMERS) {
      const cust = await prisma.customer.create({ data: custData });
      customerMap[cust.email] = cust.id;
      log.info(`  Customer: ${cust.name}`);
    }
    log.success(`Seeded ${CUSTOMERS.length} customers`);

    // ── Bookings ──────────────────────────────────────────────────────────────
    log.section('Seeding bookings...');
    const now = Date.now();

    const bookingsData = [
      { custEmail: 'aarav.mehta@email.com',   tableNum: 'T-101',  minsFromNow: 30,    guests: 2,  status: 'confirmed', notes: 'Anniversary dinner — quiet corner preferred' },
      { custEmail: 'priya.nair@email.com',    tableNum: 'T-102',  minsFromNow: 90,    guests: 4,  status: 'confirmed', notes: 'Vegetarian menu please' },
      { custEmail: 'rohan.desai@email.com',   tableNum: 'RT-202', minsFromNow: 150,   guests: 3,  status: 'pending',   notes: 'Allergic to nuts' },
      { custEmail: 'sneha.patel@email.com',   tableNum: 'T-104',  minsFromNow: -30,   guests: 6,  status: 'confirmed', notes: 'Birthday celebration — need a cake placeholder' },
      { custEmail: 'vikram.joshi@email.com',  tableNum: 'PD-301', minsFromNow: 240,   guests: 8,  status: 'pending',   notes: 'Corporate lunch, need separate billing' },
      { custEmail: 'anjali.sharma@email.com', tableNum: 'T-103',  minsFromNow: 60,    guests: 2,  status: 'confirmed', notes: 'Window seat preferred' },
      { custEmail: 'karan.kapoor@email.com',  tableNum: 'RT-201', minsFromNow: 360,   guests: 2,  status: 'pending',   notes: 'Sunset seating' },
      { custEmail: 'meera.reddy@email.com',   tableNum: 'T-105',  minsFromNow: 20,    guests: 2,  status: 'confirmed', notes: 'High chair needed for toddler' },
    ];

    for (const b of bookingsData) {
      const custId  = customerMap[b.custEmail];
      const tableId = tableMap[b.tableNum];
      if (!custId || !tableId) { log.warn(`Skipping booking — missing ref: ${b.custEmail} / ${b.tableNum}`); continue; }

      await prisma.booking.create({
        data: {
          customerId:  custId,
          tableId,
          bookingTime: new Date(now + b.minsFromNow * 60000),
          guestsCount: b.guests,
          status:      b.status,
          notes:       b.notes,
        },
      });
      log.info(`  Booking: ${b.custEmail} → ${b.tableNum} (${b.guests} guests)`);
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
    ];
    for (const c of couponsData) {
      await prisma.coupon.create({ data: c });
      log.info(`  Coupon: ${c.code} (${c.discountType} — ${c.discountValue})`);
    }
    log.success(`Seeded ${couponsData.length} coupons`);

    // ── Promotions ────────────────────────────────────────────────────────────
    log.section('Seeding promotions...');
    const espressoId = menuItemMap['Espresso'];
    const promos = [
      {
        name: 'Espresso Lovers — 3+ shots 15% off',
        promoType: 'product',
        targetProductId: espressoId ?? null,
        minQuantity: 3,
        minOrderAmount: null,
        discountType: 'percentage',
        discountValue: 15,
        isActive: true,
      },
      {
        name: 'Big Order — ₹800+ get ₹80 off',
        promoType: 'order',
        targetProductId: null,
        minQuantity: null,
        minOrderAmount: 800,
        discountType: 'fixed',
        discountValue: 80,
        isActive: true,
      },
      {
        name: 'Happy Hours — 10% off all drinks 3–5pm',
        promoType: 'order',
        targetProductId: null,
        minQuantity: null,
        minOrderAmount: 200,
        discountType: 'percentage',
        discountValue: 10,
        isActive: false,
      },
    ];
    for (const p of promos) {
      await prisma.promotion.create({ data: p });
      log.info(`  Promo: ${p.name}`);
    }
    log.success(`Seeded ${promos.length} promotions`);

    // ── Ingredients ───────────────────────────────────────────────────────────
    log.section(`Seeding ${INGREDIENTS.length} raw ingredients...`);
    const ingMap: Record<string, string> = {}; // name -> id

    for (const ingData of INGREDIENTS) {
      const ing = await prisma.ingredient.create({ data: ingData });
      ingMap[ing.name] = ing.id;
      log.info(`  Ingredient: ${ing.name} — ${ing.quantity}${ing.unit} (min: ${ing.minThreshold})`);
    }
    log.success(`Seeded ${INGREDIENTS.length} ingredients`);

    // ── Recipes ───────────────────────────────────────────────────────────────
    log.section('Seeding recipe ingredient links...');

    const recipes: { itemName: string; ingredients: { name: string; qty: number }[] }[] = [
      // ── Hot Beverages ──
      { itemName: 'Espresso',           ingredients: [{ name: 'Espresso Beans', qty: 18 }] },
      { itemName: 'Cappuccino',         ingredients: [{ name: 'Espresso Beans', qty: 18 }, { name: 'Whole Milk', qty: 150 }] },
      { itemName: 'Flat White',         ingredients: [{ name: 'Espresso Beans', qty: 18 }, { name: 'Whole Milk', qty: 130 }] },
      { itemName: 'Caramel Latte',      ingredients: [{ name: 'Espresso Beans', qty: 18 }, { name: 'Whole Milk', qty: 200 }, { name: 'Caramel Sauce', qty: 20 }] },
      { itemName: 'Americano',          ingredients: [{ name: 'Espresso Beans', qty: 18 }] },
      { itemName: 'Mocha',              ingredients: [{ name: 'Espresso Beans', qty: 18 }, { name: 'Whole Milk', qty: 150 }, { name: 'Cocoa Powder', qty: 15 }] },
      { itemName: 'Hot Chocolate',      ingredients: [{ name: 'Whole Milk', qty: 250 }, { name: 'Cocoa Powder', qty: 20 }] },
      // ── Cold Beverages ──
      { itemName: 'Iced Latte',         ingredients: [{ name: 'Espresso Beans', qty: 18 }, { name: 'Whole Milk', qty: 200 }] },
      { itemName: 'Cold Brew',          ingredients: [{ name: 'Espresso Beans', qty: 30 }] },
      { itemName: 'Mango Smoothie',     ingredients: [{ name: 'Mango', qty: 1 }, { name: 'Greek Yogurt', qty: 80 }, { name: 'Sugar', qty: 15 }] },
      { itemName: 'Strawberry Shake',   ingredients: [{ name: 'Strawberries', qty: 120 }, { name: 'Whole Milk', qty: 200 }, { name: 'Sugar', qty: 20 }] },
      { itemName: 'Lemonade',           ingredients: [{ name: 'Lemon', qty: 2 }, { name: 'Sugar', qty: 30 }] },
      // ── Breakfast ──
      { itemName: 'Avocado Toast',      ingredients: [{ name: 'Sourdough Slices', qty: 2 }, { name: 'Avocados', qty: 1 }, { name: 'Eggs', qty: 1 }, { name: 'Lemon', qty: 1 }] },
      { itemName: 'Eggs Benedict',      ingredients: [{ name: 'Eggs', qty: 2 }, { name: 'Smoked Bacon', qty: 60 }, { name: 'Hollandaise Sauce', qty: 50 }, { name: 'Butter', qty: 15 }] },
      { itemName: 'Pancake Stack',      ingredients: [{ name: 'All-Purpose Flour', qty: 120 }, { name: 'Eggs', qty: 2 }, { name: 'Whole Milk', qty: 150 }, { name: 'Maple Syrup', qty: 40 }, { name: 'Blueberries', qty: 50 }] },
      { itemName: 'Greek Omelette',     ingredients: [{ name: 'Eggs', qty: 3 }, { name: 'Feta Cheese', qty: 40 }, { name: 'Butter', qty: 10 }] },
      { itemName: 'Granola Bowl',       ingredients: [{ name: 'Greek Yogurt', qty: 150 }, { name: 'Blueberries', qty: 30 }, { name: 'Strawberries', qty: 40 }] },
      { itemName: 'Full English',       ingredients: [{ name: 'Eggs', qty: 2 }, { name: 'Smoked Bacon', qty: 80 }, { name: 'Butter', qty: 15 }, { name: 'Tomato Sauce', qty: 50 }] },
      // ── Mains ──
      { itemName: 'Grilled Chicken Wrap', ingredients: [{ name: 'Chicken Breasts', qty: 1 }, { name: 'Pesto', qty: 20 }, { name: 'Romaine Lettuce', qty: 0.5 }] },
      { itemName: 'Classic Burger',       ingredients: [{ name: 'Beef Patties', qty: 1 }, { name: 'Cheddar Cheese', qty: 30 }, { name: 'Romaine Lettuce', qty: 0.3 }] },
      { itemName: 'Caesar Salad',         ingredients: [{ name: 'Romaine Lettuce', qty: 1 }, { name: 'Cheddar Cheese', qty: 20 }] },
      { itemName: 'Club Sandwich',        ingredients: [{ name: 'Chicken Breasts', qty: 1 }, { name: 'Smoked Bacon', qty: 40 }, { name: 'Eggs', qty: 1 }, { name: 'Romaine Lettuce', qty: 0.3 }] },
      { itemName: 'Pasta Arrabbiata',     ingredients: [{ name: 'All-Purpose Flour', qty: 100 }, { name: 'Tomato Sauce', qty: 120 }, { name: 'Fresh Basil', qty: 10 }] },
      // ── Desserts ──
      { itemName: 'Chocolate Brownie',    ingredients: [{ name: 'Chocolate Fudge', qty: 50 }, { name: 'All-Purpose Flour', qty: 60 }, { name: 'Eggs', qty: 2 }, { name: 'Butter', qty: 60 }, { name: 'Sugar', qty: 80 }] },
      { itemName: 'New York Cheesecake',  ingredients: [{ name: 'Mascarpone', qty: 120 }, { name: 'Sugar', qty: 60 }, { name: 'Eggs', qty: 2 }, { name: 'Blueberries', qty: 30 }] },
      { itemName: 'Tiramisu',             ingredients: [{ name: 'Mascarpone', qty: 100 }, { name: 'Ladyfingers', qty: 5 }, { name: 'Espresso Beans', qty: 15 }, { name: 'Cocoa Powder', qty: 10 }, { name: 'Heavy Cream', qty: 50 }] },
      { itemName: 'Panna Cotta',          ingredients: [{ name: 'Heavy Cream', qty: 150 }, { name: 'Sugar', qty: 30 }, { name: 'Vanilla Extract', qty: 5 }] },
      { itemName: 'Lemon Tart',           ingredients: [{ name: 'All-Purpose Flour', qty: 80 }, { name: 'Butter', qty: 40 }, { name: 'Eggs', qty: 3 }, { name: 'Lemon', qty: 2 }, { name: 'Sugar', qty: 60 }] },
      // ── Bakery ──
      { itemName: 'Butter Croissant',     ingredients: [{ name: 'All-Purpose Flour', qty: 80 }, { name: 'Butter', qty: 50 }] },
      { itemName: 'Blueberry Muffin',     ingredients: [{ name: 'All-Purpose Flour', qty: 80 }, { name: 'Blueberries', qty: 40 }, { name: 'Eggs', qty: 1 }, { name: 'Sugar', qty: 40 }] },
      { itemName: 'Banana Bread',         ingredients: [{ name: 'All-Purpose Flour', qty: 100 }, { name: 'Eggs', qty: 2 }, { name: 'Sugar', qty: 60 } ] },
      { itemName: 'Cinnamon Roll',        ingredients: [{ name: 'All-Purpose Flour', qty: 120 }, { name: 'Butter', qty: 30 }, { name: 'Sugar', qty: 40 }, { name: 'Heavy Cream', qty: 30 }] },
      { itemName: 'Almond Danish',        ingredients: [{ name: 'All-Purpose Flour', qty: 100 }, { name: 'Almond Flour', qty: 40 }, { name: 'Butter', qty: 30 }, { name: 'Eggs', qty: 1 }] },
    ];

    let recipeCount = 0;
    for (const recipe of recipes) {
      const menuItemId = menuItemMap[recipe.itemName];
      if (!menuItemId) { log.warn(`  Skipping recipe — no menuItem found: "${recipe.itemName}"`); continue; }

      for (const row of recipe.ingredients) {
        const ingredientId = ingMap[row.name];
        if (!ingredientId) { log.warn(`  Skipping recipe row — no ingredient found: "${row.name}" for "${recipe.itemName}"`); continue; }

        await prisma.recipeIngredient.create({
          data: { menuItemId, ingredientId, quantityRequired: row.qty },
        });
        recipeCount++;
      }
      log.info(`  Recipe: ${recipe.itemName} → ${recipe.ingredients.length} ingredient(s)`);
    }
    log.success(`Seeded ${recipeCount} recipe ingredient links across ${recipes.length} menu items`);

    // ── Summary ───────────────────────────────────────────────────────────────
    log.section('🎉 Database seeding completed successfully!');
    console.log(`
  Summary
  ───────────────────────────────────
  Users         : ${USERS.length}
  Categories    : ${CATEGORIES.length}
  Menu Items    : ${totalItems}
  Floors        : ${FLOORS.length}
  Tables        : ${totalTables}
  Customers     : ${CUSTOMERS.length}
  Bookings      : ${bookingsData.length}
  Coupons       : ${couponsData.length}
  Promotions    : ${promos.length}
  Ingredients   : ${INGREDIENTS.length}
  Recipe Links  : ${recipeCount}
  ───────────────────────────────────
  Total Records : ~${USERS.length + CATEGORIES.length + totalItems + FLOORS.length + totalTables + CUSTOMERS.length + bookingsData.length + couponsData.length + promos.length + INGREDIENTS.length + recipeCount}
    `);

  } catch (err) {
    console.error('\n❌ Error during seeding:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
