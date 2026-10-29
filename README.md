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
- `drain_on` controla o estado da bomba que transporta **diretamente para a barragem**. Sem acionamento, sem água disponível ou sem telemetria atual, não há partículas de transporte. A leitura MQTT nunca é alterada pelo cálculo visual.
- O motor existente já conservava volume entre a galeria e um armazenamento a jusante. Seu campo interno `tankLiters` agora corresponde à **barragem**, e `reusedTotal` contabiliza a água que deixou o sistema para irrigação. Os nomes internos foram mantidos para reaproveitar o motor. Não há terceiro volume nem retorno automático à galeria.
- O motor conserva `galeria + barragem + reúso acumulado + transbordamento = volume inicial + chuva acumulada` (mais aportes explícitos quando usados). Mantém passos de 0,25 segundo simulado, capacidades, histerese de 20/12 cm e proteção do sensor.
- As unidades internas do motor são didáticas: galeria de 30 unidades, armazenamento de 40, entrada máxima 3/min, drenagem 2/min e reúso 1,2/min. Não dimensionam uma cidade nem são medições físicas da barragem. A interface exibe **Volume estimado em %**, iniciando em 12,5%.
- No MQTT, o percentual da barragem é uma estimativa integrada, limitada entre 0 e 100%. `tank_full` e `tank_empty` continuam no contrato e na validação original, mas **não são reinterpretados como sensores da barragem**. O ESP32 continua decidindo seus próprios estados e alarmes.
- O firmware usa GPIO 26 para o relé de drenagem e GPIO 27 para o relé de reúso. Dois módulos e seus LEDs aparecem na estação técnica. `reuse_on` controla a animação do percurso descendente barragem → irrigação. O circuito não identifica o atuador final como bomba ou válvula; essa definição depende da montagem física. As proporções são aproximadas, sem modelo CAD metrológico.
- Chuva é exclusiva da demonstração, pois o payload não informa precipitação. Ao pausar ou perder telemetria, fluxos e ondulações de entrada param. O último nível pode permanecer esmaecido e identificado como desatualizado.

## MQTT, Wokwi e dashboard

A implementação de conexão e o parser em `src/features/esp32/` não foram alterados.

- Broker: `wss://broker.emqx.io:8084/mqtt`.
- Telemetria: `aquamonitor/demo-29out-b741d2/telemetria`.
- Status: `aquamonitor/demo-29out-b741d2/status`.
- Referência Wokwi já documentada no projeto: https://wokwi.com/projects/478540696015596545.

O laboratório só assina tópicos. Não publica comandos nem muda `input_mode`. Há uma conexão ativa somente no modo MQTT, encerrada ao retornar à demonstração. Retidos não comprovam atualização; dados válidos expiram em **6 segundos**. Desconexão, status offline e expiração interrompem os fluxos e mostram estados desconhecidos. Falha do sensor oculta a leitura numérica de telemetria. A identificação `device` aparece quando o payload a fornece; sua ausência não é substituída por uma identificação inventada.

Este repositório contém o laboratório independente e cópias dos módulos compartilhados; não contém a aplicação React do dashboard, um transporte de dados por iframe ou um terceiro modo Dashboard. A remodelagem preserva o consumo somente leitura e o contrato disponíveis. Uma validação do dashboard completo depende do repositório original.

## Arquivos e responsabilidades

- `src/scene/Infrastructure.js`: galeria em corte, sensor, ESP32, uma bomba, barragem com relevo e saída para irrigação; coordenadas das mangueiras.
- `src/scene/City.js`: adaptação da cidade existente à região esquerda e abertura do terreno para inspeção.
- `src/scene/Water.js`: chuva, escoamento superficial sem mangueiras decorativas, partículas instanciadas e percurso gravitacional descendente.
- `src/scene/SceneManager.js`: animações condicionadas aos estados, níveis separados, corte suave, seleção de componentes, qualidade e descarte de recursos.
- `src/scene/CameraController.js`: nove perspectivas e detalhe do sensor com transições suaves.
- `src/simulation/SimulationController.js`: adaptação do armazenamento à barragem e estimativa visual MQTT sem interferir nas leituras.
- `src/features/simulation/engine/simulation.ts`: controle manual opcional da drenagem, preservando modo automático, balanço e proteções.
- `src/ui/Controls.js` e `src/styles/main.css`: títulos, inspeção, tour opcional, controles e espaço reservado ao painel lateral.
- `src/scene/Layers.js`: offsets reversíveis, isolamento e opacidades independentes.
- `src/ui/Presentation.js`: roteiro, pausa e restauração do estado.
- `tests/redesign.test.mjs`, `tests/simulation.test.mjs` e `tests/scene.test.mjs`: testes hidráulicos, telemetria emulada, geometria e direção de fluxo.

## Validação e limites

`npm test` cobre o motor e a cena, incluindo novos testes de camadas e apresentação: coleta, bombeamento direto, interrupção, reúso sem retorno, conservação/capacidade, proteção manual, pausa/reinício, dados MQTT válidos/inválidos/retidos, expiração/offline/recuperação, isolamento dos controles, trajetória descendente e enquadramentos. Os testes de MQTT usam um cliente emulado, sem publicar na rede.

Inspeção no navegador local cobre os controles, a maquete, as vistas e o modo somente leitura. O build usa as dependências existentes; nenhum pacote novo foi adicionado. O bundle Three.js pode gerar o aviso de chunk acima de 500 kB, sem impedir o build.

Permanecem necessários o ensaio ponta a ponta com ESP32/Wokwi transmitindo, a validação na aplicação completa do dashboard e o teste em Firefox/Linux no notebook da apresentação. O navegador integrado não substitui essa matriz de hardware. A remodelagem usou o desenho do protótipo físico e as referências visuais anexadas ao pedido, além da descrição textual e dos componentes procedurais existentes.

### Limites do redesign v2

A direção visual segue a referência com geometria procedural low-poly; não reproduz o fotorrealismo da imagem. Não foram adicionados Blender, modelos externos ou dependências. A água usa ondulação de vértices/normais, transparência e partículas; o ambiente procedural oferece reflexos estáticos, sem reflexão da cena em tempo real nem solver de fluidos. Chuva não é medição do ESP32. O volume da barragem permanece estimado.

A cópia integrada mantém `DashboardSimulationController`, `?embed=true` e `?source=dashboard`. As duas pastas recebem os módulos visuais, mas seus pontos de entrada e controles de fonte continuam distintos. A validação automatizada usa MQTT emulado; o ensaio com ESP32/Wokwi transmitindo e a inspeção final em dispositivos móveis ainda são necessários.

### Melhorias visuais do colaborador

As melhorias compatíveis da branch `demonstracao-tecnica` (commit `123589b`) foram adaptadas para o circuito de uma bomba: cidade com fachadas e telhados texturizados, lojas, calçadas, trânsito com semáforos, pedestres e guarda-chuvas, árvores com vento e respingos. A iluminação procedural muda com a chuva, incluindo nuvens, janelas e postes iluminados durante a tempestade. As texturas são geradas localmente, sem downloads adicionais.

Foram preservados o declive calibrado da rua, a abertura de inspeção, o bombeamento direto à barragem, o reúso por gravidade, o motor e os controles existentes. O reservatório intermediário e a segunda bomba da branch do colaborador não foram incorporados. As animações respeitam pausa e dados atuais; a qualidade gráfica limita o número de respingos. Os materiais animados continuam funcionando com transparência, isolamento e vista explodida.
