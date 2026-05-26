/**
 * normalize-costs.ts — One-off DB Cost Normalization Script
 * ──────────────────────────────────────────────────────────
 * Standardizes ALL ModelProviderMapping rows so that inputTokenCost and
 * outputTokenCost are strictly stored as per-token floating-point values.
 *
 * Classification heuristic:
 *   If inputTokenCost > 0.00001  →  stored as per-1K-token  (divide by 1,000)
 *   If inputTokenCost <= 0.00001 →  already per-token       (no change)
 *   If inputTokenCost == 0       →  explicit free tier       (no change)
 *
 * This script is IDEMPOTENT: re-running it will classify all rows as
 * "already per-token" and skip them safely.
 *
 * Run: bun --env-file=../../apps/api-backend/.env run packages/db/scripts/normalize-costs.ts
 */

import { prisma } from "../index";

const PER_1K_THRESHOLD = 0.00001; // Values above this are per-1K-token format

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Warp — ModelProviderMapping Cost Normalization Script   ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const mappings = await prisma.modelProviderMapping.findMany({
    include: { model: true, provider: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${mappings.length} mapping(s). Analyzing...\n`);

  let correctedCount = 0;
  let skippedCount = 0;

  for (const mapping of mappings) {
    const { id, model, provider, inputTokenCost, outputTokenCost } = mapping;
    const label = `ID=${String(id).padEnd(3)} | ${model.slug.padEnd(35)} | ${provider.name}`;

    if (inputTokenCost === 0 && outputTokenCost === 0) {
      console.log(`  ⬛ SKIP (free)    ${label}  input=0  output=0`);
      skippedCount++;
      continue;
    }

    if (inputTokenCost > PER_1K_THRESHOLD) {
      // This row is in per-1K-token format — convert to per-token
      const newInput = inputTokenCost / 1000;
      const newOutput = outputTokenCost / 1000;

      await prisma.modelProviderMapping.update({
        where: { id },
        data: { inputTokenCost: newInput, outputTokenCost: newOutput },
      });

      console.log(`  ✅ CONVERTED      ${label}`);
      console.log(`     input:  ${inputTokenCost.toExponential(4)} (per-1K) → ${newInput.toExponential(4)} (per-token)`);
      console.log(`     output: ${outputTokenCost.toExponential(4)} (per-1K) → ${newOutput.toExponential(4)} (per-token)`);
      correctedCount++;
    } else {
      console.log(`  🟢 SKIP (ok)      ${label}  input=${inputTokenCost.toExponential(4)}  output=${outputTokenCost.toExponential(4)}`);
      skippedCount++;
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  Normalization complete.`);
  console.log(`  Converted: ${correctedCount} row(s)  |  Already correct: ${skippedCount} row(s)`);
  console.log("══════════════════════════════════════════════════════════\n");

  // Final verification pass — print the resolved state
  console.log("Final state of all ModelProviderMapping costs:\n");
  const final = await prisma.modelProviderMapping.findMany({
    include: { model: true, provider: true },
    orderBy: { id: "asc" },
  });

  const header = "ID  | Model                              | Provider       | $/input-token     | $/output-token";
  console.log(header);
  console.log("-".repeat(header.length));
  for (const m of final) {
    const id = String(m.id).padEnd(3);
    const slug = m.model.slug.padEnd(34);
    const prov = m.provider.name.padEnd(14);
    const inp = m.inputTokenCost.toExponential(6).padEnd(17);
    const out = m.outputTokenCost.toExponential(6);
    console.log(`${id} | ${slug} | ${prov} | ${inp} | ${out}`);
  }
  console.log();
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
