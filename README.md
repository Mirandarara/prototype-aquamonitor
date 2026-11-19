# AquaMonitor · Laboratório 3D

Maquete Three.js do percurso **chuva → rua → galeria → bomba → mangueira → barragem → reaproveitamento controlado pelo relé 2**. Remodelagem do laboratório existente, com os mesmos controles OrbitControls, serviço MQTT e motor hidráulico. Não há reservatório intermediário nem segunda bomba na cena.

## Executar

Requer Node 22.18+ ou 24+ para desenvolver e um navegador com WebGL2.

```bash
npm ci
npm run dev -- --port 5174
npm test
npm run build
```

Para apresentar sem internet, gere `dist/` e execute `./start-presentation.sh`; abra **http://localhost:4174**. O lançador usa Python 3. Three.js, MQTT, estilos e geometrias estão locais, sem CDN ou modelos remotos. `npm ci` precisa de internet na primeira instalação. Copie `dist/` e o lançador juntos para outro notebook; não abra o HTML com `file://`.

## Explorar e apresentar

- A navegação superior e as miniaturas reais oferecem visão geral, cidade, corte transversal, subsolo, bombeamento, barragem, eletrônica, reúso e vista explodida. As miniaturas são renderizadas uma vez no mesmo contexto WebGL.
- **Camadas** controla ambiente, superfície, estrutura, hidráulica e eletrônica. Cada camada tem visibilidade, transparência e isolamento. **Raio-X** controla o solo independentemente da vista explodida. **Restaurar camadas** desfaz o isolamento e os deslocamentos.
- **Apresentação** executa dez etapas, com câmera, destaque e entradas do próprio simulador. O tempo usa 30× para que a drenagem automática ocorra na etapa correspondente. É possível pausar, avançar, retroceder ou encerrar; o estado local anterior é restaurado. Retroceder navega pelo roteiro sem rebobinar o balanço hidráulico.
- Clique em um componente para inspecioná-lo. **Aproximar** move a câmera; **Voltar** retorna à perspectiva anterior. A inspeção do sensor inclui distância, altura e validade da leitura.
- **Foco** oculta a interface. Esc restaura os controles ou encerra a apresentação. Monitoramento e miniaturas também podem ser recolhidos separadamente.
- Chuva, pausa, velocidade, falha do sensor, alerta, reinício, reúso e modo automático/manual da drenagem continuam disponíveis no modo local. Os comandos ficam bloqueados nas fontes externas.
- **Configurações** oferece qualidade automática, baixa, média ou alta. Arraste para orbitar, use scroll/pinça para zoom e botão direito para mover.

## Modelo hidráulico e semântica dos dados

- O único HC-SR04 fica acima da rua, voltado para a água. O datum do pavimento é 0,39 e o vão de 30 cm corresponde a 0,9 unidade da cena: altura = 30 − distância. `level_pct`/`level_cm` continuam sendo recebidos sem alteração. O motor legado mantém o nome `galleryLiters`; a água subterrânea usa uma projeção didática sincronizada, sem segunda medição ou segundo balanço físico independente. A instalação física deve respeitar a mesma referência de calibração do firmware.
- `drain_on` controla o estado da bomba que transporta **diretamente para a barragem**. No modo conectado, as partículas seguem o acionamento informado pelo ESP32 e param quando a telemetria expira. A leitura MQTT nunca é alterada pelo cálculo visual.
- O motor existente já conservava volume entre a galeria e um armazenamento a jusante. Seu campo interno `tankLiters` agora corresponde à **barragem**, e `reusedTotal` contabiliza a água que deixou o sistema para irrigação. Os nomes internos foram mantidos para reaproveitar o motor. Não há terceiro volume nem retorno automático à galeria.
- O motor conserva `galeria + barragem + reúso acumulado + transbordamento = volume inicial + chuva acumulada` (mais aportes explícitos quando usados). Mantém passos de 0,25 segundo simulado, capacidades, histerese de 20/12 cm e proteção do sensor.
- As unidades internas do motor são didáticas: galeria de 30 unidades, armazenamento de 40, entrada máxima 3/min, drenagem 2/min e reúso 1,2/min. Não dimensionam uma cidade nem são medições físicas da barragem. A interface exibe **Volume estimado em %**, iniciando em 12,5%.
- No MQTT, o volume da barragem não é medido: não há percentual ou integração inventada. A geometria da barragem permanece na cena, sem uma lâmina que aparentaria uma medição. `tank_full` e `tank_empty` continuam no contrato e na validação original, mas **não são reinterpretados como sensores da barragem**. O ESP32 continua decidindo seus próprios estados e alarmes.
- O firmware usa GPIO 26 para o relé de drenagem e GPIO 27 para o relé de reúso. Dois módulos e seus LEDs aparecem na estação técnica. `reuse_on` controla a animação do percurso descendente barragem → irrigação. O circuito não identifica o atuador final como bomba ou válvula; essa definição depende da montagem física. As proporções são aproximadas, sem modelo CAD metrológico.
- Chuva é exclusiva da demonstração, pois o payload não informa precipitação. Ao pausar ou perder telemetria, fluxos e ondulações de entrada param. O último nível pode permanecer esmaecido e identificado como desatualizado.

