import { FF1 } from "@noble/ciphers/ff1.js";

export type FF1Encoder = ReturnType<typeof createFF1>;

export const createFF1 = (key: string, tweak: string) => {
  if (!/^[0-9a-f]{64}$/i.test(key))
    throw new Error("ff1 key must be 64 hex characters (32-byte AES-256 key)");
  const ff1 = FF1(10, Buffer.from(key, "hex"), Buffer.from(tweak, "utf8"));
  return (num: number): string => {
    if (!Number.isSafeInteger(num) || num < 0 || num >= 1e10)
      throw new Error("number must be a safe integer in [0, 9999999999]");
    return ff1.encrypt(num.toString().padStart(10, "0").split("").map(Number)).join("");
  };
};
