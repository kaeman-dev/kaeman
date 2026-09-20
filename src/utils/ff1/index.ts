import { FF1 } from "@noble/ciphers/ff1.js";

export interface FF1Options {
  key: string;
  length: number;
  tweak: string;
}

export type FF1Codec = ReturnType<typeof createFF1>;

// SP 800-38G radix^minlen >= 10^6
const LENGTH_MIN = 6;

// 10^length - 1 不可以超过 Number.MAX_SAFE_INTEGER, 否则 js 丢失精度.
const LENGTH_MAX = 15;

export const createFF1 = ({ key, length, tweak }: FF1Options) => {
  if (typeof key !== "string" || !/^[0-9a-f]{64}$/i.test(key))
    throw new Error("ff1 key must be 64 hex characters (32-byte AES-256 key)");
  if (!Number.isInteger(length) || length < LENGTH_MIN || length > LENGTH_MAX)
    throw new Error(
      `ff1 length must be an integer in [${LENGTH_MIN}, ${LENGTH_MAX}]`,
    );

  const ff1 = FF1(10, Buffer.from(key, "hex"), Buffer.from(tweak, "utf8"));
  const capacity = 10 ** length;
  const uidPattern = new RegExp(`^\\d{${length}}$`);

  return {
    encrypt: (num: number): string => {
      if (!Number.isSafeInteger(num) || num < 0 || num >= capacity)
        throw new Error(`number must be a safe integer in [0, ${capacity - 1}]`);
      return ff1
        .encrypt(num.toString().padStart(length, "0").split("").map(Number))
        .join("");
    },

    decrypt: (num: string): number => {
      if (typeof num !== "string" || !uidPattern.test(num))
        throw new Error(`number must be exactly ${length} digits`);
      return Number(ff1.decrypt([...num].map(Number)).join(""));
    },
  };
};
