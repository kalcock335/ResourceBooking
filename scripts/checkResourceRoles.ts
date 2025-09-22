import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const resource = await prisma.resource.findUnique({
    where: { name: 'Harry Buckingham' },
    include: {
      roles: { include: { role: true } }
    }
  });
  console.log(JSON.stringify(resource, null, 2));
}

main().finally(() => prisma.$disconnect()); 