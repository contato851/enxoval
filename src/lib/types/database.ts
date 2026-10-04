// Tipos do banco no formato do `supabase gen types typescript`.
// Ao mudar as migrations, regenere com:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Papel = "dono" | "editor";
type Prioridade = "essencial" | "pode_esperar";
type Status = "a_comprar" | "comprado" | "ganhamos";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      list_templates: {
        Row: { tipo: string; nome: string };
        Insert: { tipo: string; nome: string };
        Update: { tipo?: string; nome?: string };
        Relationships: [];
      };
      list_template_categories: {
        Row: { id: string; tipo: string; nome: string; icone: string; ordem: number; mostra_tamanhos: boolean };
        Insert: { id?: string; tipo: string; nome: string; icone: string; ordem: number; mostra_tamanhos?: boolean };
        Update: { id?: string; tipo?: string; nome?: string; icone?: string; ordem?: number; mostra_tamanhos?: boolean };
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          nome: string;
          tipo: string;
          data_prevista: string | null;
          criado_por: string | null;
          criado_em: string;
          publico: boolean;
          public_slug: string | null;
          plano: string;
        };
        Insert: never;
        Update: { nome?: string; data_prevista?: string | null };
        Relationships: [];
      };
      list_members: {
        Row: { list_id: string; user_id: string; papel: Papel; criado_em: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      list_invites: {
        Row: {
          id: string;
          list_id: string;
          token_hash: string;
          criado_por: string | null;
          criado_em: string;
          expira_em: string;
          usado_em: string | null;
          usado_por: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          list_id: string;
          nome: string;
          icone: string;
          ordem: number;
          mostra_tamanhos: boolean;
          criado_em: string;
        };
        Insert: { list_id: string; nome: string; icone?: string; ordem?: number; mostra_tamanhos?: boolean };
        Update: { nome?: string; icone?: string; ordem?: number; mostra_tamanhos?: boolean };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          list_id: string;
          category_id: string;
          nome: string;
          url_original: string | null;
          url_saida: string | null;
          loja: string | null;
          preco: number | null;
          quantidade: number;
          tamanho: string | null;
          prioridade: Prioridade;
          status: Status;
          observacoes: string | null;
          visivel_publico: boolean;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          list_id: string;
          category_id: string;
          nome: string;
          url_original?: string | null;
          preco?: number | null;
          quantidade?: number;
          tamanho?: string | null;
          prioridade?: Prioridade;
          status?: Status;
          observacoes?: string | null;
        };
        Update: {
          category_id?: string;
          nome?: string;
          url_original?: string | null;
          preco?: number | null;
          quantidade?: number;
          tamanho?: string | null;
          prioridade?: Prioridade;
          status?: Status;
          observacoes?: string | null;
        };
        Relationships: [];
      };
      item_images: {
        Row: { id: string; item_id: string; list_id: string; caminho: string; ordem: number; criado_em: string };
        Insert: { item_id: string; list_id: string; caminho: string; ordem?: number };
        Update: { ordem?: number };
        Relationships: [];
      };
      link_clicks: {
        Row: { id: number; item_id: string | null; list_id: string; loja: string | null; user_id: string | null; criado_em: string };
        Insert: { item_id?: string | null; list_id: string; loja?: string | null; user_id?: string | null };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_list: { Args: { p_nome: string; p_tipo?: string; p_data_prevista?: string | null }; Returns: string };
      create_invite: { Args: { p_list: string }; Returns: string };
      invite_preview: { Args: { p_token: string }; Returns: { list_nome: string; valido: boolean }[] };
      accept_invite: { Args: { p_token: string }; Returns: string };
      list_members_with_email: {
        Args: { p_list: string };
        Returns: { user_id: string; email: string; papel: Papel; criado_em: string }[];
      };
      delete_category_moving_items: { Args: { p_category: string; p_target: string | null }; Returns: undefined };
      check_rate_limit: { Args: { p_acao: string; p_por_minuto: number; p_por_dia: number }; Returns: boolean };
      delete_account_data: { Args: Record<string, never>; Returns: string[] };
      is_list_member: { Args: { p_list: string }; Returns: boolean };
      is_list_owner: { Args: { p_list: string }; Returns: boolean };
    };
    Enums: {
      papel_membro: Papel;
      item_prioridade: Prioridade;
      item_status: Status;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type Public = Database["public"];
export type Tabela<T extends keyof Public["Tables"]> = Public["Tables"][T]["Row"];
export type Lista = Tabela<"lists">;
export type Categoria = Tabela<"categories">;
export type Item = Tabela<"items">;
export type ItemImagem = Tabela<"item_images">;
export type StatusItem = Status;
export type PrioridadeItem = Prioridade;
export type PapelMembro = Papel;
