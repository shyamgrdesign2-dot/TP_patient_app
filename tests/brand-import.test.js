import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import {
  safeSvg,
  readWebsiteBody,
  normalizeCtaGradient,
  findLogoCandidates,
  foundationalStyles,
  extractBrand,
  publicIPv4,
  validateWebsiteUrl,
  brandImportHandler,
} from "../scripts/brand-import-service.js";

test("website importer rejects private, reserved, credential and non-web destinations", () => {
  for (const address of [
    "0.0.0.0",
    "10.1.2.3",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "100.64.1.1",
    "198.19.0.1",
    "192.0.2.1",
    "203.0.113.1",
    "255.255.255.255",
    "::1",
  ])
    assert.equal(publicIPv4(address), false, address);
  assert.equal(publicIPv4("8.8.8.8"), true);
  for (const url of [
    "http://localhost",
    "http://127.1",
    "http://2130706433",
    "http://[::1]",
    "http://169.254.169.254",
    "https://user:secret@example.com",
    "file:///etc/passwd",
    "https://example.com:8080",
    "http://host.local",
  ])
    assert.throws(() => validateWebsiteUrl(url), url);
  assert.equal(
    validateWebsiteUrl("https://hospital.example/path#logo").href,
    "https://hospital.example/path",
  );
});
test("extracts public brand evidence without inventing missing fields", () => {
  const html =
    '<meta property="og:site_name" content="A &amp; B Hospital"><meta name="theme-color" content="#ffffff"><link rel="stylesheet" href="/brand.css"><link rel="apple-touch-icon" href="/icon.png"><img class="site-logo" src="/logo.png">';
  const css =
    ':root {--brand-primary:#006b68;--font-main:"Inter",sans-serif} body{font-family:var(--font-main)}h1{font-family:"Mulish",sans-serif}';
  const result = extractBrand(html, css, "https://hospital.example/");
  assert.deepEqual(
    Object.fromEntries(result.candidates.map((c) => [c.key, c.value])),
    {
      hospitalName: "A & B Hospital",
      primary: "#006b68",
      fontBody: "Inter",
      fontHeading: "Mulish",
    },
  );
  assert.deepEqual(result.logos, ["https://hospital.example/logo.png"]);
  assert.deepEqual(result.stylesheets, ["https://hospital.example/brand.css"]);
  assert.equal(
    extractBrand(
      "<title>Welcome</title>",
      "button{background:#f6f6f6}",
      "https://hospital.example",
    ).candidates.length,
    0,
  );
});
test("API rejects cross-origin requests and unsupported methods before fetching", async () => {
  const run = async (req) => {
    const response = {
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(v) {
        this.body = JSON.parse(v);
      },
    };
    await brandImportHandler(req, response);
    return response;
  };
  assert.equal((await run({ method: "GET", headers: {} })).statusCode, 405);
  const cross = await run({
    method: "POST",
    headers: { origin: "https://evil.example", host: "app.example" },
  });
  assert.equal(cross.statusCode, 403);
  assert.equal(cross.headers["Cache-Control"], "no-store");
});

test("SVG logos preserve vector paths but reject active or external content", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><linearGradient id="g"><stop stop-color="#006b68"/></linearGradient></defs><path fill="url(#g)" d="M0 0h20v20z"/></svg>';
  assert.equal(safeSvg(Buffer.from(svg)).toString(), svg);
  for (const content of [
    "<script>alert(1)</script>",
    "<foreignObject>HTML</foreignObject>",
    '<image href="https://internal.example/image.png"/>',
    '<use href="&#x68;ttps://example.com"/>',
    '<path onclick="alert(1)"/>',
    '<style>@import "https://example.com";</style>',
    '<path style="fill:url(https://example.com)"/>',
    '<set attributeName="href" to="https://example.com"/>',
  ])
    assert.equal(
      safeSvg(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg">' + content + "</svg>",
        ),
      ),
      null,
      content,
    );
  assert.equal(
    safeSvg(
      Buffer.from(
        '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
      ),
    ),
    null,
  );
});

