import { prisma } from "./index";

async function main() {
    console.log("Seeding initial data...");

    // 1. Create a Company
    const google = await prisma.company.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: "Google",
            website: "https://google.com",
        },
    });

    const openai = await prisma.company.upsert({
        where: { id: 2 },
        update: {},
        create: {
            id: 2,
            name: "OpenAI",
            website: "https://openai.com",
        },
    });

    // 2. Create Models
    const gemini = await prisma.model.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: "Gemini 2.0 Flash",
            slug: "google/gemini-2.0-flash",
            companyId: google.id,
        },
    });

    const gpt4 = await prisma.model.upsert({
        where: { id: 2 },
        update: {},
        create: {
            id: 2,
            name: "GPT-4o",
            slug: "openai/gpt-4o",
            companyId: openai.id,
        },
    });

    // 3. Create a Provider
    const warpProvider = await prisma.provider.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: "Warp Native",
            website: "http://localhost:4000",
        },
    });

    // 4. Map Models to Providers
    await prisma.modelProviderMapping.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            modelId: gemini.id,
            providerId: warpProvider.id,
            inputTokenCost: 0,
            outputTokenCost: 0,
        },
    });

    await prisma.modelProviderMapping.upsert({
        where: { id: 2 },
        update: {},
        create: {
            id: 2,
            modelId: gpt4.id,
            providerId: warpProvider.id,
            inputTokenCost: 0,
            outputTokenCost: 0,
        },
    });

    // 5. Create a Default Admin User
    // Note: In a real app, password should be hashed. Using plain text "admin" for now if auth is simple, 
    // but better to match the app's hash service if I can find it.
    // For local dev, let's just create a user "admin@warp.local" with password "admin"
    await prisma.user.upsert({
        where: { email: "admin@warp.local" },
        update: {},
        create: {
            email: "admin@warp.local",
            password: "admin", // User should change this
            credits: 100000,
            walletBalance: 1000.0,
        },
    });

    console.log("Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        // prisma.$disconnect();
    });
