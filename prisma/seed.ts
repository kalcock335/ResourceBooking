import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const prisma = new PrismaClient();

const roleOptions = [
  { name: 'admin', label: 'Admin', isAdmin: true, isPlannable: false },
  { name: 'Consultant', label: 'Consultant', isAdmin: false, isPlannable: true },
  { name: 'Developer', label: 'Developer', isAdmin: false, isPlannable: true },
  { name: 'Project Manager', label: 'Project Manager', isAdmin: false, isPlannable: true },
  { name: 'QA', label: 'QA', isAdmin: false, isPlannable: true },
  { name: 'Designer', label: 'Designer', isAdmin: false, isPlannable: true },
  { name: 'Solution Lead', label: 'Solution Lead', isAdmin: false, isPlannable: true },
  { name: 'Other', label: 'Other', isAdmin: false, isPlannable: true },
];

// Helper function to parse UK date format (dd/mm/yy) to ISO date
function parseUKDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/');
  // Convert 2-digit year to 4-digit year (assuming 20xx)
  const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
  return new Date(fullYear, parseInt(month) - 1, parseInt(day));
}

// Helper function to get the start of the week (Monday)
function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
}

// Helper function to normalize work type names
function normalizeWorkType(typeOfWork: string): string {
  if (!typeOfWork) return '';
  const normalized = typeOfWork.trim().toLowerCase();
  // Map common variations to standard names
  const workTypeMap: Record<string, string> = {
    'project': 'Project',
    'projects': 'Project',
    'presales': 'PreSales',
    'pre-sales': 'PreSales',
    'pre sales': 'PreSales',
    'internal': 'Internal',
    'holiday': 'Holiday',
    'holidays': 'Holiday',
    'vacation': 'Holiday',
    'sick': 'Holiday',
    'training': 'Internal',
    'admin': 'Internal',
    'meetings': 'Internal',
    'l&d': 'L&D',
    'learning & development': 'L&D',
    'unavailable': 'Unavailable',
    'support': 'Support',
    'crm & cx': 'Support',
  };
  return workTypeMap[normalized] || typeOfWork.trim();
}

const SKILLS_LIST = [
  'SAP S/4HANA Service (private)',
  'SAP S4 Public Cloud - Sales',
  'SAP S4 Public Cloud - Service',
  'SAP Commerce Cloud',
  'SAP Marketing Cloud - no longer sold by SAP',
  'SAP Sales Cloud v1 (C4C) - SAP will stop selling in 2025',
  'SAP Service Cloud v1 (C4C) - SAP will stop selling in 2025',
  'SAP Sales Cloud V2',
  'SAP Service Cloud V2',
  'SAP C4C Development (SDK)',
  'SAP Customer Data Platform',
  'SAP Customer Data Cloud',
  'Qualtrics (not SAP)',
  'Emarsys',
  'SAP Field Service Management',
  'SAP Enterprise Service Management',
  'SAP BTP Build Apps (Build, Process Automation, Workzone)',
  'SAP BTP Integration Suite (CPI, Event Mesh, API Mgmt etc)',
  'SAP BTP Dev (BAS, Kyma etc)',
  'Other Non-SAP (Salesforce etc)',
  'Industry Skills',
  'AI',
  'Joule Studio',
];

