import { prisma } from "./index";

async function main() {
    console.log("Seeding live models and providers...");

    // 1. Create/Update Groq Company
    const groq = await prisma.company.upsert({
        where: { id: 3 },
        update: {},
        create: {
            id: 3,
            name: "Groq",
            website: "https://groq.com",
        },
    });

    const google = await prisma.company.findFirst({ where: { name: "Google" } });

    // 2. Create Live Models
    const llama3 = await prisma.model.upsert({
        where: { id: 101 },
        update: { slug: "groq/llama-3.3-70b-versatile", available: true },
        create: {
            id: 101,
            name: "Llama 3.3 70B (Groq)",
            slug: "groq/llama-3.3-70b-versatile",
            available: true,
            companyId: groq.id,
        },
    });

    // Mark Gemini 2.0 Flash as available
    await prisma.model.updateMany({
        where: { slug: "google/gemini-2.0-flash" },
        data: { available: true }
    });

    const llama8b = await prisma.model.upsert({
        where: { id: 102 },
        update: { slug: "groq/llama-3.1-8b-instant", name: "Llama 3.1 8B (Groq)" },
        create: {
            id: 102,
            name: "Llama 3.1 8B (Groq)",
            slug: "groq/llama-3.1-8b-instant",
            companyId: groq.id,
        },
    });

    // 3. Map to Warp Provider with Costs
    // inputTokenCost and outputTokenCost are likely per 1000 tokens in this schema's logic 
    // or adjusted for wallet balance (1.0 = $1.00). 
    // Let's use cost per 1M tokens scaled down to 1 token unit.

    const warpProvider = await prisma.provider.findFirst({ where: { name: "Warp Native" } });
    if (!warpProvider) throw new Error("Warp Native provider not found. Run main seed first.");

    // Llama 3.3 70B: ~$0.59 per 1M input, $0.79 per 1M output
    await prisma.modelProviderMapping.upsert({
        where: { id: 101 },
        update: { inputTokenCost: 0.00000059, outputTokenCost: 0.00000079 },
        create: {
            id: 101,
            modelId: llama3.id,
            providerId: warpProvider.id,
            inputTokenCost: 0.00000059,
            outputTokenCost: 0.00000079,
        },
    });

    // Llama 3.1 8B: ~$0.05 per 1M input, $0.08 per 1M output
    await prisma.modelProviderMapping.upsert({
        where: { id: 102 },
        update: { inputTokenCost: 0.00000005, outputTokenCost: 0.00000008 },
        create: {
            id: 102,
            modelId: llama8b.id,
            providerId: warpProvider.id,
            inputTokenCost: 0.00000005,
            outputTokenCost: 0.00000008,
        },
    });

    // Update Gemini 2.0 Flash cost if it exists (Id 1)
    await prisma.modelProviderMapping.updateMany({
        where: { id: 1 },
        data: {
            inputTokenCost: 0.0000001,  // $0.10 per 1M
            outputTokenCost: 0.0000004, // $0.40 per 1M
        }
    });

    console.log("Live model seeding complete! Gateway is now armed.");
}

main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
