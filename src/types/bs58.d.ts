declare module "bs58" {
  export function encode(buffer: Uint8Array | number[] | Buffer): string;
  export function decode(string: string): Uint8Array;
  export function decodeUnsafe(string: string): Uint8Array | undefined;
  const bs58: {
    encode: typeof encode;
    decode: typeof decode;
    decodeUnsafe: typeof decodeUnsafe;
  };
  export default bs58;
}