test("logo candidates use header/footer context and retain wide inline SVG", () => {
  const html =
    '<header><a href="/"><img src="/unlabelled.svg" width="160" height="32"></a><svg viewBox="0 0 24 24"><path d="M0 0"/></svg></header><footer><svg aria-label="Hospital logo" viewBox="0 0 200 40"><path d="M0 0h20v20z"/></svg></footer>';
  const found = findLogoCandidates(html, "https://hospital.example");
  assert.equal(found.length, 2);
  assert.ok(
    found.some(
      (v) =>
        v.url === "https://hospital.example/unlabelled.svg" &&
        v.place === "header",
    ),
  );
  assert.ok(
    found.some(
      (v) => v.svg && v.width / v.height === 5 && v.place === "footer",
    ),
  );
});
test("CTA gradients are normalized and decorative or unsafe gradients ignored", () => {
  assert.equal(
    normalizeCtaGradient("linear-gradient(to right, #06b 0%, #936 100%)"),
    "linear-gradient(90deg, #0066bb 0%, #993366 100%)",
  );
  assert.equal(
    normalizeCtaGradient(
      "linear-gradient(90deg, rgba(10,20,30,1), rgb(40,50,60))",
    ),
    "linear-gradient(90deg, rgba(10, 20, 30, 1), #28323c)",
  );
  for (const value of [
    "linear-gradient(url(https://x),red)",
    "linear-gradient(90deg,#fff 120%,#000)",
    "linear-gradient(90deg,#fff,#000);color:red",
  ])
    assert.equal(normalizeCtaGradient(value), null);
  const css =
    ".hero{background:linear-gradient(90deg,#123456,#654321)}.btn-primary{background:linear-gradient(135deg,#006b68,#388b87)}";
  assert.equal(
    extractBrand(
      '<button class="btn-primary">Book appointment</button>',
      css,
      "https://hospital.example",
    ).candidates.find((v) => v.key === "ctaGradient")?.value,
    "linear-gradient(135deg, #006b68, #388b87)",
  );
  assert.equal(
    extractBrand(
      "",
      ".hero{background:linear-gradient(90deg,#123456,#654321)}",
      "https://hospital.example",
    ).candidates.some((v) => v.key === "ctaGradient"),
    false,
  );
});
test("foundation suggestions require repeated control styles and ignore pill outliers", () => {
  assert.deepEqual(
    foundationalStyles(
      ".card{border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12)}.button{border-radius:12px;box-shadow:0 3px 12px rgba(0,0,0,0.1)}.badge{border-radius:999px}",
    ),
    { radius: 12, shadowStyle: "soft" },
  );
  assert.deepEqual(
    foundationalStyles(
      ".hero{border-radius:8px}.button{border-radius:999px;box-shadow:none}",
    ),
    { radius: undefined, shadowStyle: undefined },
  );
});

test("visible CTA colour outranks unused library variable and SVG base is forbidden", () => {
  const result = extractBrand(
    '<body><button class="nav-book">Book</button></body>',
    ":root {--bs-primary:#0d6efd;} .nav-book {background-color:#00594a;}",
    "https://hospital.example",
  );
  assert.equal(
    result.candidates.find((c) => c.key === "primary").value,
    "#00594a",
  );
  assert.equal(
    safeSvg(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://example.com/"><use href="#shape"/></svg>',
      ),
    ),
    null,
  );
});

test("harmless SVG export comments do not discard coloured header logos", () => {
  const source =
    '<?xml version="1.0"?><!-- Adobe export --><svg xmlns="http://www.w3.org/2000/svg"><path fill="#964488" d="M0 0h20v20z"/></svg>';
  assert.ok(safeSvg(Buffer.from(source)));
});

test("CTA variables and inline link colours outrank headings and decorative gradients", () => {
  const value = (html, css) =>
    extractBrand(html, css, "https://hospital.example").candidates.find(
      (c) => c.key === "primary",
    )?.value;
  assert.equal(
    value(
      '<h1 class="heading">Hospital</h1><a class="book primary" href="/book">Book</a>',
      ":root{--primary-heading:#832369;--cta:var(--action);--action:#006b68}.heading{color:#832369}.primary{background:var(--cta)}.unused-button{background:linear-gradient(90deg,#b45bc5,#1a1994)}",
    ),
    "#006b68",
  );
  assert.equal(
    value(
      '<button style="background:linear-gradient(90deg,#b45bc5,#1a1994)">AI helper</button><a class="cta-shimmer" style="background-image:linear-gradient(101deg,#4B4AD5 0%,#27276F 131.58%)">Start Free Trial</a>',
      "",
    ),
    "#4b4ad5",
  );
  assert.equal(
    value(
      '<button class="book">Book</button>',
      ".book{background-color:rgb(0,107,104)}.book:hover{background:#ff0000}",
    ),
    "#006b68",
  );
  assert.equal(
    value(
      '<h1 class="primary">Heading</h1>',
      ":root{--primary-heading:#832369}.primary{color:#832369}",
    ),
    undefined,
  );
});

