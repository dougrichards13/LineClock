const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dev.db').replace(/\\/g, '/');
const dbUrl = `file:${dbPath}`;

console.log('Database URL:', dbUrl);

const libsql = createClient({ url: dbUrl });
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter, log: ['query', 'error'] });

async function test() {
  try {
    console.log('Testing with forward slashes...');
    const users = await prisma.user.findMany();
    console.log('✓ Success! Users found:', users.length);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
