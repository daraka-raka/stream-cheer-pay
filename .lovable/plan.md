

# Plano: Corrigir Políticas RLS para Widget do OBS

## Problema Identificado

O widget do OBS não consegue acessar os dados porque as políticas RLS atuais **não especificam explicitamente** o role `anon`. 

### Políticas Atuais

| Tabela | Política | Roles | Problema |
|--------|----------|-------|----------|
| `alerts` | "Public can view published alerts" | `{public}` | Não inclui `anon` explicitamente; só permite alertas com `status = 'published'` |
| `alert_queue` | "Public can view active queue items" | `{public}` | Não inclui `anon` explicitamente |
| `streamers` | "Public can view streamer profiles" | `{anon, authenticated}` | OK |
| `settings` | "Public can view settings for widget" | `{anon, authenticated}` | OK |

### Fluxo do Widget (o que precisa funcionar)

1. Widget carrega `public_widget_settings` (view) → **OK** (settings já tem `anon`)
2. Widget carrega `alert_queue` com `status = 'queued'` → **FALHA** (não tem `anon`)
3. Widget carrega detalhes do `alerts` pelo `alert_id` → **FALHA** (não tem `anon` + condição errada)

---

## Solução

Criar duas novas políticas RLS com `TO anon` explícito:

### 1. Política para `alerts` - Widget Acessar Alertas na Fila

```sql
CREATE POLICY "Widget can view alerts in queue"
ON public.alerts
FOR SELECT
TO anon
USING (
  id IN (
    SELECT alert_id FROM public.alert_queue
    WHERE status IN ('queued', 'playing')
  )
);
```

**Por que essa condição?**
- Só expõe alertas que estão ativamente na fila
- Não expõe todos os alertas do streamer
- Segurança mínima necessária

### 2. Política para `alert_queue` - Widget Acessar Itens Ativos

```sql
CREATE POLICY "Widget can view active queue for anon"
ON public.alert_queue
FOR SELECT
TO anon
USING (status IN ('queued', 'playing'));
```

**Nota:** Já existe uma política similar, mas sem `TO anon`. Precisamos criar uma nova com `anon` explícito.

---

## Migração SQL Completa

```sql
-- 1. Política para widget acessar alertas que estão na fila
CREATE POLICY "Widget can view alerts in queue"
ON public.alerts
FOR SELECT
TO anon
USING (
  id IN (
    SELECT alert_id FROM public.alert_queue
    WHERE status IN ('queued', 'playing')
  )
);

-- 2. Política para widget acessar itens ativos da fila
CREATE POLICY "Widget can view active queue for anon"
ON public.alert_queue
FOR SELECT
TO anon
USING (status IN ('queued', 'playing'));
```

---

## Por Que Isso Resolve

| Ação do Widget | Antes | Depois |
|----------------|-------|--------|
| Ler `public_widget_settings` | OK | OK |
| Ler `alert_queue` (status queued) | BLOQUEADO | PERMITIDO |
| Ler `alerts` pelo `alert_id` | BLOQUEADO | PERMITIDO |
| Assinar Realtime `alert_queue` | BLOQUEADO | PERMITIDO |

---

## Teste Após Migração

1. Abra em aba anônima: `https://stream-cheer-pay.lovable.app/overlay?key=SEU_PUBLIC_KEY`
2. Deve aparecer tela vazia (sem erro "Streamer não encontrado")
3. Envie alerta de teste - deve aparecer no overlay
4. Confira no OBS com fonte Browser nova

