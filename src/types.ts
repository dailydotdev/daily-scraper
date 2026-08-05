import { Static, Type } from '@sinclair/typebox';

export const Screenshot = Type.Object({
  content: Type.Optional(Type.String()),
  url: Type.Optional(Type.String()),
  selector: Type.String(),
  /**
   * Everything below is optional and defaults to the behaviour callers had
   * before it existed, so no existing capture changes shape.
   */
  width: Type.Optional(Type.Integer({ minimum: 1, maximum: 4096 })),
  height: Type.Optional(Type.Integer({ minimum: 1, maximum: 4096 })),
  /**
   * Captures are 2x by default because the pages being shot are authored at
   * half their output size. A page authored at its true output size wants 1.
   */
  deviceScaleFactor: Type.Optional(Type.Number({ minimum: 1, maximum: 4 })),
  /** JPEG for photographic captures; PNG doubles the bytes for no visible gain. */
  imageType: Type.Optional(
    Type.Union([Type.Literal('png'), Type.Literal('jpeg')]),
  ),
  quality: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  /**
   * The URL path forces Roboto so unbranded captures are deterministic across
   * whatever the pod has installed. A page that ships its own webfont and is
   * meant to look like the product needs that left alone.
   */
  keepFonts: Type.Optional(Type.Boolean()),
});

export type ScreenshotType = Static<typeof Screenshot>;

export const Pdf = Type.Object({
  content: Type.Optional(Type.String()),
  url: Type.Optional(Type.String()),
});

export type PdfType = Static<typeof Pdf>;
