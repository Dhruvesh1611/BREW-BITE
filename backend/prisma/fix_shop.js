const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixShop() {
  const admin = await prisma.user.findUnique({ where: { email: 'dhruveshshyara33@gmail.com' } });
  
  if (!admin) {
    console.log("Admin not found.");
    return;
  }

  let shop = await prisma.shop.findUnique({ where: { adminId: admin.id } });

  if (!shop) {
    console.log("Creating Shop for Admin...");
    shop = await prisma.shop.create({
      data: {
        name: 'Brew & Bite Smart Point',
        slug: 'brew-and-bite-smart-point',
        adminId: admin.id,
      }
    });
  }

  console.log("Updating users with shopId...");
  await prisma.user.updateMany({
    data: { shopId: shop.id }
  });

  console.log("Fixed!");
}

fixShop()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
