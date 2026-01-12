const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ 
  log: ['query', 'info', 'warn', 'error'],
});

async function test() {
  try {
    console.log('Testing native Prisma...');
    const users = await prisma.user.findMany();
    console.log('✓ Success! Users found:', users.length);
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