## MQTT, Wokwi e dashboard

- WSS: `wss://d684655e.ala.us-east-1.emqxsl.com:8084/mqtt`.
- Tópicos: `aquamonitor/demo-29out-b741d2/{telemetria,comandos,status}`.
- Selecione **ESP32 · MQTT**, abra **Conexão EMQX Cloud e entradas virtuais** e insira credenciais temporárias. Os campos são limpos após conectar; somente o cliente MQTT mantém as credenciais em memória para reconectar. Nenhuma senha entra no código, variáveis públicas, armazenamento do navegador, logs ou bridge.
- No modo direto, escolha sensor ou entradas virtuais. Nível e boias são enviados a cada 2 s; a maquete mostra apenas a resposta recebida. Ao sair, o envio periódico termina e `{"mode":"sensor"}` é publicado antes de desconectar, se a rede estiver disponível. `drain_on`/`reuse_on` nunca são comandados pelo navegador.
- Uma conexão por sessão; `clientId` único, reconexão em 2 s, reinscrição e limpeza dos listeners. Telemetria retida ou inválida não comprova atualização. Após 6 s aparece um aviso de atraso, com a idade da última leitura. Após 15 s sem dados válidos, os fluxos param e os estados ficam desconhecidos. Broker, status ESP32 e atualidade da telemetria são apresentados separadamente.
- Todos os 18 campos do contrato são validados, incluindo device, flags de conexão, seq e uptime_ms. Falha do sensor oculta leitura numérica. As boias não são convertidas em litros ou percentual da barragem.
- A cópia independente mantém seu modo local. A cópia integrada em `/home/mateus/Downloads/Aqua onitor/prototype-3d` preserva `DashboardSimulationController`, o botão Dashboard e `?source=dashboard&embed=true`: nesse modo recebe snapshots pelo BroadcastChannel, sem abrir outro cliente MQTT nem receber credenciais.
- Produção exige bridge/backend autenticado, com autorização e credenciais mantidas no servidor. O acesso WSS direto com senha temporária é exclusivamente para a demonstração local.

Roteiro completo e lista de arquivos: `/home/mateus/Downloads/Aqua onitor/docs/INTEGRACAO-EMQX.md`. Nenhuma alteração de firmware faz parte desta integração.

## Arquivos e responsabilidades

