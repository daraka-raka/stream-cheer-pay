

# Plano: Tornar o Site Responsivo para Mobile

## Analise do Estado Atual

O projeto ja tem bastante trabalho responsivo feito (grids com `sm:`, `md:`, `lg:`, cards mobile para tabelas de transacoes). Os problemas restantes sao pontuais:

## Problemas Identificados

| Pagina | Problema | Impacto |
|--------|----------|---------|
| **Dashboard** | Grafico de receita com 300px fixos fica apertado em telas < 400px; labels do eixo X cortados | Alto |
| **Dashboard** | Chart period tabs (`7d/30d/90d`) pode sobrepor o titulo em telas pequenas | Medio |
| **Dashboard** | Grid de stats `grid-cols-2` funciona, mas cards opcionais (Ticket Medio, etc.) podem criar linhas desalinhadas | Baixo |
| **Settings** | Cards com `p-6` fixo desperdicam espaco em mobile | Medio |
| **Settings** | Secao "Links Publicos" com inputs `font-mono` pode estourar horizontalmente | Alto |
| **Settings** | Tabela de comissoes pode ficar apertada | Medio |
| **Alerts** | Dialog de criar/editar com `max-w-md` funciona, mas dialog de preview com `max-w-3xl` pode ser grande demais | Medio |
| **Alerts** | Preview dialog mostra imagem `max-h-[500px]` que pode empurrar conteudo para fora | Medio |
| **PublicStreamerPage** | Modal de compra `max-w-2xl` pode ser largo demais; preco `text-3xl` gigante | Medio |
| **PublicStreamerPage** | Card do alerta com `hover:-translate-y-1` e botao "Comprar" `opacity-0 group-hover:opacity-100` nao funciona em touch | Alto |
| **Notifications** | Pagina ja esta bem responsiva | - |
| **Transactions** | Ja tem view mobile com cards | - |
| **DashboardLayout** | Sidebar mobile funciona via Sheet | OK |

## Mudancas Planejadas

### 1. PublicStreamerPage — Corrigir UX Touch
- Remover `hover:-translate-y-1` em mobile (manter so `md:hover:`)
- Tornar botao "Comprar" sempre visivel em mobile (so esconder no `md:` hover)
- Modal de compra: `max-w-2xl` → `max-w-lg` e ajustar padding
- Preco no modal: `text-3xl` → `text-xl sm:text-3xl`

### 2. Dashboard — Charts Responsivos
- Reducir `h-[300px]` para `h-[220px] sm:h-[300px]` nos graficos
- Empilhar titulo + tabs do grafico em mobile (`flex-col sm:flex-row`)
- Esconder labels longas do eixo Y em mobile

### 3. Settings — Padding e Overflow
- Cards: `p-6` → `p-4 sm:p-6`
- Input de Widget URL: adicionar `break-all` e `text-xs` em mobile
- Instrucoes OBS: ajustar texto para nao estourar

### 4. Alerts — Dialogs Mobile
- Preview dialog: `max-w-3xl` → `max-w-3xl sm:max-w-3xl` com `max-h-[80vh] overflow-y-auto`
- Preview image: `max-h-[500px]` → `max-h-[250px] sm:max-h-[500px]`
- Cropper dialog: `max-w-2xl` → responsivo

### 5. Ajustes Gerais
- Garantir que todos os `DialogContent` tenham `max-h-[90vh] overflow-y-auto` para nao estourar em telas pequenas
- Verificar que `container mx-auto px-4` esta consistente

## Arquivos Modificados

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| `src/pages/PublicStreamerPage.tsx` | Touch UX, modal sizes, font sizes |
| `src/pages/Dashboard.tsx` | Chart heights, layout flex |
| `src/pages/Settings.tsx` | Card padding, input overflow |
| `src/pages/Alerts.tsx` | Dialog sizes, image heights |

## O Que NAO Muda
- Logica de negocio, backend, rotas
- Landing page (ja esta responsiva)
- Auth page (ja esta responsiva)
- Transactions (ja tem mobile cards)

