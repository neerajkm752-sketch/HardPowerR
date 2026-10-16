const SYSTEM_PROMPT = `You are Index AI Analyst, a geopolitical analyst for the Hard Power Index. Explain rankings based only on military, GDP, industry, trade, energy, nuclear capability, strategic influence, logistics, and currency power. Do not mention quality of life, health, happiness, or lifestyle. Keep answers logical, realistic, analytical, and concise. Clearly state that the data and index are approximate.`;

function messagesFor(question, snapshot) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Current ranking snapshot: ${snapshot}.\n\nQuestion: ${question}` }
  ];
}

function textFromOpenAI(body) {
  return body?.choices?.[0]?.message?.content?.trim() || "";
}

async function postJson(url, { headers, body, timeoutMs = 25000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || data.error || `HTTP ${response.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function askOpenAI(question, snapshot) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const data = await postJson("https://api.openai.com/v1/chat/completions", {
    headers: { Authorization: `Bearer ${key}` },
    body: {
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.3,
      messages: messagesFor(question, snapshot)
    }
  });
  const answer = textFromOpenAI(data);
  return answer ? { answer, mode: "openai" } : null;
}

async function askGemini(question, snapshot) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      body: {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Current ranking snapshot: ${snapshot}.\n\nQuestion: ${question}` }] }]
      }
    }
  );
  const answer = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("").trim();
  return answer ? { answer, mode: "gemini" } : null;
}

async function askGroq(question, snapshot) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const data = await postJson("https://api.groq.com/openai/v1/chat/completions", {
    headers: { Authorization: `Bearer ${key}` },
    body: {
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.3,
      messages: messagesFor(question, snapshot)
    }
  });
  const answer = textFromOpenAI(data);
  return answer ? { answer, mode: "groq" } : null;
}

async function askPollinations(question, snapshot) {
  const data = await postJson("https://text.pollinations.ai/openai", {
    body: {
      model: process.env.POLLINATIONS_MODEL || "openai",
      messages: messagesFor(question, snapshot),
      temperature: 0.35
    }
  });
  const answer = textFromOpenAI(data);
  return answer ? { answer, mode: "pollinations" } : null;
}

export async function askAnalyst(question, snapshot) {
  const providers = [askOpenAI, askGemini, askGroq, askPollinations];
  const errors = [];
  for (const provider of providers) {
    try {
      const result = await provider(question, snapshot);
      if (result?.answer) return result;
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors[0] || "No AI provider responded.");
}
