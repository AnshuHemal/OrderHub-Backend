import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  }
} catch (e) {
  console.warn('Failed to load .env file manually:', e);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Connecting to database...');
    await prisma.$connect();

    console.log('Clearing existing database records...');
    // Delete tables first due to foreign key references
    await prisma.table.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.category.deleteMany();

    console.log('Seeding users...');
    const usersToSeed = [
      { email: 'admin@cafepos.com', name: 'Admin User', password: 'admin123', role: 'OWNER' as const },
      { email: 'john@cafepos.com', name: 'Cashier John', password: 'cashier123', role: 'STAFF' as const },
      { email: 'hemal@gmail.com', name: 'Hemal User', password: 'Hemu@123', role: 'OWNER' as const },
    ];

    for (const u of usersToSeed) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        const hash = await bcrypt.hash(u.password, 12);
        const createdUser = await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            role: u.role,
            accounts: {
              create: {
                accountId: u.email,
                providerId: 'credential',
                password: hash,
              }
            }
          }
        });
        console.log(`Created user: ${createdUser.email}`);
      } else {
        console.log(`User already exists: ${u.email}`);
      }
    }

    console.log('Seeding menu categories and menu items...');
    const categoriesToSeed = [
      {
        name: 'Hot Beverages',
        color: '#EF4444',
        items: [
          { name: 'Espresso', price: 3.50, description: 'Rich shot of double espresso' },
          { name: 'Cappuccino', price: 4.50, description: 'Espresso with steamed milk foam' }
        ]
      },
      {
        name: 'Cold Beverages',
        color: '#3B82F6',
        items: [
          { name: 'Iced Latte', price: 4.80, description: 'Cold milk over ice, with espresso' }
        ]
      },
      {
        name: 'Snacks',
        color: '#F59E0B',
        items: [
          { name: 'Avocado Toast', price: 7.50, description: 'Sourdough with mashed avocado and chilli flakes' }
        ]
      },
      {
        name: 'Desserts',
        color: '#EC4899',
        items: [
          { name: 'Chocolate Brownie', price: 3.80, description: 'Warm fudge chocolate brownie' }
        ]
      },
      {
        name: 'Bakery',
        color: '#10B981',
        items: [
          { name: 'Croissant', price: 3.20, description: 'Flaky butter croissant' }
        ]
      }
    ];

    for (const catData of categoriesToSeed) {
      const createdCategory = await prisma.category.create({
        data: {
          name: catData.name,
          color: catData.color,
          isActive: true
        }
      });
      console.log(`Created category: ${createdCategory.name}`);

      for (const itemData of catData.items) {
        const createdItem = await prisma.menuItem.create({
          data: {
            categoryId: createdCategory.id,
            name: itemData.name,
            price: itemData.price,
            description: itemData.description,
            isAvailable: true,
            isPopular: false
          }
        });
        console.log(`  Created menu item: ${createdItem.name}`);
      }
    }

    console.log('Seeding floors and tables...');
    const floorsToSeed = [
      {
        name: 'Ground Floor',
        position: 1,
        tables: [
          { number: 'T-101', seats: 2 },
          { number: 'T-102', seats: 4 },
          { number: 'T-103', seats: 4 },
          { number: 'T-104', seats: 6 }
        ]
      },
      {
        name: 'Rooftop Lounge',
        position: 2,
        tables: [
          { number: 'RT-201', seats: 2 },
          { number: 'RT-202', seats: 4 }
        ]
      }
    ];

    for (const floorData of floorsToSeed) {
      const createdFloor = await prisma.floor.create({
        data: {
          name: floorData.name,
          position: floorData.position
        }
      });
      console.log(`Created floor: ${createdFloor.name}`);

      for (const tableData of floorData.tables) {
        const createdTable = await prisma.table.create({
          data: {
            floorId: createdFloor.id,
            number: tableData.number,
            seats: tableData.seats,
            shape: 'SQUARE',
            status: 'AVAILABLE'
          }
        });
        console.log(`  Created table: ${createdTable.number}`);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
