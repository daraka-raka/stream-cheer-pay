/**
 * Error sanitization utilities for frontend
 * Prevents exposing internal error details to users
 */

// Generic user-friendly error messages
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // Network errors
  "Failed to fetch": "Erro de conexão. Verifique sua internet e tente novamente.",
  "NetworkError": "Erro de conexão. Verifique sua internet e tente novamente.",
  "Network request failed": "Erro de conexão. Verifique sua internet e tente novamente.",
  
  // Rate limiting
  "429": "Muitas tentativas. Aguarde um momento e tente novamente.",
  "Too Many Requests": "Muitas tentativas. Aguarde um momento e tente novamente.",
  
  // Authentication
  "401": "Sessão expirada. Faça login novamente.",
  "Unauthorized": "Sessão expirada. Faça login novamente.",
  "Invalid login credentials": "Email ou senha incorretos.",
  "Email not confirmed": "Confirme seu email antes de fazer login.",
  
  // Authorization
  "403": "Você não tem permissão para realizar esta ação.",
  "Forbidden": "Você não tem permissão para realizar esta ação.",
  
  // Not found
  "404": "Recurso não encontrado.",
  "Not Found": "Recurso não encontrado.",
  
  // Validation
  "400": "Dados inválidos. Verifique as informações e tente novamente.",
  "Bad Request": "Dados inválidos. Verifique as informações e tente novamente.",
  
  // Server errors
  "500": "Erro no servidor. Tente novamente em alguns instantes.",
  "502": "Serviço temporariamente indisponível. Tente novamente.",
  "503": "Serviço em manutenção. Tente novamente em breve.",
  "504": "Tempo de resposta excedido. Tente novamente.",
  
  // Payment specific
  "QR code PIX não gerado": "Erro ao gerar QR code PIX. Tente novamente.",
  "Mercado Pago API error": "Erro no processamento do pagamento. Tente novamente.",
  
  // Database
  "violates row-level security": "Você não tem permissão para acessar estes dados.",
  "duplicate key": "Este registro já existe.",
};

// Patterns to detect sensitive information that should never be exposed
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /authorization/i,
  /supabase/i,
  /postgres/i,
  /sql/i,
  /database/i,
  /api\.mercadopago/i,
  /internal server error/i,
  /stack trace/i,
  /at\s+\w+\s+\(/i, // Stack trace pattern
  /\.(ts|js|tsx|jsx):\d+/i, // File paths with line numbers
];

/**
 * Sanitizes error messages for user display
 * @param error - The error object or message
 * @param fallbackMessage - Default message if error can't be mapped
 * @returns A user-friendly error message
 */
export function sanitizeErrorMessage(
  error: unknown,
  fallbackMessage = "Ocorreu um erro. Tente novamente."
): string {
  // Get the error message string
  let errorMessage = "";
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else if (error && typeof error === "object" && "message" in error) {
    errorMessage = String((error as { message: unknown }).message);
  }
  
  // Log the original error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error("[sanitizeErrorMessage] Original error:", error);
  }
  
  // Check if error contains sensitive information
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(errorMessage)) {
      console.warn("[sanitizeErrorMessage] Filtered sensitive error");
      return fallbackMessage;
    }
  }
  
  // Try to find a user-friendly message
  for (const [key, friendlyMessage] of Object.entries(USER_FRIENDLY_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return friendlyMessage;
    }
  }
  
  // If the error message is short and doesn't look technical, use it
  if (
    errorMessage.length > 0 &&
    errorMessage.length < 150 &&
    !/[{}\[\]<>]/.test(errorMessage) && // No JSON/HTML characters
    !SENSITIVE_PATTERNS.some(p => p.test(errorMessage))
  ) {
    return errorMessage;
  }
  
  return fallbackMessage;
}

/**
 * Creates a user-friendly error for toast notifications
 */
export function createUserError(
  error: unknown,
  context?: string
): { title: string; description: string } {
  const description = sanitizeErrorMessage(error);
  
  // Context-specific titles
  const contextTitles: Record<string, string> = {
    payment: "Erro no pagamento",
    login: "Erro no login",
    register: "Erro no cadastro",
    profile: "Erro ao atualizar perfil",
    alert: "Erro no alerta",
    upload: "Erro no upload",
    withdrawal: "Erro no saque",
    settings: "Erro nas configurações",
  };
  
  return {
    title: context ? contextTitles[context] || "Erro" : "Erro",
    description,
  };
}
