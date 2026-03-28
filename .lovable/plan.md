

# Plano: 4 Correções Pontuais

## 1. Hero — Fonte do título (Landing.tsx)

A imagem de referência mostra "Apareça" em uma fonte sans-serif bold/geométrica (tipo Syne) e "na live." em itálico mais leve e cinza. O código atual já faz isso, mas o `em` tem classes conflitantes (`not-italic` junto com `style={{ fontStyle: 'italic' }}`).

**Correção**: Remover `not-italic` da classe do `em`, garantir que "Apareça" use `font-display` (Syne) e "na live." use `font-body` (DM Sans) italic light, como na referência.

## 2. Toggle de tema claro/escuro

O `ThemeProvider` do `next-themes` está presente no `App.tsx` e o toggle existe em `Settings.tsx`. O problema é que na refatoração anterior, o sidebar perdeu o toggle de tema (foi removido). O toggle nos Settings (linha ~884) continua existente.

**Correção**: Verificar se o toggle em Settings funciona. Se o problema é que o usuário não encontra o toggle fora de Settings, re-adicionar um toggle rápido na Sidebar ou no header do Dashboard.

## 3. Gráficos do Dashboard (Receita + Status)

Os gráficos de "Receita no Período" e "Status das Transações" só mostram dados de transações **pagas reais** (exclui `test_mode`). Se não houve renda, é esperado que fiquem vazios. O código em `use-dashboard-data.ts` filtra `alerts.test_mode = false` e `status = paid`.

**Correção**: Adicionar um estado vazio visual nos gráficos — em vez de mostrar um chart vazio, exibir uma mensagem tipo "Nenhuma receita neste período" no gráfico de receita (igual ao que já existe no de status). Isso confirma ao usuário que não é bug.

## 4. CSV — Melhorar formatação (Transactions.tsx)

Problemas atuais do CSV:
- Valores monetários sem prefixo "R$"
- Campos com vírgula ou aspas podem quebrar o CSV (buyer_note)
- Sem BOM UTF-8 (Excel no Windows mostra acentos errados)
- Header "Taxa Stripe" deveria ser "Taxa Gateway"

**Correção**:
- Adicionar BOM UTF-8 (`\uFEFF`) no início
- Usar separador `;` (padrão brasileiro para Excel)
- Formatar valores com "R$ " prefixo
- Escapar campos com aspas duplas
- Traduzir status (paid → Pago, pending → Pendente, failed → Falhou)
- Renomear "Taxa Stripe" → "Taxa Gateway"

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Landing.tsx` | Fix classes do `em` no hero |
| `src/components/AppSidebar.tsx` | Re-adicionar toggle de tema (ícone sol/lua) |
| `src/pages/Dashboard.tsx` | Mensagem de estado vazio no gráfico de receita |
| `src/pages/Transactions.tsx` | Reformatar exportação CSV |

