const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['query', 'error'] });

async function test() {
  try {
    console.log('Testing Prisma 5.x...');
    const users = await prisma.user.findMany();
    console.log('✓ Success! Users found:', users.length);
    
    if (users.length > 0) {
      console.log('First user:', users[0]);
    } else {
      // Create a test user
      const testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'EMPLOYEE',
        },
      });
      console.log('✓ Created test user:', testUser);
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
