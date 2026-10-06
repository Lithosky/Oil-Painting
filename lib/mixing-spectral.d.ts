declare module "spectral.js" {
  export class Color {
    constructor(value: string | number[]);
    sRGB: number[];
    toString(options?: {
      format?: "hex" | "rgb";
      method?: "map" | "clip";
    }): string;
  }
  export function mix(...colors: [Color, number][]): Color;
}
