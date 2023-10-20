import { Type, Static } from '@sinclair/typebox';

export const RSS = Type.Object({
  url: Type.String(),
  title: Type.String(),
});

export const RSSFeed = Type.Object({
  meta: Type.Any, // You might want to specify a more accurate type for meta
  items: Type.Array(Type.Any), // You might want to specify a more accurate type for items
});

export type RSSType = Static<typeof RSS>;
export type RSSFeedType = Static<typeof RSSFeed>;

