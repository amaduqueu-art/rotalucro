export type FuelType = 'gnv' | 'alcool' | 'gasolina';

export type PaymentMethod = 'dinheiro' | 'cartao' | 'pix' | 'aplicativo';

export type PaymentStatus = 'pendente' | 'pago';

/** Linha da tabela `rides`. */
export type Ride = {
  id: string;
  user_id: string;
  ride_at: string;
  fare: number;
  fuel_type: FuelType;
  /** Litros quando `fuel_type` for álcool/gasolina; m³ quando GNV. */
  fuel_quantity: number;
  /** Preço por litro (ou m³) no abastecimento. */
  fuel_unit_price: number;
  /** Custo do combustível = quantidade × preço unitário (calculado). */
  fuel_cost: number;
  /** Despesas extras do trajeto (pedágio, lavagem, lanche...). */
  extra_expenses: number;
  km_initial: number;
  km_final: number | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_at: string | null;
  /** Identificador enviado no QR Code PIX. */
  pix_txid: string | null;
  /** Lucro = fare - fuel_cost - extra_expenses (coluna gerada no PostgreSQL). */
  profit: number;
  /** Distância percorrida = km_final - km_initial (gerada; null sem KM final). */
  distance_km: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RideInsert = Omit<
  Ride,
  'id' | 'profit' | 'distance_km' | 'created_at' | 'updated_at'
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
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
