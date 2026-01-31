/**
 * Database Seed Script
 * 
 * Seeds the database with sample projects for the marketplace
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Create or find an installer user for projects
  let installer = await prisma.user.findFirst({
    where: { role: 'INSTALLER' }
  });

  if (!installer) {
    console.log('Creating installer user...');
    installer = await prisma.user.create({
      data: {
        email: 'installer@aethera.demo',
        name: 'Aethera Solar Installer',
        role: 'INSTALLER',
        kycStatus: 'VERIFIED',
        company: 'SunPower Solutions',
        country: 'United States',
      }
    });
  }

  console.log(`Using installer: ${installer.name} (${installer.id})`);

  // Sample projects for the marketplace
  const sampleProjects = [
    {
      name: 'California Solar Farm Alpha',
      description: 'A 500kW solar farm located in sunny California. This project features high-efficiency bifacial solar panels and smart inverter technology. Expected to generate clean energy for over 150 homes annually. Prime location with optimal sun exposure and minimal shading. Professionally managed with 25-year performance guarantee.',
      location: 'San Diego, CA',
      country: 'United States',
      capacity: 500,
      panelType: 'Bifacial Monocrystalline',
      inverterType: 'SMA Sunny Tripower',
      estimatedAnnualProduction: 850000,
      expectedYield: 12.5,
      fundingTarget: 250000,
      fundingRaised: 175000,
      pricePerToken: 100,
      totalTokens: 2500,
      tokensRemaining: 750,
      tokenSymbol: 'SOLCAL001',
      status: 'FUNDING' as const,
    },
    {
      name: 'Texas Community Solar',
      description: 'Community solar project serving residential areas in Austin, Texas. Features ground-mounted tracking systems that follow the sun throughout the day for maximum efficiency. Low-income community benefit program included. State-of-the-art monitoring and maintenance included.',
      location: 'Austin, TX',
      country: 'United States',
      capacity: 750,
      panelType: 'Single-axis Tracking',
      inverterType: 'Fronius Symo',
      estimatedAnnualProduction: 1350000,
      expectedYield: 14.2,
      fundingTarget: 400000,
      fundingRaised: 280000,
      pricePerToken: 200,
      totalTokens: 2000,
      tokensRemaining: 600,
      tokenSymbol: 'SOLTEX002',
      status: 'FUNDING' as const,
    },
    {
      name: 'Arizona Desert Solar',
      description: 'Large-scale utility solar installation in the Arizona desert. One of the sunniest locations in the United States with over 300 days of sunshine per year. Connected directly to the grid with power purchase agreements in place. Long-term revenue contracts ensure stable returns.',
      location: 'Phoenix, AZ',
      country: 'United States',
      capacity: 1200,
      panelType: 'High-efficiency Monocrystalline',
      inverterType: 'SolarEdge Commercial',
      estimatedAnnualProduction: 2400000,
      expectedYield: 15.0,
      fundingTarget: 600000,
      fundingRaised: 120000,
      pricePerToken: 150,
      totalTokens: 4000,
      tokensRemaining: 3200,
      tokenSymbol: 'SOLAZ003',
      status: 'FUNDING' as const,
    },
    {
      name: 'Florida Rooftop Portfolio',
      description: 'A portfolio of commercial rooftop installations across Florida. Diversified across multiple buildings to reduce risk. Net metering agreements with local utilities. Hurricane-resistant mounting systems ensure durability. Professional O&M included.',
      location: 'Miami, FL',
      country: 'United States',
      capacity: 350,
      panelType: 'Hurricane-rated Panels',
      inverterType: 'Enphase Microinverters',
      estimatedAnnualProduction: 560000,
      expectedYield: 11.8,
      fundingTarget: 175000,
      fundingRaised: 175000,
      pricePerToken: 75,
      totalTokens: 2333,
      tokensRemaining: 0,
      tokenSymbol: 'SOLFL004',
      status: 'FUNDED' as const,
    },
    {
      name: 'Colorado Mountain Solar',
      description: 'High-altitude solar installation with exceptional air clarity and reduced atmospheric interference. Cold climate optimized panels with enhanced performance. Connected to local grid serving mountain communities. Environmental impact study completed.',
      location: 'Denver, CO',
      country: 'United States',
      capacity: 400,
      panelType: 'Cold-climate Optimized',
      inverterType: 'ABB String Inverter',
      estimatedAnnualProduction: 720000,
      expectedYield: 13.5,
      fundingTarget: 200000,
      fundingRaised: 200000,
      pricePerToken: 125,
      totalTokens: 1600,
      tokensRemaining: 0,
      tokenSymbol: 'SOLCO005',
      status: 'ACTIVE' as const,
      startDate: new Date('2024-06-01'),
    },
    {
      name: 'Milestone Demo Project',
      description: 'A demonstration project for milestone-based funding. Funds are released in 5 stages: Equipment, Installation, Grid Connection, Commissioning, and Operational Start.',
      location: 'Antigravity City',
      country: 'Metaverse',
      capacity: 1000,
      panelType: 'Premium Efficiency',
      inverterType: 'Smart Inverter Pro',
      estimatedAnnualProduction: 1500000,
      expectedYield: 15.0,
      fundingTarget: 500000,
      fundingRaised: 0,
      pricePerToken: 100,
      totalTokens: 5000,
      tokensRemaining: 5000,
      tokenSymbol: 'MLSTN001',
      status: 'APPROVED' as const,
      fundingModel: 'MILESTONE_BASED' as const,
    },
  ];

  // Create projects
  for (const projectData of sampleProjects) {
    const existing = await prisma.project.findFirst({
      where: { tokenSymbol: projectData.tokenSymbol }
    });

    if (existing) {
      console.log(`Skipping ${projectData.name} - already exists`);
      continue;
    }

    const project = await prisma.project.create({
      data: {
        installerId: installer.id,
        ...projectData,
      }
    });

    console.log(`Created: ${projectData.name}`);

    // If it's the milestone project, add milestones
    if (projectData.tokenSymbol === 'MLSTN001') {
      console.log('Adding milestones to MLSTN001...');
      const milestones = [
        { name: 'Equipment Procurement', description: 'Panels, inverter purchased', order: 1, releasePercentage: 25, verificationMethod: 'DOCUMENT' as const },
        { name: 'Site Installation', description: 'Physical installation completed', order: 2, releasePercentage: 25, verificationMethod: 'PHOTO' as const },
        { name: 'Grid Connection', description: 'Connected to grid / PPA live', order: 3, releasePercentage: 20, verificationMethod: 'ORACLE' as const },
        { name: 'Commissioning', description: 'Energy production verified', order: 4, releasePercentage: 15, verificationMethod: 'IOT' as const },
        { name: 'Operational Start', description: 'Eligible for yield distribution', order: 5, releasePercentage: 15, verificationMethod: 'DOCUMENT' as const },
      ];

      for (const m of milestones) {
        await prisma.projectMilestone.create({
          data: {
            projectId: project.id,
            releaseAmount: (project.fundingTarget.toNumber() * m.releasePercentage) / 100,
            ...m,
          }
        });
      }
      console.log('✅ Added 5 milestones');
    }
  }

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log(`Created ${sampleProjects.length} sample projects`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