- `src/scene/Infrastructure.js`: galeria em corte, sensor, ESP32, uma bomba, barragem com relevo e saída para irrigação; coordenadas das mangueiras.
- `src/scene/City.js`: adaptação da cidade existente à região esquerda e abertura do terreno para inspeção.
- `src/scene/Water.js`: chuva, escoamento superficial sem mangueiras decorativas, partículas instanciadas e percurso gravitacional descendente.
- `src/scene/SceneManager.js`: animações condicionadas aos estados, níveis separados, corte suave, seleção de componentes, qualidade e descarte de recursos.
- `src/scene/CameraController.js`: nove perspectivas e detalhe do sensor com transições suaves.
- `src/simulation/SimulationController.js`: projeção da telemetria e modo local, sem gerar estados hidráulicos no modo MQTT.
- `src/features/simulation/engine/simulation.ts`: controle manual opcional da drenagem, preservando modo automático, balanço e proteções.
- `src/ui/Controls.js` e `src/styles/main.css`: títulos, inspeção, tour opcional, controles e espaço reservado ao painel lateral.
- `src/scene/Layers.js`: offsets reversíveis, isolamento e opacidades independentes.
- `src/ui/Presentation.js`: roteiro, pausa e restauração do estado.
- `tests/redesign.test.mjs`, `tests/simulation.test.mjs` e `tests/scene.test.mjs`: testes hidráulicos, telemetria emulada, geometria e direção de fluxo.

## Validação e limites

`npm test` cobre o motor e a cena, incluindo novos testes de camadas e apresentação: coleta, bombeamento direto, interrupção, reúso sem retorno, conservação/capacidade, proteção manual, pausa/reinício, dados MQTT válidos/inválidos/retidos, expiração/offline/recuperação, isolamento dos controles, trajetória descendente e enquadramentos. Os testes de MQTT usam um cliente emulado, sem publicar na rede.

Inspeção no navegador local cobre os controles, a maquete e os estados sem conexão. O build usa as dependências existentes; nenhum pacote novo foi adicionado. O bundle Three.js pode gerar o aviso de chunk acima de 500 kB, sem impedir o build.

Permanecem necessários o ensaio ponta a ponta com ESP32/Wokwi transmitindo, a validação na aplicação completa do dashboard e o teste em Firefox/Linux no notebook da apresentação. O navegador integrado não substitui essa matriz de hardware. A remodelagem usou o desenho do protótipo físico e as referências visuais anexadas ao pedido, além da descrição textual e dos componentes procedurais existentes.

### Limites do redesign v2

A direção visual segue a referência com geometria procedural low-poly; não reproduz o fotorrealismo da imagem. Não foram adicionados Blender, modelos externos ou dependências. A água usa ondulação de vértices/normais, transparência e partículas; o ambiente procedural oferece reflexos estáticos, sem reflexão da cena em tempo real nem solver de fluidos. Chuva não é medição do ESP32. O volume da barragem permanece estimado.

A cópia integrada mantém `DashboardSimulationController`, `?embed=true` e `?source=dashboard`. As duas pastas recebem os módulos visuais, mas seus pontos de entrada e controles de fonte continuam distintos. A validação automatizada usa MQTT emulado; o ensaio com ESP32/Wokwi transmitindo e a inspeção final em dispositivos móveis ainda são necessários.

### Melhorias visuais do colaborador

As melhorias compatíveis da branch `demonstracao-tecnica` (commit `123589b`) foram adaptadas para o circuito de uma bomba: cidade com fachadas e telhados texturizados, lojas, calçadas, trânsito com semáforos, pedestres e guarda-chuvas, árvores com vento e respingos. A iluminação procedural muda com a chuva, incluindo nuvens, janelas e postes iluminados durante a tempestade. As texturas são geradas localmente, sem downloads adicionais.

Foram preservados o declive calibrado da rua, a abertura de inspeção, o bombeamento direto à barragem, o reúso por gravidade, o motor e os controles existentes. O reservatório intermediário e a segunda bomba da branch do colaborador não foram incorporados. As animações respeitam pausa e dados atuais; a qualidade gráfica limita o número de respingos. Os materiais animados continuam funcionando com transparência, isolamento e vista explodida.

## Dashboard do aplicativo

Para abrir o Dashboard integrado a partir desta pasta, execute `npm run dashboard`.
O comando inicia o aplicativo em `/home/mateus/Downloads/Aquaonitor`, que mantém
a maquete incorporada e os controles do Dashboard. `npm run dev` continua abrindo
o laboratório independente. O guia de conexão do banco está em
`/home/mateus/Downloads/Aquaonitor/docs/database.md`.
