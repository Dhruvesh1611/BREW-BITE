const seedProducts = require('../../prisma/data/seed-products');

const categoryNames = [...new Set(seedProducts.map((product) => product.category))];

const showcaseCategories = categoryNames.map((name, index) => ({
  id: `showcase-category-${index + 1}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
}));

const categoryIndex = new Map(showcaseCategories.map((category) => [category.name, category]));

const showcaseProducts = seedProducts.map((product, index) => {
  const category = categoryIndex.get(product.category) || null;
  return {
    id: `showcase-product-${index + 1}`,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    unit: product.unit,
    tax: 0,
    isAvailable: true,
    sendToKitchen: product.category === 'Main Course' || product.category === 'Specials',
    imageUrl: product.imageUrl,
    categoryId: category?.id || null,
    category,
    variants: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
});

const showcaseStats = showcaseProducts.reduce(
  (stats, product) => {
    stats.total += 1;
    if (product.isAvailable) {
      stats.available += 1;
    }
    if (product.sendToKitchen) {
      stats.kitchen += 1;
    }
    stats.priceSum += Number(product.price) || 0;
    return stats;
  },
  { total: 0, available: 0, kitchen: 0, priceSum: 0 }
);

module.exports = {
  showcaseCategories: showcaseCategories.map((category) => ({
    ...category,
    _count: {
      products: showcaseProducts.filter((product) => product.category?.id === category.id).length,
    },
  })),
  showcaseProducts,
  showcaseStats: {
    total: showcaseStats.total,
    available: showcaseStats.available,
    kitchen: showcaseStats.kitchen,
    avgPrice: showcaseStats.total ? Number((showcaseStats.priceSum / showcaseStats.total).toFixed(2)) : 0,
  },
};