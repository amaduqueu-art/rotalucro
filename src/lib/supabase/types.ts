export type FuelType = 'gnv' | 'alcool';

/** Linha da tabela `rides`. */
export type Ride = {
  id: string;
  user_id: string;
  ride_at: string;
  fare: number;
  fuel_type: FuelType;
  /** Litros quando `fuel_type = 'alcool'`; m³ quando `fuel_type = 'gnv'`. */
  fuel_quantity: number;
  fuel_cost: number;
  km_initial: number;
  km_final: number | null;
  /** Lucro = fare - fuel_cost (coluna gerada no PostgreSQL). */
  profit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RideInsert = Omit<
  Ride,
  'id' | 'profit' | 'created_at' | 'updated_at'
> & {
  /** Gerado pelo banco (gen_random_uuid()) quando omitido. */
  id?: string;
};

export type RideUpdate = Partial<RideInsert>;

/** Tipagem do banco usada pelos clients do Supabase. */
export type Database = {
  public: {
    Tables: {
      rides: {
        Row: Ride;
        Insert: RideInsert;
        Update: RideUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      fuel_type: FuelType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
