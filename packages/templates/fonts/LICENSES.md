# Font Licences

All fonts under this directory are self-hosted, content-addressed (the hex
suffix in each filename is a truncated SHA-256 of the file bytes), and
licensed under the **SIL Open Font License, Version 1.1** (OFL). Per
`docs/trd.md` Finding 2 and the task-7 fonts constraint, they are pinned here
rather than loaded from a CDN, so measurement never depends on network
availability or a font substitution the user does not see.

Source: [Google Fonts](https://fonts.google.com) `css2` API, `latin` subset,
`woff2` format, fetched directly from `fonts.gstatic.com` on 2026-07-29. All
listed families are distributed by Google Fonts under OFL 1.1. The full
licence text below applies identically to every file in this directory.

## SIL Open Font License Version 1.1 — 26 February 2007

### Preamble

The goals of the Open Font License (OFL) are to stimulate worldwide development
of collaborative font projects, to support the font creation efforts of
academic and linguistic communities, and to provide a free and open framework
in which fonts may be shared and improved in partnership with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The fonts,
including any derivative works, can be bundled, embedded, redistributed and/or
sold with any software provided that any reserved names are not used by
derivative works. The fonts and derivatives, however, cannot be released under
any other type of license. The requirement for fonts to remain under this
license does not apply to any document created using the fonts or their
derivatives.

### Definitions

“Font Software” refers to the set of files released by the Copyright Holder(s)
under this license and clearly marked as such. This may include source files,
build scripts and documentation.

“Reserved Font Name” refers to any names specified as such after the copyright
statement(s).

“Original Version” refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

“Modified Version” refers to any derivative made by adding to, deleting, or
substituting — in part or in whole — any of the components of the Original
Version, by changing formats or by porting the Font Software to a new
environment.

“Author” refers to any designer, engineer, programmer, technical writer or
other person who contributed to the Font Software.

### Permission & Conditions

Permission is hereby granted, free of charge, to any person obtaining a copy of
the Font Software, to use, study, copy, merge, embed, modify, redistribute,
and sell modified and unmodified copies of the Font Software, subject to the
following conditions:

1. Neither the Font Software nor any of its individual components, in Original
   or Modified Versions, may be sold by itself.
2. Original or Modified Versions of the Font Software may be bundled,
   redistributed and/or sold with any software, provided that each copy
   contains the above copyright notice and this license. These can be included
   either as stand-alone text files, human-readable headers or in the
   appropriate machine-readable metadata fields within text or binary files as
   long as those fields can be easily viewed by the user.
3. No Modified Version of the Font Software may use the Reserved Font Name(s)
   unless explicit written permission is granted by the corresponding Copyright
   Holder. This restriction only applies to the primary font name as presented
   to the users.
4. The name(s) of the Copyright Holder(s) or the Author(s) of the Font Software
   shall not be used to promote, endorse or advertise any Modified Version,
   except to acknowledge the contribution(s) of the Copyright Holder(s) and the
   Author(s) or with their explicit written permission.
5. The Font Software, modified or unmodified, in part or in whole, must be
   distributed entirely under this license, and must not be distributed under
   any other license. The requirement for fonts to remain under this license
   does not apply to any document created using the Font Software.

### Termination

This license becomes null and void if any of the above conditions are not met.

### Disclaimer

THE FONT SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK,
OR OTHER RIGHT. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT,
INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR
FROM OTHER DEALINGS IN THE FONT SOFTWARE.

| File | Family | Weight | Foundry / Designer |
| --- | --- | --- | --- |
| `literata-400.a60c193b55766b68.woff2` | Literata | 400 | The Literata Project Authors (TypeTogether) |
| `literata-700.1f2985e0fc368aac.woff2` | Literata | 700 | The Literata Project Authors (TypeTogether) |
| `jetbrains-mono-500.cb182feeed4d798f.woff2` | JetBrains Mono | 500 | JetBrains |
| `bangers-400.04f54ff42ea2b8fc.woff2` | Bangers | 400 | Vernon Adams |
| `archivo-black-400.25f33e61cf995abd.woff2` | Archivo Black | 400 | Omnibus-Type |
| `archivo-400.07f9160163da2ec0.woff2` | Archivo | 400 | Omnibus-Type |
| `archivo-700.abada6cd4c92a9a7.woff2` | Archivo | 700 | Omnibus-Type |
| `anton-400.d0fa07ff63dd60cb.woff2` | Anton | 400 | Vernon Adams |
| `ibm-plex-mono-400.08949f728dc52d52.woff2` | IBM Plex Mono | 400 | IBM |
| `ibm-plex-mono-700.4f84d86cfd060f4d.woff2` | IBM Plex Mono | 700 | IBM |
| `ibm-plex-sans-400.3b646991d30055a9.woff2` | IBM Plex Sans | 400 | IBM |
| `ibm-plex-sans-700.42e7b0c143c19df9.woff2` | IBM Plex Sans | 700 | IBM |

Used by (`packages/templates/src/design-systems/`):

- **`editorial`** — Literata 400/700 (headline/body serif), JetBrains Mono 500 (eyebrow/mono accents).
- **`comic`** — Bangers 400 (display headline), Archivo Black 400 (heavy subheads/stat values), Archivo 400/700 (body/labels).
- **`brutalist`** — Anton 400 (condensed display headline), IBM Plex Mono 400/700 (tactical-terminal eyebrow/labels), IBM Plex Sans 400/700 (body).

No font in this directory is loaded from a CDN at render time; `@font-face`
declarations (`src/fonts.ts`) reference these files by their content-addressed
path only.
