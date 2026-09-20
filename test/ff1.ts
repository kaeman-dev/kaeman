import assert from "node:assert";
import { FF1 } from "@noble/ciphers/ff1.js";
import { createFF1 } from "../src/utils/ff1";

// NIST SP 800-38G FF1 官方样例, 用于看住依赖升级不破坏行为
const CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";
const toDigits = (text: string) => [...text].map((c) => CHARSET.indexOf(c));

interface Vector {
  key: string;
  tweak: string;
  radix: number;
  x: string;
  c: string;
}

const vectors: Vector[] = [
  { key: "2B7E151628AED2A6ABF7158809CF4F3C", tweak: "", radix: 10, x: "0123456789", c: "2433477484" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3C", tweak: "39383736353433323130", radix: 10, x: "0123456789", c: "6124200773" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3C", tweak: "3737373770717273373737", radix: 36, x: "0123456789abcdefghi", c: "a9tv40mll9kdu509eum" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3CEF4359D8D580AA4F", tweak: "", radix: 10, x: "0123456789", c: "2830668132" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3CEF4359D8D580AA4F", tweak: "39383736353433323130", radix: 10, x: "0123456789", c: "2496655549" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3CEF4359D8D580AA4F", tweak: "3737373770717273373737", radix: 36, x: "0123456789abcdefghi", c: "xbj3kv35jrawxv32ysr" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3CEF4359D8D580AA4F7F036D6F04FC6A94", tweak: "", radix: 10, x: "0123456789", c: "6657667009" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3CEF4359D8D580AA4F7F036D6F04FC6A94", tweak: "39383736353433323130", radix: 10, x: "0123456789", c: "1001623463" },
  { key: "2B7E151628AED2A6ABF7158809CF4F3CEF4359D8D580AA4F7F036D6F04FC6A94", tweak: "3737373770717273373737", radix: 36, x: "0123456789abcdefghi", c: "xs8a0azh2avyalyzuwd" },
];

for (const [i, { key, tweak, radix, x, c }] of vectors.entries()) {
  const ff1 = FF1(radix, Buffer.from(key, "hex"), Buffer.from(tweak, "hex"));
  assert.deepStrictEqual(ff1.encrypt(toDigits(x)), toDigits(c), `NIST #${i + 1} encrypt`);
  assert.deepStrictEqual(ff1.decrypt(toDigits(c)), toDigits(x), `NIST #${i + 1} decrypt`);
}

// 双向转换与输入校验
const ff1 = createFF1({ key: "ab".repeat(32), length: 10, tweak: "kaeman:user:v1" });
for (const aid of [0, 1, 42, 123456789, 9999999999]) {
  const uid = ff1.encrypt(aid);
  assert.match(uid, /^\d{10}$/);
  assert.strictEqual(ff1.decrypt(uid), aid);
}
assert.throws(() => ff1.encrypt(10000000000));
assert.throws(() => ff1.encrypt(-1));
assert.throws(() => ff1.encrypt(1.5));
assert.throws(() => ff1.decrypt("123456789"));
assert.throws(() => ff1.decrypt("123456789a"));
assert.throws(() => createFF1({ key: "ab".repeat(31), length: 10, tweak: "t" }));
assert.throws(() => createFF1({ key: "zz".repeat(32), length: 10, tweak: "t" }));
assert.throws(() => createFF1({ key: "ab".repeat(32), length: 5, tweak: "t" }));

console.log(`ff1: ${vectors.length} NIST vectors + wrapper checks passed`);
