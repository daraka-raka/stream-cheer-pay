

# Plano: Corrigir Overlay para OBS - Refazer do Zero

## Diagnóstico do Problema

O erro **"Streamer não encontrado"** está acontecendo por um motivo simples:

A chave que você está usando na URL do OBS **não corresponde** à chave real no banco de dados.

| O que o banco tem | O que você provavelmente está usando |
|-------------------|--------------------------------------|
| `d6d1a32e-d484-43fd-8000-987fc50c3a0b` | `b0b57cdb376bdd85916f28486fb636d90a48c875b578eee2929de3334a6f88ca` (antiga) |

**A URL correta é:**
```
https://stream-cheer-pay.lovable.app/overlay?key=d6d1a32e-d484-43fd-8000-987fc50c3a0b
```

---

## O Que Vou Corrigir

Mesmo que a URL seja corrigida, o visual atual do overlay não está adequado para OBS. Vou refazer para que fique no estilo tradicional de alertas de stream.

### 1. Refazer o Componente AlertPlayer

Atualmente o `AlertPlayer` mostra uma "caixa" com fundo escuro, que não é apropriada para overlay transparente.

**Antes (problema atual):**
- Fundo sólido/escuro visível
- Caixa/card estilizada
- Não parece um overlay tradicional de stream

**Depois (como ficará):**
- Fundo totalmente transparente
- Apenas a mídia (imagem/vídeo) centralizada
- Nome de quem comprou e nota do comprador em texto com sombra
- Animação de entrada/saída suave (fade + scale)

### 2. Estrutura Visual do Novo Overlay

```text
+------------------------------------------+
|                                          |
|                                          |
|        +------------------------+        |
|        |                        |        |
|        |   [IMAGEM ou VIDEO]    |        |
|        |                        |        |
|        +------------------------+        |
|                                          |
|           "Título do Alerta"             |
|        "Mensagem do comprador"           |
|                                          |
+------------------------------------------+
         (tudo com fundo transparente)
```

### 3. Garantir Acesso Público Correto

Verificarei que:
- A view `public_widget_settings` está acessível sem login
- A rota `/overlay` não passa por proteção de autenticação
- Os alertas da fila podem ser lidos pelo overlay

---

## Etapas de Implementação

### Etapa 1: Refatorar o AlertPlayer para Overlay Tradicional

Vou modificar `src/components/AlertPlayer.tsx`:
- Remover o card/background escuro
- Usar apenas a mídia com bordas arredondadas e sombra
- Adicionar texto com sombra (legível em qualquer fundo)
- Animar entrada (fade-in + scale) e saída (fade-out)

### Etapa 2: Ajustar o Overlay.tsx

- Garantir que o fundo seja `transparent` e não `bg-transparent` (CSS inline)
- Remover qualquer wrapper que adicione fundo
- Ajustar posicionamento baseado nas configurações do streamer

### Etapa 3: Validar Políticas RLS

Confirmar que a view `public_widget_settings` e a tabela `alert_queue` permitem leitura anônima para que o overlay funcione no OBS (navegador sem login).

---

## Resumo Técnico

| Arquivo | Alteração |
|---------|-----------|
| `src/components/AlertPlayer.tsx` | Refatorar visual: remover card, fundo transparente, texto com sombra, animações |
| `src/pages/Overlay.tsx` | Garantir `background: transparent` forçado no body e container |
| Políticas RLS | Já corrigidas na migração anterior (apenas validação) |

---

## Teste Final

Após as alterações:

1. Abra em aba anônima: `https://stream-cheer-pay.lovable.app/overlay?key=d6d1a32e-d484-43fd-8000-987fc50c3a0b`
2. Deve aparecer uma tela vazia/transparente (sem erro, sem login)
3. Envie um alerta de teste pela página de Alertas
4. O overlay deve mostrar a mídia + texto com animação