async function seedSkills() {
  for (const name of SKILLS_LIST) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Seeded ${SKILLS_LIST.length} skills.`);
}

const initialResources = [
  { name: 'Priyanka Aggarwal', email: 'Priyanka.a@prezien.com', roles: ['Consultant'], isActive: true },
  { name: 'Tom Kelly', email: 'tom.kelly@prezien.com', roles: ['admin'], isActive: true },
  { name: 'Tan Varma', email: 'tv@prezien.com', roles: ['admin'], isActive: true },
  { name: 'John Hunter', email: 'John.hunter@prezien.com', roles: ['Project Manager'], isActive: true },
  { name: 'Mr Kevin Alcock', email: 'Kevin.alcock@prezien.com', roles: ['admin', 'Solution Lead'], isActive: true },
  { name: 'Mr Andrew Griffin', email: 'Andrew.griffin@prezien.com', roles: ['Consultant'], isActive: true },
  { name: 'Saurabh Sharma', email: 'saurabh.sharma@prezien.com', roles: ['Developer'], isActive: true },
  { name: 'Harry Buckingham', email: 'harry.b@prezien.com', roles: ['Consultant'], isActive: true },
  { name: 'Admin User', email: 'admin@example.com', roles: ['admin'], isActive: true, jobTitle: 'Administrator', password: '$2b$10$EL7QEE80dSqKFn...' },
];

async function seedInitialResources() {
  for (const resource of initialResources) {
    const created = await prisma.resource.upsert({
      where: { email: resource.email },
      update: {},
      create: {
        name: resource.name,
        email: resource.email,
        isActive: resource.isActive,
        jobTitle: resource.jobTitle || null,
        password: resource.password || null,
      },
    });
    for (const roleName of resource.roles) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) {
        await prisma.resourceRole.upsert({
          where: { resourceId_roleId: { resourceId: created.id, roleId: role.id } },
          update: {},
          create: { resourceId: created.id, roleId: role.id },
        });
      }
    }
  }
  console.log(`✅ Seeded ${initialResources.length} initial resources with roles.`);
}

async function main() {
  console.log('🌱 Starting database seed...');
  // Seed roles
  for (const role of roleOptions) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // Seed resources (example, update as needed)
  const resources = [
    // ... your resource objects, each with a roles: [roleName, ...]
    // Example:
    { name: 'Admin User', email: 'admin@example.com', password: 'hashed', isActive: true, jobTitle: null, roles: ['admin'] },
    // ...
  ];

  for (const resource of resources) {
    const created = await prisma.resource.upsert({
      where: { email: resource.email },
      update: {},
      create: {
        name: resource.name,
        email: resource.email,
        password: resource.password,
        isActive: resource.isActive,
        jobTitle: resource.jobTitle,
      },
    });
    for (const roleName of resource.roles) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) {
        await prisma.resourceRole.upsert({
          where: { resourceId_roleId: { resourceId: created.id, roleId: role.id } },
          update: {},
          create: { resourceId: created.id, roleId: role.id },
        });
      }
    }
  }
  
  try {
    // Read the Excel file
    const excelPath = path.join(process.cwd(), 'PrezienResourcing.xlsx');
    console.log(`📖 Reading Excel file from: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = '2025';
    
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Sheet '${sheetName}' not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    console.log(`📊 Found ${data.length} rows in sheet '${sheetName}'`);
    
    if (data.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }
    
    const headers = data[0] as string[];
    const rows = data.slice(1);
    
    console.log('📋 Headers:', headers);
    
    // Find column indices - make more flexible
    const resourceColIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('resource'));
    const typeOfWorkColIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('type') && h?.toString().toLowerCase().includes('work'));
    const descriptionColIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('description'));
    const customerColIndex = headers.findIndex(h => h?.toString().toLowerCase().includes('customer'));
    
    if (resourceColIndex === -1) throw new Error('Resource column not found');
    if (descriptionColIndex === -1) throw new Error('Description column not found');
    if (customerColIndex === -1) throw new Error('Customer column not found');
    
    console.log(`📍 Column indices - Resource: ${resourceColIndex}, Type: ${typeOfWorkColIndex}, Description: ${descriptionColIndex}, Customer: ${customerColIndex}`);
    
    // Find date columns (columns with date-like headers)
    const dateColumns: { index: number; date: Date; weekStart: Date }[] = [];
    
    headers.forEach((header, index) => {
      if (header && typeof header === 'string') {
        // Check if header looks like a date (dd/mm/yy format)
        const dateMatch = header.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
        if (dateMatch) {
          try {
            const date = parseUKDate(header);
            const weekStart = getWeekStart(new Date(date));
            dateColumns.push({ index, date, weekStart });
          } catch (error) {
            console.warn(`⚠️ Could not parse date from header: ${header}`);
          }
        }
      }
    });
    
    console.log(`📅 Found ${dateColumns.length} date columns:`, dateColumns.map(dc => `${headers[dc.index]} -> ${dc.weekStart.toISOString().split('T')[0]}`));
    
    // Track all unique work types in the sheet
    const uniqueWorkTypes = new Set<string>();
    
    for (const row of rows) {
      let typeOfWork = row[typeOfWorkColIndex]?.toString()?.trim();
      if (!typeOfWork) continue;
      const normalizedWorkType = normalizeWorkType(typeOfWork);
      uniqueWorkTypes.add(normalizedWorkType);
    }

    // Upsert all unique work types before processing allocations
    for (const workTypeName of uniqueWorkTypes) {
      await prisma.workType.upsert({
        where: { name: workTypeName },
        update: {},
        create: {
          name: workTypeName,
          description: `Work type: ${workTypeName}`,
          isActive: true
        }
      });
    }

    // Now process each row for allocations as before
    let processedRows = 0;
    let createdResources = 0;
    let createdProjects = 0;
    let createdWorkTypes = uniqueWorkTypes.size;
    let createdAllocations = 0;
    const uniqueResources = new Set<string>();
    let lastResourceName = '';
    let lastTypeOfWork = '';
    uniqueResources.clear(); // reset for actual processed rows
    
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      
      let resourceName = row[resourceColIndex]?.toString()?.trim();
      let typeOfWork = row[typeOfWorkColIndex]?.toString()?.trim();
      const description = row[descriptionColIndex]?.toString()?.trim();
      const customer = row[customerColIndex]?.toString()?.trim();
      
      // Carry forward last non-empty value for resource and typeOfWork
      if (!resourceName) resourceName = lastResourceName;
      else lastResourceName = resourceName;
      if (!typeOfWork) typeOfWork = lastTypeOfWork;
      else lastTypeOfWork = typeOfWork;
      
      // Track unique values
      if (resourceName) uniqueResources.add(resourceName);
      
      // Skip summary rows: only process if both typeOfWork and description are present
      if (!resourceName || !typeOfWork || !description) {
        console.warn(`⚠️ Skipping summary or incomplete row:`, row);
        continue;
      }
      
      // Normalize resource name (remove extra spaces, consistent casing)
      const normalizedResourceName = resourceName.replace(/\s+/g, ' ').trim();
      // Generate or use email
      let resourceEmail = row[resourceColIndex + 1]?.toString()?.trim(); // Try to get email from next column if present
      if (!resourceEmail) {
        resourceEmail = normalizedResourceName.replace(/\s+/g, '').toLowerCase() + '@demo.local';
      }
      
      // Check for duplicate name with different email
      const existingByName = await prisma.resource.findUnique({ where: { name: normalizedResourceName } });
      if (existingByName && existingByName.email !== resourceEmail) {
        console.warn(`⚠️ Skipping resource with duplicate name but different email: ${normalizedResourceName} (${resourceEmail})`);
        continue;
      }
      // 1. Create or upsert Resource
      const createdResource = await prisma.resource.upsert({
        where: { email: resourceEmail },
        update: {},
        create: {
          name: normalizedResourceName,
          email: resourceEmail,
          isActive: true,
        },
      });
      // Assign default role if none specified
      const defaultRoleName = 'Developer';
      const roleNames = [defaultRoleName];
      for (const roleName of roleNames) {
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (role) {
          await prisma.resourceRole.upsert({
            where: { resourceId_roleId: { resourceId: createdResource.id, roleId: role.id } },
            update: {},
            create: { resourceId: createdResource.id, roleId: role.id },
          });
        }
      }
      
      if (createdResource.createdAt.getTime() === createdResource.updatedAt.getTime()) {
        createdResources++;
      }
      
      // 2. Create or upsert WorkType
      const normalizedWorkType = normalizeWorkType(typeOfWork);
      const workType = await prisma.workType.upsert({
        where: { name: normalizedWorkType },
        update: {},
        create: {
          name: normalizedWorkType,
          description: `Work type: ${normalizedWorkType}`,
          isActive: true
        }
      });
      
      if (workType.createdAt.getTime() === workType.updatedAt.getTime()) {
        createdWorkTypes++;
      }
      
      // 3. Create or upsert Project (only for non-holiday/non-internal work)
      let projectId: string | null = null;
      
      if (normalizedWorkType !== 'Holiday' && normalizedWorkType !== 'Internal' && description) {
        const projectName = description;
        const project = await prisma.project.upsert({
          where: { name: projectName },
          update: {
            customer: customer || null
          },
          create: {
            name: projectName,
            customer: customer || null,
            description: description,
            isActive: true
          }
        });
        
        if (project.createdAt.getTime() === project.updatedAt.getTime()) {
          createdProjects++;
        }
        
        projectId = project.id;
      }
      
      // 4. Create Allocations for each date column with a value
      for (const dateCol of dateColumns) {
        const value = row[dateCol.index];
        
        // Skip if value is null, undefined, empty string, or zero
        if (value === null || value === undefined || value === '' || value === 0) {
          continue;
        }
        
        // Convert to number
        const daysAllocated = parseFloat(value.toString());
        
        if (isNaN(daysAllocated) || daysAllocated <= 0) {
          continue;
        }
        
        // Create allocation
        try {
          // Find existing allocation with same resourceId, projectId, workTypeId, and weekStart
          const existingAllocation = await prisma.allocation.findFirst({
            where: {
              resourceId: createdResource.id,
              projectId: projectId,
              workTypeId: workType.id,
              weekStart: dateCol.weekStart
            }
          });

          if (existingAllocation) {
            await prisma.allocation.update({
              where: { id: existingAllocation.id },
              data: { days: daysAllocated }
            });
          } else {
            await prisma.allocation.create({
              data: {
                resourceId: createdResource.id,
                projectId: projectId,
                workTypeId: workType.id,
                weekStart: dateCol.weekStart,
                days: daysAllocated
              }
            });
          }
          createdAllocations++;
        } catch (error) {
          console.error(`❌ Error creating allocation for ${resourceName} on ${dateCol.weekStart.toISOString().split('T')[0]}:`, error);
        }
      }
      
      processedRows++;
      
      if (processedRows % 10 === 0) {
        console.log(`📈 Processed ${processedRows} rows...`);
      }
    }
    
    // Seed default admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const adminRole = 'admin';
    const hashed = await bcrypt.hash(adminPassword, 10);
    console.log('DEBUG: Admin password to hash:', adminPassword);
    console.log('DEBUG: Generated bcrypt hash:', hashed);
    const existingAdmin = await prisma.resource.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      await prisma.resource.create({
        data: {
          name: 'Admin User',
          email: adminEmail,
          password: hashed,
          isActive: true,
          jobTitle: 'Administrator',
        },
      });
      console.log('✅ Seeded default admin user: admin@example.com / admin123');
    } else {
      await prisma.resource.update({
        where: { email: adminEmail },
        data: {
          password: hashed,
          isActive: true,
          jobTitle: 'Administrator',
        },
      });
      console.log('🔄 Reset admin user password to: admin@example.com / admin123');
    }

    await seedSkills();
    
    console.log('\n✅ Seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Processed rows: ${processedRows}`);
    console.log(`   - New resources created: ${createdResources}`);
    console.log(`   - New work types created: ${createdWorkTypes}`);
    console.log(`   - New projects created: ${createdProjects}`);
    console.log(`   - Allocations created/updated: ${createdAllocations}`);
    console.log('\n🔎 Unique resources found:', Array.from(uniqueResources));
    console.log('🔎 Unique work types found:', Array.from(uniqueWorkTypes));
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  }); 