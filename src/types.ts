import { Static, Type } from '@sinclair/typebox';

export const Screenshot = Type.Object({
  content: Type.String(),
  selector: Type.String(),
});

export type ScreenshotType = Static<typeof Screenshot>;
