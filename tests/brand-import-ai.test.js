import test from "node:test";
import assert from "node:assert/strict";
import { chooseBrandEvidence } from "../scripts/brand-import-ai.js";
const options = [
  {
    id: "blue",
    allowedKeys: ["primary"],
    value: "#006b68",
    evidence: ".cta background",
  },
  {
    id: "heading",
    allowedKeys: ["textHeading"],
    value: "#192133",
    evidence: "h1 color",
  },
];
test("AI extraction is disabled unless explicitly enabled and configured", async () => {
  const result = await chooseBrandEvidence(options, {
    enabled: false,
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: () => {
      throw new Error("Must not call");
    },
  });
  assert.equal(result.mode, "rules");
  assert.deepEqual(result.selections, []);
});
test("AI can only select grounded IDs for their allowed field", async () => {
  let body;
  const result = await chooseBrandEvidence(options, {
    enabled: true,
    apiKey: "test-key",
    model: "configured-model",
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      body = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    selections: [
                      { field: "primary", optionId: "blue" },
                      {
                        field: "logo",
                        optionId: "https://evil.example/logo.svg",
                      },
                      { field: "accent", optionId: "heading" },
                      { field: "primary", optionId: "blue" },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
      };
    },
  });
  assert.equal(result.mode, "ai");
  assert.equal(result.selections.length, 1);
  assert.equal(result.selections[0].value, "#006b68");
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.equal(body.max_output_tokens, 1800);
});
test("AI timeout, refusal or malformed output returns honest rule-based fallback", async () => {
  for (const fetchImpl of [
    async () => {
      throw new Error("timeout");
    },
    async () => ({ ok: false }),
    async () => ({
      ok: true,
      json: async () => ({
        output: [{ content: [{ type: "refusal", refusal: "unavailable" }] }],
      }),
    }),
  ]) {
    const result = await chooseBrandEvidence(options, {
      enabled: true,
      apiKey: "test-key",
      model: "test-model",
      fetchImpl,
    });
    assert.equal(result.mode, "rules");
    assert.match(result.message, /unavailable/);
  }
});

test("model evidence is bounded and never receives embedded assets", async () => {
  let requestBody;
  await chooseBrandEvidence(
    Array.from({ length: 250 }, (_, i) => ({
      id: `asset-${i}`,
      allowedKeys: ["logo"],
      value: "data:image/svg+xml;base64," + "x".repeat(100000),
      evidence: "e".repeat(5000),
    })),
    {
      enabled: true,
      apiKey: "test",
      model: "test",
      fetchImpl: async (_, init) => {
        requestBody = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            output: [
              { content: [{ type: "output_text", text: '{"selections":[]}' }] },
            ],
          }),
        };
      },
    },
  );
  assert.ok(Buffer.byteLength(requestBody.input) <= 80000);
  assert.ok(JSON.parse(requestBody.input).length <= 160);
  assert.equal(requestBody.input.includes("data:image"), false);
});
