export type FuelType = 'gnv' | 'alcool' | 'gasolina';

export type PaymentMethod = 'dinheiro' | 'cartao' | 'pix' | 'aplicativo';

export type PaymentStatus = 'pendente' | 'pago';

/** Tipos de chave aceitos pelo PIX (usados no BR Code). */
export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

/** Perfil PIX do motorista logado (uma linha por usuário). */
export type DriverProfile = {
  user_id: string;
  pix_key_type: PixKeyType;
  pix_key: string;
  /** Nome curto exibido no comprovante (máx. 25 caracteres no BR Code). */
  merchant_name: string;
  /** Cidade exibida no comprovante (máx. 15 caracteres no BR Code). */
  merchant_city: string;
  created_at: string;
  updated_at: string;
};

/** Dados editáveis pelo motorista em Configurações. */
export type DriverProfileInput = Pick<
  DriverProfile,
  'pix_key_type' | 'pix_key' | 'merchant_name' | 'merchant_city'
>;

/** Um ponto capturado durante a rota da corrida. */
export type RoutePoint = {
  lat: number;
  lng: number;
  /** ISO timestamp do momento em que o ponto foi capturado. */
  at?: string;
  /** Precisão aproximada do GPS, em metros. */
  accuracy?: number;
};

/** Abastecimento: evento independente da corrida. */
export type FuelRefuel = {
  id: string;
  user_id: string;
  fueled_at: string;
  fuel_type: FuelType;
  /** Litros (álcool/gasolina) ou m³ (GNV). */
  quantity: number;
  unit_price: number;
  /** quantity × unit_price. Rateado entre as corridas seguintes. */
  total_cost: number;
  odometer: number | null;
  station: string | null;
  notes: string | null;
  created_at: string;
};

export type FuelRefuelInsert = Omit<
  FuelRefuel,
  'id' | 'created_at' | 'odometer' | 'station' | 'notes'
> & {
  id?: string;
  odometer?: number | null;
  station?: string | null;
  notes?: string | null;
};

/** Linha da tabela `rides`. */
export type Ride = {
  id: string;
  user_id: string;
  ride_at: string;
  fare: number;
  /**
   * Parcela do combustível rateada para esta corrida (R$).
   * Antes da versão 2.1 era o custo do abastecimento inteiro.
   */
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
  /** Lucro = fare - fuel_cost rateado - extra_expenses (coluna gerada). */
  profit: number;
  /** Distância percorrida = km_final - km_initial (gerada; null sem KM final). */
  distance_km: number | null;
  /** Pontos da rota capturados no início/fim da corrida. */
  route: RoutePoint[] | null;
  route_distance_km: number | null;
  route_started_at: string | null;
  route_ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RideInsert = Omit<
  Ride,
  | 'id'
  | 'profit'
  | 'distance_km'
  | 'route'
  | 'route_distance_km'
  | 'route_started_at'
  | 'route_ended_at'
  | 'created_at'
  | 'updated_at'
> & {
  /** Gerado pelo banco (gen_random_uuid()) quando omitido. */
  id?: string;
  route?: RoutePoint[] | null;
  route_distance_km?: number | null;
  route_started_at?: string | null;
  route_ended_at?: string | null;
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
      fuel_refuels: {
        Row: FuelRefuel;
        Insert: FuelRefuelInsert;
        Update: Partial<FuelRefuelInsert>;
        Relationships: [];
      };
      driver_profiles: {
        Row: DriverProfile;
        Insert: DriverProfileInput & { user_id: string };
        Update: Partial<DriverProfileInput>;
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
      pix_key_type: PixKeyType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
