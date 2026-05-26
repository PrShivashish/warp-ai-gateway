# OpenAI-Compatible API

Warp exposes an OpenAI-compatible endpoint at `/v1/chat/completions`.  
Any SDK that targets the OpenAI API can be pointed at Warp with zero code changes.

---

## OpenAI SDK (Node.js)

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_WARP_KEY",
  baseURL: "https://warp.yourdomain.com/v1",
});

// Non-streaming
const completion = await client.chat.completions.create({
  model: "google/gemini-2.0-flash",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" },
  ],
});

console.log(completion.choices[0].message.content);

// Streaming
const stream = await client.chat.completions.create({
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Tell me a joke" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

---

## Vercel AI SDK

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";

const warp = createOpenAI({
  apiKey: "YOUR_WARP_KEY",
  baseURL: "https://warp.yourdomain.com/v1",
});

// Non-streaming
const { text } = await generateText({
  model: warp("anthropic/claude-sonnet-4-20250514"),
  prompt: "What is the meaning of life?",
});

console.log(text);

// Streaming
const result = streamText({
  model: warp("google/gemini-2.0-flash"),
  prompt: "Write a haiku about TypeScript",
});

for await (const delta of result.textStream) {
  process.stdout.write(delta);
}
```

---

## LangChain

```ts
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "google/gemini-2.0-flash",
  openAIApiKey: "YOUR_WARP_KEY",
  configuration: {
    baseURL: "https://warp.yourdomain.com/v1",
  },
});

const response = await model.invoke(
  "Explain quantum computing in one sentence.",
);
console.log(response.content);
```

---

## cURL

```bash
# Non-streaming
curl https://warp.yourdomain.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_WARP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.0-flash",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Streaming
curl -N https://warp.yourdomain.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_WARP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.0-flash",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

---

## Supported Parameters

| Parameter     | Type    | Required | Notes                         |
| ------------- | ------- | -------- | ----------------------------- |
| `model`       | string  | ✅       | Format: `provider/model-name` |
| `messages`    | array   | ✅       | `role` + `content`            |
| `stream`      | boolean | ❌       | Enable SSE streaming          |
| `temperature` | number  | ❌       | Accepted, currently ignored   |
| `max_tokens`  | number  | ❌       | Accepted, currently ignored   |

Unknown fields (e.g. `top_p`, `frequency_penalty`) are silently ignored.

## Authentication

Use the `Authorization: Bearer <key>` header with your Warp API key.

## Error Format

Errors follow the OpenAI error shape (wire format unchanged):

```json
{
  "error": {
    "message": "Invalid api key",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}
```
