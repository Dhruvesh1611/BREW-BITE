// backend/src/controllers/product.controller.js
const prisma = require('../lib/prisma');
const { z } = require('zod');
const { isPrismaDatabaseUnavailable } = require('../lib/prisma-errors');
const { showcaseCategories, showcaseProducts, showcaseStats } = require('../lib/showcase-data');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/errors/AppError');

// Validation Schemas
const productSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.preprocess((val) => Number(val), z.number().positive()),
    unit: z.string().optional(),
    tax: z.preprocess((val) => Number(val), z.number().min(0)).optional(),
    categoryId: z.string(),
    isAvailable: z.boolean().optional(),
    sendToKitchen: z.boolean().optional(),
    imageUrl: z.string().optional(),
    variants: z.array(z.object({
        name: z.string().min(1, 'Variant name cannot be empty'),
        extraPrice: z.preprocess((val) => Number(val), z.number().min(0))
    })).optional()
});

const categorySchema = z.object({
    name: z.string().min(1)
});

// Category Controllers
exports.createCategory = catchAsync(async (req, res) => {
    const { name } = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data: { name } });
    
    res.status(201).json({
        success: true,
        data: category
    });
});

exports.getCategories = catchAsync(async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            include: { _count: { select: { products: true } } }
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        if (isPrismaDatabaseUnavailable(error)) {
            return res.json({ success: true, data: showcaseCategories });
        }
        return next(error);
    }
});

exports.deleteCategory = catchAsync(async (req, res) => {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: "Category deleted" });
});

exports.getProductsStats = catchAsync(async (req, res, next) => {
    try {
        const [total, available, kitchen, avgPriceData] = await Promise.all([
            prisma.product.count(),
            prisma.product.count({ where: { isAvailable: true } }),
            prisma.product.count({ where: { sendToKitchen: true } }),
            prisma.product.aggregate({
                _avg: { price: true }
            })
        ]);
        res.json({
            success: true,
            data: {
                total,
                available,
                kitchen,
                avgPrice: Number(avgPriceData._avg.price || 0)
            }
        });
    } catch (error) {
        if (isPrismaDatabaseUnavailable(error)) {
            return res.json({ success: true, data: showcaseStats });
        }
        return next(error);
    }
});

// Product Controllers
exports.createProduct = catchAsync(async (req, res) => {
    const data = productSchema.parse(req.body);
    const { variants, ...productData } = data;

    const cleanVariants = variants?.map(v => ({
        name: v.name,
        extraPrice: Number(v.extraPrice) || 0
    }));

    const product = await prisma.product.create({
        data: {
            ...productData,
            variants: cleanVariants && cleanVariants.length > 0 ? {
                create: cleanVariants
            } : undefined
        },
        include: { variants: true, category: true }
    });

    res.status(201).json({
        success: true,
        data: product
    });
});

exports.getProducts = catchAsync(async (req, res, next) => {
    try {
        const { categoryId, page, limit, search } = req.query;
        const filter = {};
        if (categoryId && categoryId !== 'all') filter.categoryId = categoryId;
        if (search) {
            filter.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (page || limit) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;

            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where: filter,
                    include: { variants: true, category: true },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limitNum
                }),
                prisma.product.count({ where: filter })
            ]);

            return res.json({
                success: true,
                data: products,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
        }

        const products = await prisma.product.findMany({
            where: filter,
            include: { variants: true, category: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: products });
    } catch (error) {
        if (isPrismaDatabaseUnavailable(error)) {
            const { categoryId, page, limit, search } = req.query;
            let products = showcaseProducts;

            if (categoryId && categoryId !== 'all') {
                products = products.filter((product) => product.category?.id === categoryId || product.category?.name === categoryId);
            }

            if (search) {
                const normalizedSearch = String(search).toLowerCase();
                products = products.filter((product) =>
                    product.name.toLowerCase().includes(normalizedSearch) ||
                    (product.description || '').toLowerCase().includes(normalizedSearch)
                );
            }

            if (page || limit) {
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 20;
                const skip = (pageNum - 1) * limitNum;
                const pagedProducts = products.slice(skip, skip + limitNum);

                return res.json({
                    success: true,
                    data: pagedProducts,
                    pagination: {
                        total: products.length,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(products.length / limitNum)
                    }
                });
            }

            return res.json({ success: true, data: products });
        }
        return next(error);
    }
});

exports.updateProduct = catchAsync(async (req, res) => {
    const { id } = req.params;
    const data = productSchema.partial().parse(req.body);
    const { variants, ...productData } = data;

    const cleanVariants = variants?.map(v => ({
        name: v.name,
        extraPrice: Number(v.extraPrice) || 0
    }));

    const product = await prisma.$transaction(async (tx) => {
        // If updating a non-existent product, tx.product.update will throw P2025
        // which our prismaErrorMapper catches automatically.
        await tx.product.update({
            where: { id },
            data: productData
        });

        if (cleanVariants) {
            await tx.variant.deleteMany({ where: { productId: id } });
            if (cleanVariants.length > 0) {
                await tx.variant.createMany({
                    data: cleanVariants.map(v => ({ ...v, productId: id }))
                });
            }
        }

        return tx.product.findUnique({
            where: { id },
            include: { variants: true, category: true }
        });
    });

    res.json({ success: true, data: product });
});

exports.deleteProduct = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Prisma errors (like P2003 Foreign Key constraint if it's attached to an order) 
    // are forwarded to the global handler and properly formatted.
    await prisma.$transaction([
        prisma.variant.deleteMany({ where: { productId: id } }),
        prisma.product.delete({ where: { id } })
    ]);

    res.json({ success: true, message: "Product deleted successfully" });
});
