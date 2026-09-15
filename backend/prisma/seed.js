const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CivicPulse database...');

  // 1. Password Hashes
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // 2. Users
  const citizen1 = await prisma.user.upsert({
    where: { email: 'citizen@civicpulse.org' },
    update: {},
    create: {
      name: 'Jane Citizen',
      email: 'citizen@civicpulse.org',
      passwordHash: defaultPasswordHash,
      role: 'CITIZEN',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  });

  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@civicpulse.org' },
    update: {},
    create: {
      name: 'City Admin',
      email: 'admin@civicpulse.org',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
  });

  console.log('Users seeded:', citizen1.email, admin1.email);

  // 3. Categories
  const categoriesData = [
    {
      name: 'Roads & Potholes',
      slug: 'roads-potholes',
      description: 'Dangerous potholes, damaged asphalt, missing curb stones, and road degradation.',
      icon: 'Construction',
      priorityWeight: 1.4,
    },
    {
      name: 'Waste & Sanitation',
      slug: 'waste-sanitation',
      description: 'Overflowing dumpsters, illegal dumping, littering, and uncollected trash.',
      icon: 'Trash2',
      priorityWeight: 1.3,
    },
    {
      name: 'Street Lighting',
      slug: 'street-lighting',
      description: 'Broken, flickering, or non-functioning street lamps causing safety concerns.',
      icon: 'Lightbulb',
      priorityWeight: 1.2,
    },
    {
      name: 'Water & Drainage',
      slug: 'water-drainage',
      description: 'Pipe leaks, water main bursts, blocked storm drains, and sewage backups.',
      icon: 'Droplets',
      priorityWeight: 1.5,
    },
    {
      name: 'Traffic & Signage',
      slug: 'traffic-signage',
      description: 'Fallen stop signs, malfunctioning traffic signals, obscured road markings.',
      icon: 'AlertTriangle',
      priorityWeight: 1.1,
    },
    {
      name: 'Parks & Public Space',
      slug: 'parks-public-space',
      description: 'Broken playground equipment, damaged benches, overgrown vegetation.',
      icon: 'Trees',
      priorityWeight: 1.0,
    },
  ];

  const createdCategories = [];
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories.push(created);
  }

  console.log(`Seeded ${createdCategories.length} categories.`);

  // 4. Sample Issues
  const roadCat = createdCategories.find((c) => c.slug === 'roads-potholes') || createdCategories[0];
  const wasteCat = createdCategories.find((c) => c.slug === 'waste-sanitation') || createdCategories[1];
  const lightCat = createdCategories.find((c) => c.slug === 'street-lighting') || createdCategories[2];

  const sampleIssues = [
    {
      userId: citizen1.id,
      categoryId: roadCat.id,
      title: 'Deep Pothole on Main Street near 5th Avenue',
      description: 'Severe pothole measuring approximately 2 feet wide and 5 inches deep. Multiple vehicles have sustained tire damage.',
      status: 'OPEN',
      severity: 'HIGH',
      priorityScore: 78,
      latitude: 40.7128,
      longitude: -74.006,
      address: '5th Ave & Main St, Metro City',
      confirmationsCount: 12,
    },
    {
      userId: citizen1.id,
      categoryId: wasteCat.id,
      title: 'Overflowing Trash Dumpster at Community Park',
      description: 'Public dumpster has been overflowing for 3 days attracting pests and creating severe odor near children play area.',
      status: 'IN_PROGRESS',
      severity: 'CRITICAL',
      priorityScore: 89,
      latitude: 40.7145,
      longitude: -74.0082,
      address: 'Central Park West Entrance',
      confirmationsCount: 24,
    },
    {
      userId: citizen1.id,
      categoryId: lightCat.id,
      title: 'Dark Alley due to Unlit Streetlamp',
      description: 'Street light bulb burned out on Elm Street. Dark area causes night pedestrian safety concerns.',
      status: 'UNDER_REVIEW',
      severity: 'MEDIUM',
      priorityScore: 45,
      latitude: 40.711,
      longitude: -74.0035,
      address: '142 Elm Street, Metro City',
      confirmationsCount: 5,
    },
  ];

  for (const issueData of sampleIssues) {
    const existing = await prisma.issue.findFirst({ where: { title: issueData.title } });
    if (!existing) {
      const createdIssue = await prisma.issue.create({
        data: {
          ...issueData,
          images: {
            create: [
              {
                imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
                publicId: 'seed_sample_1',
              },
            ],
          },
          statusHistory: {
            create: [
              {
                oldStatus: null,
                newStatus: issueData.status,
                changedBy: 'Jane Citizen',
                note: 'Report submitted by citizen.',
              },
            ],
          },
          confirmations: {
            create: [
              { userId: citizen1.id },
            ],
          },
        },
      });
      console.log(`Created sample issue: ${createdIssue.title}`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
