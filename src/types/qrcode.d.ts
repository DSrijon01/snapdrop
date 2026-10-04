declare module 'qrcode' {
  export interface QRCodeOptions {
    type?: 'svg' | 'utf8' | 'terminal';
    width?: number;
    margin?: number;
    scale?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
  }

  export function toDataURL(
    text: string,
    options?: QRCodeOptions,
    callback?: (error: any, url: string) => void
  ): Promise<string>;

  export function toString(
    text: string,
    options?: QRCodeOptions,
    callback?: (error: any, string: string) => void
  ): Promise<string>;
}
