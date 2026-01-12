const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dev.db');
const dbUrl = `file:${dbPath}`;

console.log('Database URL:', dbUrl);

const libsql = createClient({
  url: dbUrl,
});

const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ 
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testing Prisma connection...');
    const users = await prisma.user.findMany();
    console.log('✓ Connection successful!');
    console.log('Users found:', users.length);
    
    // Try creating a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-connection@test.com',
        name: 'Test Connection',
        role: 'EMPLOYEE',
      },
    });
    console.log('✓ Created test user:', testUser);
    
  } catch (error) {
    console.error('✗ Connection failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
