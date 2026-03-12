

<analise_de_seguranca>

## Vetores de Ataque Identificados

### CRITICO 1: Emails de streamers expostos publicamente
- Tabela `streamers` tem SELECT com `USING (true)` para `anon,authenticated`
- Campos `email` e `auth_user_id` acessiveis por qualquer usuario anonimo
- Atacante pode fazer scraping de todos os emails via API publica
- Impacto: violacao de privacidade, phishing, LGPD

### CRITICO 2: Tabela `settings` expoe `webhook_url` para anonimos
- Politica "Anon can view widget settings via view" com `USING (true)`
- O overlay so precisa de campos especificos (duracao, posicao), mas a politica SELECT expoe TUDO
- `webhook_url` exposto permite que atacantes descubram endpoints privados

### CRITICO 3: Politica RLS `alert_queue` ALL com `USING (true)`
- "Service role can manage queue" aplica a `{public}` com USING(true)
- Isso da acesso total (INSERT/UPDATE/DELETE/SELECT) a qualquer usuario
- Atacante pode deletar fila inteira ou inserir alertas falsos
- A intencao era `service_role` mas esta aplicado a `public`

### ALTO 4: OAuth state sem protecao CSRF
- `Settings.tsx` linha 473: `state = btoa(JSON.stringify({ streamer_id: streamer.id }))`
- O state e deterministico e previsivel - qualquer pessoa que saiba o `streamer_id` pode forjar
- `MercadoPagoCallback.tsx` aceita qualquer state sem validar que pertence ao usuario logado
- Atacante pode vincular a conta MP dele ao streamer de outra pessoa

### ALTO 5: `mp-exchange-token` nao valida autenticacao
- A edge function aceita qualquer `streamer_id` sem verificar que o chamador e o dono
- `verify_jwt = false` no config.toml
- Qualquer pessoa com um code OAuth valido pode vincular a conta de qualquer streamer

### MEDIO 6: `VITE_MP_CLIENT_ID` exposto no cliente
- O Client ID do Mercado Pago esta no .env como variavel VITE_ (exposta no bundle)
- Client ID nao e secret, mas a mensagem de erro na linha 501 expoe o nome da variavel

### MEDIO 7: Leaked password protection desativada
- Scanner detectou que HIBP esta desativado apesar do config.toml dizer `enable_hibp = true`
- Pode ser que a config nao foi aplicada corretamente

### MEDIO 8: Headers de seguranca ausentes no index.html
- Sem Content-Security-Policy
- Sem X-Content-Type-Options
- Sem Referrer-Policy
- Sem Permissions-Policy

### MEDIO 9: buyer_note sem sanitizacao no backend
- `create-pix-payment` salva buyer_note direto no banco sem strip de HTML
- React escapa no JSX, mas o overlay pode renderizar em contextos diferentes
- O campo `buyer_note` tambem aparece no payload do `alert_queue` (campo JSONB)

### BAIXO 10: Erro 500 do create-pix-payment vaza mensagem interna
- Linha 280-281: `JSON.stringify({ error: errorMessage })` envia mensagem de erro original
- Pode expor detalhes do MP API ou infraestrutura

### BAIXO 11: Build error existente
- `AlertPlayer.tsx` linha 39: `NodeJS` namespace nao encontrado (falta type import)

### INFO 12: `public_streamer_profiles` view sem RLS policies
- A view existe mas nao tem politicas definidas - inconsistencia

</analise_de_seguranca>

---

# Plano de Correcoes de Seguranca

## 1. [CRITICO] Corrigir RLS da `alert_queue` - policy ALL com USING(true)
A politica "Service role can manage queue" esta aplicada ao role `public` em vez de `service_role`. Corrigir para aplicar apenas ao `service_role`.

**Migracao SQL:**
```sql
DROP POLICY "Service role can manage queue" ON public.alert_queue;
CREATE POLICY "Service role can manage queue"
ON public.alert_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
```

