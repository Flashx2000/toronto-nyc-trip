// Encrypts a plaintext trip-data.js into trip-data.enc.js.
//   TRIP_PASSWORD='your password' node tools/encrypt.mjs trip-data.js > trip-data.enc.js
// Uses the same format the page decrypts: PBKDF2-SHA256 -> AES-256-GCM.
import { readFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import vm from "node:vm";

const ITERATIONS = 310000;
const [, , input] = process.argv;
const password = process.env.TRIP_PASSWORD;
if (!input || !password) {
  console.error("Usage: TRIP_PASSWORD='…' node tools/encrypt.mjs trip-data.js > trip-data.enc.js");
  process.exit(1);
}

// trip-data.js sets window.TRIP; run it in a sandbox to read the object.
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(input, "utf8"), sandbox);
const data = sandbox.window.TRIP;
if (!data || !Array.isArray(data.days)) {
  console.error("No window.TRIP with days found in " + input);
  process.exit(1);
}

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
);
const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data)));

const b64 = (buf) => Buffer.from(buf).toString("base64");
const payload = { v: 1, iter: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
process.stdout.write(
  "// Encrypted trip itinerary. Unlock it on the page with the trip password.\n" +
  "window.TRIP_ENC = " + JSON.stringify(payload) + ";\n"
);
