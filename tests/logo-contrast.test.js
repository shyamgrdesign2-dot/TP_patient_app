import test from "node:test";
import assert from "node:assert/strict";
import {
  svgForWhiteBackground,
  logoForWhiteBackground,
} from "../src/shared/logoContrast.js";

test("white SVG lettering becomes readable without changing colour marks or mask geometry", () => {
  const svg =
    '<svg><mask id="m"><path fill="white" d="M0 0h4v4z"/></mask><path fill="#0099ff"/><text fill="#FFF">Brand</text><path style="stroke:rgb(255, 255, 255)"/></svg>';
  const result = svgForWhiteBackground(svg);
  assert.ok(result.includes('<mask id="m"><path fill="white"'));
  assert.ok(result.includes('fill="#0099ff"'));
  assert.ok(result.includes('<text fill="#243247">'));
  assert.ok(result.includes("stroke:#243247"));
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  assert.equal(
    decodeURIComponent(
      logoForWhiteBackground(uri).split(",").slice(1).join(","),
    ),
    result,
  );
  assert.equal(logoForWhiteBackground("/logo.png"), "/logo.png");
});
