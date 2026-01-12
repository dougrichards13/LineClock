const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');

// Try just 'file:dev.db' as relative path
const dbUrl = 'file:dev.db';

console.log('Database URL:', dbUrl);

const libsql = createClient({ url: dbUrl });
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter, log: ['query', 'error'] });

async function test() {
  try {
    console.log('Testing with relative path...');
    const users = await prisma.user.findMany();
    console.log('✓ Success! Users found:', users.length);
    
    // Try creating a user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'EMPLOYEE',
      },
    });
    console.log('✓ Created user:', testUser.email);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
