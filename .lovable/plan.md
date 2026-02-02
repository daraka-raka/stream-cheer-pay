

# Plano: Corrigir Conflito de Rotas do Overlay

## Problema Identificado

A rota `/overlay` está sendo capturada pela rota `:handle` (linha 43) porque:

1. A rota `:handle` está definida **sem barra inicial** (`path=":handle"`)
2. O React Router interpreta isso como um padrão que pode corresponder ao primeiro segmento de qualquer caminho
3. Resultado: `/overlay?key=...` é tratado como `handle = "overlay"` pela `PublicStreamerPage`
4. Como não existe streamer com handle "overlay", aparece "Streamer não encontrado"

### Evidências

| URL Acessada | Rota Esperada | Rota Capturada | Resultado |
|--------------|---------------|----------------|-----------|
| `/overlay?key=f345...` | `/overlay` | `:handle` | "Streamer não encontrado" |

A screenshot do banco mostra que os dados existem e estão corretos:
- `public_key: f3456aca-e6f7-4f7f-b2fd-5b8bab7695a2`
- `streamer_id: 7d011bbe-38cd-4e5b-954f-4110d4736453`

---

## Solução

Alterar a ordem e o formato das rotas no `App.tsx` para garantir que `/overlay` seja processada antes do catch-all de handles.

### Modificação no App.tsx

**Antes:**
```tsx
<Route path="/overlay" element={<Overlay />} />
<Route path="/@:handle" element={<PublicStreamerPage />} />
<Route path=":handle" element={<PublicStreamerPage />} />
<Route path="*" element={<NotFound />} />
```

**Depois:**
```tsx
<Route path="/overlay" element={<Overlay />} />
<Route path="/@:handle" element={<PublicStreamerPage />} />
<Route path="/:handle" element={<PublicStreamerPage />} />  {/* Adicionada barra inicial */}
<Route path="*" element={<NotFound />} />
```

A adição da barra `/` antes de `:handle` transforma a rota em absoluta, garantindo que ela só corresponda a caminhos que começam com um segmento após a raiz, e não interfira com rotas específicas como `/overlay`.

---

## Por Que Isso Acontece

No React Router v6:
- `path=":handle"` pode ser interpretado como relativo ao contexto atual
- `path="/:handle"` é explicitamente um caminho absoluto que corresponde a `/{qualquer-coisa}`

A rota `/overlay` deveria ter prioridade por ser mais específica, mas sem a barra inicial no `:handle`, o roteador pode ter comportamento inesperado.

---

## Teste Após Correção

1. Abra em aba anônima: `https://stream-cheer-pay.lovable.app/overlay?key=f3456aca-e6f7-4f7f-b2fd-5b8bab7695a2`
2. Deve aparecer tela **vazia/transparente** (sem erro, sem "Carregando...")
3. O console deve mostrar logs `[Overlay] Settings loaded: {...}`
4. Adicione como fonte Browser no OBS - deve funcionar transparente

---

## Resumo Técnico

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Linha 43: Alterar `path=":handle"` para `path="/:handle"` |