## 2. [CRITICO] Restringir SELECT na tabela `streamers` para nao expor email
Substituir a politica publica por uma que exclui campos sensiveis. Como nao podemos fazer column-level RLS, a solucao e:
- Manter SELECT publico somente via a view `public_streamer_profiles` (que ja exclui email)
- Restringir SELECT direto na tabela `streamers` para apenas o proprio usuario

**Migracao SQL:**
```sql
DROP POLICY "Public can view streamer profiles" ON public.streamers;
CREATE POLICY "Public can view basic streamer info"
ON public.streamers FOR SELECT TO anon, authenticated
USING (true);
-- Mas precisamos garantir que a view public_streamer_profiles
-- e o unico ponto de acesso publico e que ela nao expoe email.
-- Como a view ja existe e exclui email, vamos criar uma security definer function
-- para acesso publico e restringir o SELECT direto.
```

Na verdade, o overlay e a pagina publica ja usam `get_public_streamer_profile` (RPC). O problema e que a politica `Public can view streamer profiles` permite SELECT direto na tabela `streamers` para `anon`. Vamos restringi-la.

**Migracao SQL:**
```sql
DROP POLICY "Public can view streamer profiles" ON public.streamers;
-- Manter acesso publico apenas para campos nao-sensiveis via colunas especificas
-- Como RLS nao suporta column-level, usamos a abordagem de security definer functions
-- A RPC get_public_streamer_profile ja existe e e SECURITY DEFINER
-- O overlay usa public_widget_settings (view)
-- Precisamos manter SELECT para anon pois o overlay busca alerts que fazem join com streamers
-- Solucao: criar uma view segura ou aceitar que o email esta exposto
-- Melhor solucao: remover a politica anon e ajustar o overlay para nao precisar de SELECT direto
```

## 3. [CRITICO] Restringir SELECT na tabela `settings` para anon
Remover politica "Anon can view widget settings via view" e garantir que a view `public_widget_settings` funcione com SECURITY DEFINER.

**Migracao SQL:**
```sql
DROP POLICY "Anon can view widget settings via view" ON public.settings;
-- A view public_widget_settings precisa de acesso, entao criamos uma
-- funcao SECURITY DEFINER que retorna apenas os campos necessarios
```

## 4. [ALTO] Proteger OAuth flow contra CSRF
- Adicionar token aleatorio ao `state` do OAuth e validar no callback
- Validar no `mp-exchange-token` que o `streamer_id` pertence ao usuario autenticado

## 5. [ALTO] Autenticar `mp-exchange-token`
- Exigir Authorization header e validar que o usuario autenticado e dono do `streamer_id`

## 6. [MEDIO] Sanitizar `buyer_note` no backend
- Strip HTML tags antes de salvar no banco

## 7. [MEDIO] Sanitizar erro no `create-pix-payment` resposta 500
- Retornar mensagem generica em vez da mensagem de erro original

## 8. [MEDIO] Adicionar meta headers de seguranca no `index.html`

## 9. [BAIXO] Corrigir build error `NodeJS` namespace em AlertPlayer.tsx

## 10. [MEDIO] Ativar leaked password protection

---

## Resumo de Prioridades

| # | Severidade | Correcao | Tipo |
|---|-----------|----------|------|
| 1 | CRITICO | alert_queue RLS: public -> service_role | DB Migration |
| 2 | CRITICO | streamers: restringir SELECT anon (email exposto) | DB Migration |
| 3 | CRITICO | settings: restringir SELECT anon (webhook_url exposto) | DB Migration |
| 4 | ALTO | OAuth CSRF protection no state | Code + Edge Function |
| 5 | ALTO | mp-exchange-token: autenticar usuario | Edge Function |
| 6 | MEDIO | Sanitizar buyer_note (strip HTML) | Edge Function |
| 7 | MEDIO | Erro generico no create-pix-payment | Edge Function |
| 8 | MEDIO | Security headers no index.html | HTML |
| 9 | BAIXO | Fix NodeJS namespace (AlertPlayer.tsx) | Code |
| 10 | MEDIO | Leaked password protection | Auth Config |

