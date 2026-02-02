
Objetivo
- Voltar o projeto para um estado “como era antes” (funcionando/estável) e então reconstruir o overlay do OBS do zero com um caminho simples e verificável, eliminando causa raiz do “Streamer não encontrado”.

Contexto do que está acontecendo
- A mensagem “Streamer não encontrado” vem da página pública do streamer (PublicStreamerPage) quando a rota atual não é o overlay de fato, ou quando o overlay não consegue ler as configurações públicas e acaba caindo em um fluxo que tenta resolver um handle.
- Já mexemos em 2 frentes diferentes:
  1) Rotas (para impedir /overlay ser capturada por /:handle)
  2) Políticas de acesso anônimo (RLS) para leitura do overlay sem login
- Como você quer “refazer do absoluto zero para como era antes”, o caminho mais seguro é primeiro reverter para um ponto conhecido e depois reconstruir com um “mínimo viável” que só faz 2 coisas: ler settings pela key e renderizar uma tela transparente com logs claros.

Parte A — Voltar “como era antes” (reverter)
1) Reverter o projeto via Histórico (sem tentar desfazer manualmente em código)
   - Abrir a aba “History” (Histórico) e restaurar para uma mensagem/versão anterior a:
     - mudanças repetidas em rotas (App.tsx)
     - mudanças visuais no AlertPlayer/Overlay
     - migrações RLS recentes (se a versão antiga estava funcionando melhor)
2) Critério para escolher o ponto de restore
   - Escolher uma versão em que:
     - a navegação da aplicação está estável
     - a rota /overlay existe (ou pelo menos a base do app está ok)
   - Se você lembra “qual dia/hora” funcionava, melhor ainda: restaurar exatamente esse checkpoint.

Observação importante sobre banco de dados
- Restaurar código não necessariamente “desfaz” as mudanças no backend já aplicadas. Então depois do restore, a gente valida o backend como está e ajusta com segurança (não no escuro).

Parte B — Recomeçar do zero (MVP do overlay)
3) Definir um overlay mínimo e incontestável
   - /overlay?key=... deve fazer somente:
     a) Validar se tem ?key= (se não tiver, mostrar “Missing key”)
     b) Buscar 1 linha em public_widget_settings por public_key
     c) Se achou: mostrar uma tela 100% transparente e um pequeno texto de debug opcional (ativado por ?debug=1) confirmando streamer_id e settings carregadas
     d) Se não achou: mostrar “Invalid key”
   - Isso separa o problema em: “rota correta?” vs “acesso ao backend?” vs “fila/alertas”.

4) Blindar o roteamento para nunca cair no PublicStreamerPage
   - Garantir que:
     - /overlay esteja definido antes de /:handle
     - /:handle esteja sempre como rota absoluta (com “/”)
     - remover rotas duplicadas/confusas (por ex. /@:handle e /:handle) apenas se necessário, mas manteremos se for requisito do produto

Parte C — Conectar fila e alertas (depois que o MVP passa)
5) Só depois do MVP funcionando, ligar a fila
   - Buscar alert_queue (queued/playing) do streamer_id
   - Realtime: assinar INSERT de alert_queue filtrando streamer_id
   - Processamento de fila: tocar 1 alerta por vez, marcar playing/done (se isso depender de função protegida, manteremos o update via backend function com validação por public_key)

6) Só depois que a fila aparece, buscar detalhes do alerta (alerts)
   - Se houver bloqueio, o erro precisa ficar 100% explícito em tela quando ?debug=1 (ex.: “RLS blocked alerts select”)

Parte D — Ajustar permissões anônimas corretamente (sem “abrir demais”)
7) Revisar (de verdade) quais SELECTs o overlay faz anonimamente
   - public_widget_settings: SELECT anônimo precisa funcionar
   - alert_queue: SELECT anônimo precisa funcionar para queued/playing (idealmente restrito por streamer_id ligado à key)
   - alerts: SELECT anônimo precisa funcionar apenas para os alert_id que estão na fila ativa (queued/playing) e, idealmente, do streamer ligado à key

8) Refinar segurança (evitar policy ampla demais)
   - As policies que você sugeriu ajudam, mas podem expor alertas de qualquer streamer se alguém descobrir IDs na fila.
   - Versão “zero dúvidas” de segurança:
     - vincular anon SELECT sempre à public_key → streamer_id → fila do streamer, ao invés de somente “status IN (...)”.
   - Isso reduz chance de “vazamento lateral” e evita que qualquer pessoa consulte fila global.

Parte E — Testes guiados (para não ficar em loop)
9) Checkpoints de teste (sempre no domínio publicado)
   - Teste 1 (rota): abrir /overlay?key=... e confirmar que NÃO aparece “Streamer não encontrado”
   - Teste 2 (settings): com ?debug=1, ver streamer_id carregado
   - Teste 3 (fila): inserir 1 item queued (via fluxo normal do app) e ver contador/console no overlay
   - Teste 4 (alerta): tocar mídia/texto
   - Teste 5 (OBS): adicionar Browser Source e confirmar transparência

O que eu preciso de você (para o “como era antes” ser exato)
- Indicar qual foi a última versão em que “estava como antes” (aprox. horário/mensagem no histórico). Se você não souber, eu proponho restaurar 1–2 checkpoints atrás e validar rapidamente com os Testes 1 e 2.

Resultado esperado
- Você deixa de ver “Streamer não encontrado” porque:
  - a rota /overlay não cai mais em /:handle
  - o overlay tem mensagens de erro específicas (key faltando, key inválida, bloqueio de leitura) em vez de erro genérico de streamer
- E o overlay funciona no OBS sem login, de forma previsível.

Riscos e como mitigamos
- Risco: restaurar código mas o backend já estar “diferente”
  - Mitigação: validar cada SELECT do overlay com ?debug=1 e ajustar policies de forma mínima e rastreável
- Risco: policies anônimas ficarem amplas demais
  - Mitigação: atrelar acesso ao streamer derivado da public_key, não a uma policy global por status

Sequência de execução (ordem)
1) Restore pelo History para “como era antes”
2) Confirmar rota /overlay (Teste 1)
3) Implementar overlay MVP (Teste 2)
4) Conectar fila e alerts (Teste 3/4)
5) Ajustar RLS com base no que o overlay realmente consulta (Teste 2/3 novamente)
6) Validar no OBS (Teste 5)
