import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with test employee data...');

  // Create test employee user
  const testEmployee = await prisma.user.upsert({
    where: { email: 'test.employee@smartfactory.com' },
    update: {},
    create: {
      email: 'test.employee@smartfactory.com',
      name: 'Test Employee',
      role: 'EMPLOYEE',
      billableRate: 75.00, // $75/hour consultant rate
      hireDate: new Date('2024-01-15'),
      isHidden: false,
      notificationPreference: 'EMAIL',
    },
  });

  console.log('✓ Created test employee:', testEmployee.name);

  // Create test client
  const testClient = await prisma.client.upsert({
    where: { name: 'Acme Corporation' },
    update: {},
    create: {
      name: 'Acme Corporation',
      isActive: true,
    },
  });

  console.log('✓ Created test client:', testClient.name);

  // Create test project
  const testProject = await prisma.project.upsert({
    where: {
      clientId_name: {
        clientId: testClient.id,
        name: 'Digital Transformation',
      },
    },
    update: {},
    create: {
      name: 'Digital Transformation',
      clientId: testClient.id,
      billingRate: 150.00, // $150/hour client billing rate
      isActive: true,
    },
  });

  console.log('✓ Created test project:', testProject.name);

  // Assign employee to client
  const userClient = await prisma.userClient.upsert({
    where: {
      userId_clientId: {
        userId: testEmployee.id,
        clientId: testClient.id,
      },
    },
    update: {},
    create: {
      userId: testEmployee.id,
      clientId: testClient.id,
    },
  });

  console.log('✓ Assigned employee to client');

  // Assign employee to project
  const userProject = await prisma.userProject.upsert({
    where: {
      userId_projectId: {
        userId: testEmployee.id,
        projectId: testProject.id,
      },
    },
    update: {},
    create: {
      userId: testEmployee.id,
      projectId: testProject.id,
    },
  });

  console.log('✓ Assigned employee to project');

  // Create a sample draft time entry
  const draftEntry = await prisma.timeEntry.create({
    data: {
      userId: testEmployee.id,
      clientId: testClient.id,
      projectId: testProject.id,
      date: new Date(),
      hoursWorked: 6.5,
      description: 'Requirements gathering and stakeholder meetings',
      status: 'DRAFT',
      consultantRate: testEmployee.billableRate,
      clientRate: testProject.billingRate,
      consultantAmount: 6.5 * (testEmployee.billableRate || 0),
      clientAmount: 6.5 * (testProject.billingRate || 0),
      smartFactoryMargin: 6.5 * ((testProject.billingRate || 0) - (testEmployee.billableRate || 0)),
    },
  });

  console.log('✓ Created sample draft time entry');

  // Create a sample submitted time entry
  const submittedEntry = await prisma.timeEntry.create({
    data: {
      userId: testEmployee.id,
      clientId: testClient.id,
      projectId: testProject.id,
      date: new Date(Date.now() - 86400000), // Yesterday
      hoursWorked: 8.0,
      description: 'Developed initial proof of concept for API integration',
      status: 'SUBMITTED',
      consultantRate: testEmployee.billableRate,
      clientRate: testProject.billingRate,
      consultantAmount: 8.0 * (testEmployee.billableRate || 0),
      clientAmount: 8.0 * (testProject.billingRate || 0),
      smartFactoryMargin: 8.0 * ((testProject.billingRate || 0) - (testEmployee.billableRate || 0)),
    },
  });

  console.log('✓ Created sample submitted time entry');

  console.log('\n✅ Seeding completed successfully!\n');
  console.log('📋 Test Employee Credentials:');
  console.log('   Email: test.employee@smartfactory.com');
  console.log('   Name: Test Employee');
  console.log('   Role: EMPLOYEE');
  console.log('\n🔑 To login as this employee:');
  console.log('   Since this system uses Microsoft Entra ID, you need to:');
  console.log('   1. Add test.employee@smartfactory.com to your Azure AD tenant');
  console.log('   2. Login through the Entra ID flow');
  console.log('   OR');
  console.log('   3. Temporarily modify the auth system to allow direct employee login');
  console.log('\n📊 Test Data Created:');
  console.log(`   - Client: ${testClient.name}`);
  console.log(`   - Project: ${testProject.name}`);
  console.log(`   - Time Entries: 2 (1 draft, 1 submitted)`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
