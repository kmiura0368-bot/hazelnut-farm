import { all, get, run } from './turso';

export interface Tree {
  id: number;
  species: string;
  species_name: string | null;
  plant_year: number;
  age_at_plant: number;
  note: string | null;
  fx: number;
  fy: number;
  created_at: string;
}

export interface TreeInput {
  species: string;
  species_name?: string | null;
  plant_year: number;
  age_at_plant?: number;
  note?: string | null;
  fx: number;
  fy: number;
}

export const dbGetAllTrees = async (): Promise<Tree[]> => {
  return all<Tree>('SELECT * FROM trees ORDER BY id ASC');
};

export const dbGetTree = async (id: number): Promise<Tree | undefined> => {
  return get<Tree>('SELECT * FROM trees WHERE id = ?', [id]);
};

export const dbCreateTree = async (input: TreeInput): Promise<Tree> => {
  const result = await run(
    `INSERT INTO trees (species, species_name, plant_year, age_at_plant, note, fx, fy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.species,
      input.species_name ?? null,
      input.plant_year,
      input.age_at_plant ?? 1,
      input.note ?? null,
      input.fx,
      input.fy,
    ]
  );
  return (await dbGetTree(result.lastInsertRowid as number))!;
};

export const dbUpdateTree = async (id: number, input: Partial<TreeInput>): Promise<Tree | undefined> => {
  const existing = await dbGetTree(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...input };
  await run(
    `UPDATE trees SET
       species = ?, species_name = ?, plant_year = ?, age_at_plant = ?, note = ?, fx = ?, fy = ?
     WHERE id = ?`,
    [
      updated.species,
      updated.species_name ?? null,
      updated.plant_year,
      updated.age_at_plant,
      updated.note ?? null,
      updated.fx,
      updated.fy,
      id,
    ]
  );
  return dbGetTree(id);
};

export const dbDeleteTree = async (id: number): Promise<boolean> => {
  const result = await run('DELETE FROM trees WHERE id = ?', [id]);
  return result.rowsAffected > 0;
};
