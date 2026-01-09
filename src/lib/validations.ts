import { z } from 'zod';

// PIX Payment request validation (matches edge function interface)
export const pixPaymentSchema = z.object({
  transaction_id: z.string().uuid("ID da transação inválido"),
  alert_title: z.string()
    .min(1, "Título é obrigatório")
    .max(200, "Título muito longo"),
  amount_cents: z.number()
    .int("Valor deve ser inteiro")
    .min(100, "Valor mínimo é R$ 1,00")
    .max(100000, "Valor máximo é R$ 1.000,00"),
  streamer_id: z.string().uuid("ID do streamer inválido"),
  streamer_handle: z.string()
    .min(1, "Handle é obrigatório")
    .max(50, "Handle muito longo")
    .regex(/^[a-z0-9_-]+$/i, "Handle contém caracteres inválidos"),
  payer_email: z.string()
    .email("Email inválido")
    .max(255)
    .optional(),
  buyer_note: z.string()
    .max(200, "Mensagem deve ter no máximo 200 caracteres")
    .optional(),
  hp_field: z.string().optional(), // Honeypot field
});

// Transaction validation
export const buyerNoteSchema = z.object({
  buyer_note: z.string().max(500, "Nota do comprador deve ter no máximo 500 caracteres").optional(),
  alert_id: z.string().uuid("ID do alerta inválido"),
  streamer_id: z.string().uuid("ID do streamer inválido"),
  amount_cents: z.number().int().min(100, "Valor mínimo é R$ 1,00")
});

// Profile validation
export const profileSchema = z.object({
  display_name: z.string()
    .min(1, "Nome de exibição é obrigatório")
    .max(100, "Nome de exibição deve ter no máximo 100 caracteres")
    .trim(),
  bio: z.string()
    .max(1000, "Bio deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal('')),
  handle: z.string()
    .min(3, "Handle deve ter no mínimo 3 caracteres")
    .max(50, "Handle deve ter no máximo 50 caracteres")
    .regex(/^[a-z0-9_-]+$/, "Handle deve conter apenas letras minúsculas, números, _ e -")
});

// Alert validation
export const alertSchema = z.object({
  title: z.string()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .trim(),
  description: z.string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal('')),
  price_cents: z.number()
    .int()
    .min(100, "Preço mínimo é R$ 1,00")
    .max(100000, "Preço máximo é R$ 1.000,00")
});

// Withdrawal validation
export const withdrawalSchema = z.object({
  pix_key: z.string()
    .min(11, "Chave PIX deve ter no mínimo 11 caracteres")
    .max(100, "Chave PIX deve ter no máximo 100 caracteres"),
  amount_cents: z.number().int().min(100, "Valor mínimo para saque é R$ 1,00")
});

// Authentication validation
export const authSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100, "Senha deve ter no máximo 100 caracteres"),
  displayName: z.string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional()
});

// Type exports
export type PixPaymentInput = z.infer<typeof pixPaymentSchema>;
export type BuyerNoteInput = z.infer<typeof buyerNoteSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type AuthInput = z.infer<typeof authSchema>;
