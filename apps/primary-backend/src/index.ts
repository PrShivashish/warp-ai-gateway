import { app } from "./app";
import { cors } from '@elysiajs/cors';
import { startTelemetryWorker } from "./workers/telemetry-worker";

app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
})).listen(3000);

// Start the async telemetry flush worker — drains warp:telemetry:queue every 10s
// and commits batched UsageMetric + WalletTransaction records to PostgreSQL.
startTelemetryWorker();