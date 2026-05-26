import { prisma } from "db";
import { spawn } from "bun";

async function main() {
  console.log("🚀 Starting Isolated Live-Fire Failover Verification...");

  // 1. Database Prep
  console.log("\n[1] Preparing Database...");
  
  // Find target models
  const geminiModel = await prisma.model.findFirst({ where: { slug: "google/gemini-2.0-flash" } });
  const groqModel = await prisma.model.findFirst({ where: { slug: "groq/llama-3.3-70b-versatile" } });
  
  if (!geminiModel || !groqModel) {
    throw new Error(`Models not found. Gemini: ${!!geminiModel}, Groq: ${!!groqModel}`);
  }

  // Find their mappings
  const geminiMapping = await prisma.modelProviderMapping.findFirst({ where: { modelId: geminiModel.id } });
  const groqMapping = await prisma.modelProviderMapping.findFirst({ where: { modelId: groqModel.id } });

  if (!geminiMapping || !groqMapping) {
    throw new Error("Provider mappings not found for the models.");
  }

  // Link Gemini to Groq as fallback
  await prisma.modelProviderMapping.update({
    where: { id: geminiMapping.id },
    data: { fallbackMappingId: groqMapping.id }
  });
  console.log(`✅ Linked Gemini mapping (${geminiMapping.id}) to fallback Groq mapping (${groqMapping.id})`);

  // Get a valid API key for the test
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: { disabled: false, deleted: false, user: { walletBalance: { gt: 0 } } },
    include: { user: true }
  });

  if (!apiKeyRecord) {
    throw new Error("No valid API key found with positive wallet balance for testing.");
  }
  const testApiKey = apiKeyRecord.apiKey;
  console.log(`✅ Using Test API Key for User ID: ${apiKeyRecord.user.id}`);

  // 2. Ephemeral Server Spawn
  console.log("\n[2] Spawning Ephemeral Server...");
  const serverProcess = spawn({
    cmd: ["bun", "run", "src/index.ts"],
    cwd: "./",
    env: {
      ...process.env,
      PORT: "4005",
      GEMINI_API_KEY: "POISON_TEST_KEY", // The Poison Injection
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  try {
    // Wait for server boot
    console.log("⏳ Waiting 2 seconds for server to boot...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. The Attack
    console.log("\n[3] Launching The Attack (Requesting Gemini)...");
    const startTime = Date.now();
    const response = await fetch("http://localhost:4005/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testApiKey}`
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [{ role: "user", content: "Say the word 'Failover' and nothing else." }]
      })
    });

    const responseBody = await response.json();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Headers: x-warp-failover = ${response.headers.get("x-warp-failover")}`);
    console.log(`Response Body Model: ${responseBody.model}`);

    // 4. Header Audit
    console.log("\n[4] Performing Header Audit...");
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}. Body: ${JSON.stringify(responseBody)}`);
    }
    if (response.headers.get("x-warp-failover") !== "true") {
      throw new Error("Expected x-warp-failover header to be 'true'.");
    }
    console.log("✅ Header Audit Passed: Failover intercepted and handled correctly.");

    // 5. The Ledger Audit
    console.log("\n[5] Performing Ledger Audit (Waiting 12s for Redis queue to drain)...");
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Search for the latest usage metric for this user
    const latestMetric = await prisma.usageMetric.findFirst({
      where: { userId: apiKeyRecord.user.id },
      orderBy: { createdAt: "desc" }
    });

    if (!latestMetric) {
      throw new Error("No usage metric logged.");
    }

    // Since we injected the poison key and requested Gemini, the fallback should have fired and billed Groq.
    console.log(`Latest Metric Logged Provider: ${latestMetric.provider}`);
    console.log(`Latest Metric Logged Model: ${latestMetric.model}`);
    
    if (latestMetric.provider.toLowerCase() !== "warp native") {
      throw new Error(`Ledger Audit Failed: Expected provider 'Warp Native', got '${latestMetric.provider}'`);
    }
    console.log("✅ Ledger Audit Passed: Fallback provider billed correctly.");

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");

  } finally {
    // 6. Teardown
    console.log("\n[6] Teardown: Terminating Ephemeral Server...");
    serverProcess.kill();
    
    // Cleanup DB Mapping just to be neat
    await prisma.modelProviderMapping.update({
      where: { id: geminiMapping.id },
      data: { fallbackMappingId: null }
    });
    console.log("✅ Database mapping restored.");
    
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
