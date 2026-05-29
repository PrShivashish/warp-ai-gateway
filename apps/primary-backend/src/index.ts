import { app } from "./app";
import { startTelemetryWorker } from "./workers/telemetry-worker";

app.listen(3000);


// Start the async telemetry flush worker — drains warp:telemetry:queue every 10s
// and commits batched UsageMetric + WalletTransaction records to PostgreSQL.
startTelemetryWorker();