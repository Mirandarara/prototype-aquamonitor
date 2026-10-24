# AquaMonitor · Laboratório 3D

Protótipo Three.js real e navegável, isolado do dashboard React. Preparado para a apresentação de **29/10/2026**.

## Abrir para apresentar, inclusive sem internet

Após executar `npm ci` e `npm run build`, o build fica em `dist/`, com JavaScript, Three.js, MQTT e estilos locais, sem CDN, fontes remotas ou modelos externos.

```bash
git clone https://github.com/mateussba/prototype-aquamonitor.git
cd prototype-aquamonitor
npm ci
npm run build
./start-presentation.sh
```

Abra **http://localhost:4174**. O lançador precisa somente de Python 3 e um navegador com WebGL2. Mantenha o terminal aberto; Ctrl+C encerra. Não abra `index.html` com `file://`, pois os módulos precisam de HTTP local.

Para desenvolver (Node 22.18+ ou 24+):

```bash
npm ci
npm run dev -- --port 5174
npm test
npm run build
```

`npm ci` precisa de internet na primeira instalação. Depois, a apresentação local funciona desconectada. Para levar a outro notebook, copie `dist/` e o lançador juntos, mantendo a estrutura. Os módulos de simulação e MQTT usados pelo protótipo estão incluídos em `src/features/`; este repositório pode ser reconstruído de forma independente.

## Roteiro de apresentação

1. Escolha **Demonstração**. Todos os dados desse modo são simulados.
2. Clique **Demonstração completa**: inicia chuva forte, acelera o motor didático em 120×, solicita reúso e executa o ciclo por cerca de 70 segundos de execução da cena. A chuva termina após 12 segundos; a drenagem reduz o nível e a segunda bomba transporta a água. O tempo pausa quando o navegador suspende a aba.
3. Selecione **Galerias**, **Reservatório**, **Bombas**, **Tubulação** e **Barragem**, ou clique nas peças. Os detalhes aparecem no painel de inspeção.
4. Use **Vista subterrânea** para separar a superfície do corte, e **Exibir cidade** para ocultar a camada urbana.
5. **Simular alerta** mantém chuva forte até o nível crítico. **Falha do sensor** demonstra a proteção da drenagem; o mesmo botão restaura o sensor.
6. Ajuste chuva, pause ou reinicie. O botão de reúso alterna a solicitação da segunda bomba. A drenagem continua automática.
7. Use **Tela cheia** no topo (ou F11) e qualidade **Baixa** em notebook lento. Auto reduz qualidade se detectar quadros lentos. A qualidade baixa preserva simulação, seleção e fluxos.

Arraste para orbitar, use scroll/pinça para zoom e botão direito/dois dedos para panorâmica. Os botões de câmera também são acessíveis pelo teclado.

## Arquitetura encontrada e reutilização

O projeto original usa React 19, TypeScript e Vite. O protótipo usa JavaScript modular e Three.js direto, sem React Three Fiber. Os módulos necessários do projeto original foram incluídos neste repositório independente.

- `src/scene`: cidade procedural, corte do terreno, infraestrutura, volumes de água, chuva, partículas instanciadas e controles OrbitControls.
- `src/simulation/SimulationController.js`: adaptador sobre `src/features/simulation/engine/simulation.ts`, com o mesmo balanço de volumes e proteções.
- `src/mqtt/mqttClient.js`: reexporta o serviço e protocolo existentes em `src/features/esp32`. A aplicação abre uma conexão apenas no modo MQTT e encerra ao voltar à demonstração.
- `src/ui`: controles, inspeção, status e rótulos projetados da cena.
- `tests`: ciclo completo, conservação, proteções e integração MQTT emulada.

## Semântica fiel ao projeto existente

**Chuva → bueiros → galeria monitorada → drenagem P01 → reservatório → reúso P02 → transporte ilustrativo → barragem.**

O nível `level_cm`/`level_pct` representa a **galeria de 30 cm**, não o volume do reservatório. `drain_on` transfere da galeria para o reservatório; `reuse_on` retira água do reservatório. O destino barragem é uma extensão visual didática desse segundo circuito, não uma nova interpretação ou decisão do firmware.

O ESP32 informa `tank_full` e `tank_empty`, mas não volume contínuo do reservatório. No MQTT, o volume intermediário é uma estimativa inicial de 12,5%, integrada a taxas ilustrativas (2 L/min de entrada, 1,2 L/min de saída, capacidade didática de 40 L); as boias fixam vazio/cheio. A barragem também é estimada, nunca uma medição. Chuva não é medida pelo payload e fica desativada no MQTT.

Na demonstração, o motor original liga a drenagem em 20 cm e desliga em 12 cm; falha de sensor e reservatório cheio bloqueiam drenagem. Reservatório vazio bloqueia reúso. O modelo tem escala didática, não dimensionamento hidráulico de uma cidade.

## MQTT e Wokwi

- Broker: `wss://broker.emqx.io:8084/mqtt`.
- Telemetria: `aquamonitor/demo-29out-b741d2/telemetria`.
- Status: `aquamonitor/demo-29out-b741d2/status`.
- Wokwi documentado no projeto: https://wokwi.com/projects/478540696015596545.

Inicie o Wokwi e escolha **ESP32 · MQTT** no protótipo. O protótipo é **somente leitura**: não publica comandos, não muda `input_mode` e não disputa o controle do dashboard. O modo sensor/virtual exibido vem do ESP32. O parser original exige também `tank_full`/`tank_empty`, ausentes no exemplo simplificado do briefing.

Pacotes retidos não comprovam atualização e são descartados. Leituras válidas expiram em **6 segundos**. Desconexão, status offline ou expiração interrompem os fluxos e mostram bombas desconhecidas. O último nível pode permanecer desenhado, esmaecido e identificado como desatualizado. Sensor inválido não apresenta leitura numérica no MQTT. Alarmes e erros de validação aparecem em texto.

## Verificação e limites

- `npm test` executa os 7 testes do protótipo. Os testes do dashboard pertencem ao projeto original.
- Build de produção passou. Three.js gera um aviso de tamanho de chunk (~503 kB antes de gzip); isso não impede execução local.
- Inspeção no navegador: cena 3D, câmeras, corte subterrâneo, demonstração e bloqueio dos controles no MQTT.
- Conexão ao broker confirmada no navegador. Não havia telemetria atual do ESP32 durante a verificação; a validação ponta a ponta com Wokwi ativo permanece pendente. Testes emulados não substituem esse ensaio.
- A geometria e as taxas de fluxo são didáticas. Sem referência visual anexada além do texto, a composição foi construída proceduralmente.
- Sem benchmark de FPS em outro notebook. Use qualidade baixa caso necessário.

Antes da apresentação, inicie Wokwi, faça o nível ultrapassar 20 cm e cair abaixo de 12 cm, confira ambas as bombas e interrompa Wokwi para verificar a expiração. O modo demonstração está disponível independentemente desse ensaio.
