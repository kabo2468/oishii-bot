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

export interface FoodTable {
  id: Generated<number>;
  name: string;
  good: boolean;
  is_user_taught: boolean;
  user_id: string | null;
  note_id: string | null;
  created_at: Generated<Date>;
}

export type FoodRow = Selectable<FoodTable>;
export type NewFood = Insertable<FoodTable>;
export type FoodUpdate = Updateable<FoodTable>;

export interface ValentineTable {
  user_id: string;
  year: number;
  acct: string;
  gave_to_bot: number;
  received_from_bot: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type ValentineRow = Selectable<ValentineTable>;
export type NewValentine = Insertable<ValentineTable>;
export type ValentineUpdate = Updateable<ValentineTable>;

export interface Database {
  oishii_table: OishiiTable;
  food: FoodTable;
  valentine: ValentineTable;
}