test("large homepage responses keep branding instead of failing at the old 1 MB limit", async () => {
  const html =
    '<meta property="og:site_name" content="Large Hospital">' +
    " ".repeat(3 * 1024 * 1024);
  const response = new PassThrough();
  response.headers = { "content-length": String(Buffer.byteLength(html)) };
  const reading = readWebsiteBody(response, {
    limit: 8 * 1024 * 1024,
    allowPartial: true,
  });
  response.end(html);
  const result = await reading;
  assert.equal(result.truncated, false);
  assert.equal(
    extractBrand(result.body.toString(), "", "https://hospital.example")
      .candidates[0].value,
    "Large Hospital",
  );
});

test("oversized text is sampled within its byte budget with or without content-length", async () => {
  for (const headers of [{}, { "content-length": "10000" }]) {
    const response = new PassThrough();
    response.headers = headers;
    const reading = readWebsiteBody(response, {
      limit: 32,
      allowPartial: true,
    });
    response.write(Buffer.alloc(20, "a"));
    response.write(Buffer.alloc(20, "b"));
    const result = await reading;
    assert.equal(result.truncated, true);
    assert.equal(result.body.length, 32);
    assert.equal(result.body.toString(), "a".repeat(20) + "b".repeat(12));
    assert.equal(response.destroyed, true);
  }
});

test("binary assets still require complete responses and interrupted text cannot pass as complete", async () => {
  for (const headers of [{}, { "content-length": "10000" }]) {
    const response = new PassThrough();
    response.headers = headers;
    const reading = readWebsiteBody(response, { limit: 32 });
    response.end(Buffer.alloc(64));
    await assert.rejects(reading, /size limit/);
  }
  const response = new PassThrough();
  response.headers = {};
  const reading = readWebsiteBody(response, { limit: 32, allowPartial: true });
  response.write("partial");
  response.destroy();
  await assert.rejects(reading, /connection closed/);
});

test("CTA colour detection respects actual DOM scope and repeated filled actions", () => {
  const html =
    '<header><a class="cta" href="/signup">Get started</a></header><main><h1>Care</h1><a class="cta" href="/book">Book appointment</a></main><footer><a href="/contact">Contact us</a></footer>';
  const result = extractBrand(
    html,
    ":root{--primary:#ee0044} h1{color:#aa0055}.faq a{background:#ff8800}.cta{background:#176b55;color:white} footer a{color:#0099ff}",
    "https://example.com",
  );
  assert.equal(
    result.candidates.find((c) => c.key === "primary").value,
    "#176b55",
  );
});

test("brand colour tokens beat a neutral CTA fill", () => {
  const result = extractBrand(
    '<a class="signup" href="/signup">Sign up</a>',
    ":root{--primary:#00bb66}.unused-button{background:#00bb66}.signup{background:black;color:white}",
    "https://example.com",
  );
  assert.equal(
    result.candidates.find((c) => c.key === "primary").value,
    "#00bb66",
  );
});

test("hospital controls outrank generic link colour and third-party footer logos", () => {
  const html = `<html><body><header><img class="logo" src="/zydus-logo.svg"></header>
    <a href="/contact">Contact us</a><button class="accordion-button">Contact us</button>
    <button class="SubmitBtn">Search</button><h1>Hospital</h1>
    <footer><a href="https://vendor.example"><img src="https://vendor.example/logo.svg"></a></footer></body></html>`;
  const css = `:root{--body:#222222}[data-bs-theme=dark]{--body:#eeeeee}
    body{color:var(--body)}a{color:#8bb9fe}.accordion-button{background:#000000}
    .SubmitBtn{background:#00a5a5;color:#ffffff}.unrelated h1{color:#ff0000}`;
  const result = extractBrand(html, css, "https://hospital.example/");
  const fields = Object.fromEntries(
    result.candidates.map((c) => [c.key, c.value]),
  );
  assert.equal(fields.primary, "#00a5a5");
  assert.equal(fields.ctaColor, "#00a5a5");
  assert.equal(fields.ctaTextColor, "#ffffff");
  assert.equal(fields.textBody, "#222222");
  assert.equal(fields.textHeading, undefined);
  assert.deepEqual(result.logos, ["https://hospital.example/zydus-logo.svg"]);
});
