import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface OishiiTable {
  name: string;
  good: boolean;
  learned: boolean;
  userId: string | null;
  noteId: string | null;
  created: Generated<Date>;
  updated: Generated<Date>;
}

export type OishiiRow = Selectable<OishiiTable>;
export type NewOishii = Insertable<OishiiTable>;
export type OishiiUpdate = Updateable<OishiiTable>;

export interface Database {
  oishii_table: OishiiTable;
}
