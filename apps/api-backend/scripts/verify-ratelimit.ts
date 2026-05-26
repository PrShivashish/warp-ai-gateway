import { prisma } from "db";
import { spawn } from "bun";

async function main() {
  console.log("🚀 Starting Rate Limit Verification...");

  // Get a valid API key for the test
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: { disabled: false, deleted: false, user: { walletBalance: { gt: 0 } } },
    include: { user: true }
  });

  if (!apiKeyRecord) {
    throw new Error("No valid API key found with positive wallet balance for testing.");
  }
  const testApiKey = apiKeyRecord.apiKey;
  console.log(`✅ Using Test API Key: ${testApiKey.slice(0, 8)}...`);

  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(testApiKey);
  const keyHash = hasher.digest("hex");
  
  // Flush previous rate limits to ensure a clean test
  const { redisQueue } = await import("cache");
  if (redisQueue.client) {
    await redisQueue.client.del(`warp:ratelimit:rpm:${keyHash}`);
    await redisQueue.client.del(`warp:ratelimit:tpm:${keyHash}`);
    console.log("✅ Flushed previous rate limits for test key.");
  }

  // Spawning Ephemeral Server
  console.log("\n[1] Spawning Ephemeral Server (Port 4010)...");
  const serverProcess = spawn({
    cmd: ["bun", "run", "src/index.ts"],
    cwd: "./",
    env: {
      ...process.env,
      PORT: "4010"
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  try {
    // Wait for server boot
    console.log("⏳ Waiting 2 seconds for server to boot...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("\n[2] Launching Spam Attack (65 requests)...");
    let rateLimitedResponse: any = null;
    let rateLimitedStatus = 0;
    
    // Fire 65 requests sequentially (or parallel, but sequential is easier to trace)
    for (let i = 1; i <= 65; i++) {
      const response = await fetch("http://localhost:4010/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testApiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages: [{ role: "user", content: "hello" }]
        })
      });

      if (response.status === 429) {
        console.log(`❌ Request ${i}: Blocked by Rate Limiter (429)`);
        rateLimitedStatus = response.status;
        rateLimitedResponse = await response.json();
        break; // Stop after hitting the limit
      } else if (response.status !== 200) {
        console.warn(`⚠️ Request ${i}: Unexpected status ${response.status}`);
      } else {
        if (i % 10 === 0) console.log(`✅ Request ${i}: Passed`);
      }
    }

    // Spec Audit
    console.log("\n[3] Performing Spec Audit...");
    if (rateLimitedStatus !== 429) {
      throw new Error(`Expected rate limit to hit (429), but got ${rateLimitedStatus}`);
    }
    
    console.log("Response Payload:", JSON.stringify(rateLimitedResponse, null, 2));

    if (
      !rateLimitedResponse ||
      !rateLimitedResponse.error ||
      rateLimitedResponse.error.message !== "Rate limit exceeded." ||
      rateLimitedResponse.error.type !== "requests" ||
      rateLimitedResponse.error.code !== "429"
    ) {
      throw new Error("Payload did not exactly match OpenAI 429 specification.");
    }
    console.log("✅ Spec Audit Passed: 429 payload matches exactly.");

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");

  } finally {
    // Teardown
    console.log("\n[4] Teardown: Terminating Ephemeral Server...");
    serverProcess.kill();
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
