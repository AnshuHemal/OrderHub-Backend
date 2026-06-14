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
    await prisma.booking.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.table.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();

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
        preparationStation: 'Barista Station',
        items: [
          { name: 'Espresso', price: 3.50, description: 'Rich shot of double espresso' },
          { name: 'Cappuccino', price: 4.50, description: 'Espresso with steamed milk foam' }
        ]
      },
      {
        name: 'Cold Beverages',
        color: '#3B82F6',
        preparationStation: 'Barista Station',
        items: [
          { name: 'Iced Latte', price: 4.80, description: 'Cold milk over ice, with espresso' }
        ]
      },
      {
        name: 'Snacks',
        color: '#F59E0B',
        preparationStation: 'Hot Kitchen',
        items: [
          { name: 'Avocado Toast', price: 7.50, description: 'Sourdough with mashed avocado and chilli flakes' }
        ]
      },
      {
        name: 'Desserts',
        color: '#EC4899',
        preparationStation: 'Bakery & Desserts',
        items: [
          { name: 'Chocolate Brownie', price: 3.80, description: 'Warm fudge chocolate brownie' }
        ]
      },
      {
        name: 'Bakery',
        color: '#10B981',
        preparationStation: 'Bakery & Desserts',
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
          preparationStation: catData.preparationStation,
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

    console.log('Seeding customers...');
    const sarah = await prisma.customer.create({
      data: { name: 'Sarah Connor', email: 'sarah@terminator.com', phone: '+1 555 1234' }
    });
    const bruce = await prisma.customer.create({
      data: { name: 'Bruce Wayne', email: 'bruce@batman.com', phone: '+1 999 8888' }
    });
    console.log(`Created customers: ${sarah.name}, ${bruce.name}`);

    console.log('Seeding table bookings...');
    const tableT101 = await prisma.table.findFirst({ where: { number: 'T-101' } });
    const tableT102 = await prisma.table.findFirst({ where: { number: 'T-102' } });

    if (tableT101 && tableT102) {
      // Seed one confirmed booking 15 minutes in the future for testing reservation proximity
      const timeProximity = new Date(Date.now() + 15 * 60000); // 15 mins in future
      await prisma.booking.create({
        data: {
          customerId: sarah.id,
          tableId: tableT101.id,
          bookingTime: timeProximity,
          guestsCount: 2,
          status: 'confirmed',
          notes: 'Wants a quiet corner table, anniversary celebration.'
        }
      });

      // Seed another booking 3 hours in the future
      const timeFar = new Date(Date.now() + 3 * 3600000); // 3 hours in future
      await prisma.booking.create({
        data: {
          customerId: bruce.id,
          tableId: tableT102.id,
          bookingTime: timeFar,
          guestsCount: 4,
          status: 'pending',
          notes: 'High chair needed for a child.'
        }
      });
      console.log('Seeded 2 mock bookings successfully.');
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
