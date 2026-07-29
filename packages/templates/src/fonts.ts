import { z } from 'zod'

/**
 * Content-addressed, self-hosted OFL font files under `packages/templates/fonts/`.
 * See `fonts/LICENSES.md` for provenance. No CDN reference exists anywhere in
 * this package — Finding 2 requires font measurement to be network-independent.
 */
export const FontAsset = z.strictObject({
  family: z.string().min(1),
  weight: z.number().int().positive(),
  file: z.string().min(1),
  contentHash: z.string().min(1)
})
export type FontAsset = z.infer<typeof FontAsset>

const asset = (family: string, weight: number, file: string, contentHash: string): FontAsset => ({
  family,
  weight,
  file,
  contentHash
})

export const FONT_ASSETS: readonly FontAsset[] = [
  asset('Literata', 400, 'literata-400.a60c193b55766b68.woff2', 'a60c193b55766b68'),
  asset('Literata', 700, 'literata-700.1f2985e0fc368aac.woff2', '1f2985e0fc368aac'),
  asset('JetBrains Mono', 500, 'jetbrains-mono-500.cb182feeed4d798f.woff2', 'cb182feeed4d798f'),
  asset('Bangers', 400, 'bangers-400.04f54ff42ea2b8fc.woff2', '04f54ff42ea2b8fc'),
  asset('Archivo Black', 400, 'archivo-black-400.25f33e61cf995abd.woff2', '25f33e61cf995abd'),
  asset('Archivo', 400, 'archivo-400.07f9160163da2ec0.woff2', '07f9160163da2ec0'),
  asset('Archivo', 700, 'archivo-700.abada6cd4c92a9a7.woff2', 'abada6cd4c92a9a7'),
  asset('Anton', 400, 'anton-400.d0fa07ff63dd60cb.woff2', 'd0fa07ff63dd60cb'),
  asset('IBM Plex Mono', 400, 'ibm-plex-mono-400.08949f728dc52d52.woff2', '08949f728dc52d52'),
  asset('IBM Plex Mono', 700, 'ibm-plex-mono-700.4f84d86cfd060f4d.woff2', '4f84d86cfd060f4d'),
  asset('IBM Plex Sans', 400, 'ibm-plex-sans-400.3b646991d30055a9.woff2', '3b646991d30055a9'),
  asset('IBM Plex Sans', 700, 'ibm-plex-sans-700.42e7b0c143c19df9.woff2', '42e7b0c143c19df9')
]

export function fontFaceCss(assets: readonly FontAsset[] = FONT_ASSETS): string {
  return assets
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; font-weight: ${f.weight}; font-style: normal; font-display: swap; src: url('./fonts/${f.file}') format('woff2'); }`
    )
    .join('\n')
}
