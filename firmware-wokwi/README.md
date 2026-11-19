# Firmware EMQX Cloud para Wokwi

Adicione `config.example.h` ao projeto e substitua o `sketch.ino` do projeto https://wokwi.com/projects/478540696015596545 pelo arquivo desta pasta. A versão salva nesse link em 29/10/2026 ainda usava o broker público `broker.emqx.io:1883`, que não entrega mensagens ao EMQX Cloud do painel.

Na sua cópia do Wokwi, copie `config.example.h` para `config.h` e preencha `MQTT_USERNAME` e `MQTT_PASSWORD` nesse arquivo com credenciais temporárias de cliente MQTT do EMQX Cloud. Os valores distribuídos aqui são vazios. Não envie senhas pelo chat e não publique um projeto Wokwi contendo credenciais. A senha do console EMQX não substitui a credencial de cliente MQTT.

O firmware usa `d684655e.ala.us-east-1.emqxsl.com:8883`, WiFiClientSecure com DigiCert Global Root G2 e sincronização NTP antes de validar o certificado. O navegador usa WSS na porta 8084; as portas são diferentes por usarem transportes diferentes. Pinos, telemetria, tópicos e decisões dos relés foram preservados. Bibliotecas do Wokwi: PubSubClient e ArduinoJson (7).

Inicie a simulação e acompanhe: `[WIFI] Conectado`, depois `[MQTT] Conectando`, depois o resultado. O envio de uma inscrição pela PubSubClient não comprova que a ACL a autorizou: confirme a resposta das entradas virtuais na telemetria.

- Aguardando relógio NTP: ainda não tentou TLS; confira acesso do gateway Wokwi à internet/NTP.
- Código -2: falha de transporte TCP/TLS; veja a linha `[TLS]` seguinte.
- Código -4: não recebeu resposta MQTT no prazo.
- Código 4: usuário/senha recusados.
- Código 5: não autorizado; confira autenticação e regras do EMQX.
- Conectado sem leituras no painel: confira permissão do ESP32 para publicar telemetria/status e assinar comandos, e as permissões correspondentes do painel.

Conexões TLS/MQTT são síncronas e podem pausar o loop durante uma tentativa; o handshake tem limite de 8 s e a resposta MQTT de 5 s. Não use este protótipo para bombas reais. Há intervalo de 5 s após cada tentativa e um clientId aleatório por execução, evitando colisão entre MACs emulados.

Validação desta revisão: o endpoint respondeu ao handshake TLS com cadeia válida no computador; os builds e testes das maquetes são conferidos separadamente. Isso não comprova o gateway Wokwi, a compilação Arduino, as credenciais, a ACL ou telemetria real. Esses passos precisam ser confirmados ao executar o sketch no Wokwi. O projeto remoto não foi salvo ou alterado por esta revisão.

## ESP32 físico com Wi-Fi

1. Copie `config.example.h` para `config.h` na mesma pasta do sketch. O arquivo `config.h` é ignorado pelo Git.
2. Preencha `WIFI_SSID` e `WIFI_PASSWORD` com uma rede de 2,4 GHz com internet. Preencha `MQTT_USERNAME` e `MQTT_PASSWORD` com credenciais do broker EMQX Cloud usado pelo Dashboard. Identifique a placa em `DEVICE_ID`.
3. Use Arduino IDE com suporte ESP32, PubSubClient e ArduinoJson 7. Abra o sketch, mantenha os headers na mesma pasta, selecione a placa e a porta USB e grave. Se a IDE pedir, aceite mover o sketch para uma pasta com o mesmo nome e copie os headers para ela.
4. Abra o monitor serial em 115200 e confirme `[WIFI] Conectado` e `[MQTT] Conectado`. O firmware usa os sensores locais por padrão e reconecta à rede configurada sem fixar o canal 6 do Wokwi.
5. Execute o aplicativo principal em `/home/mateus/Downloads/Aquaonitor` com `npm run dev`. Na Visão geral, abra **Conectar protótipo físico por Wi-Fi**, selecione **ESP32 físico / Wokwi · Wi-Fi** e conecte com credenciais MQTT autorizadas. Mantenha a entrada no sensor físico.
6. No sino do Dashboard, clique **Ativar notificações** e permita no navegador. Alertas de nível (18/26 cm), bombas, falhas e perda de telemetria aparecem no Dashboard e no navegador, inclusive em outra aba. O Dashboard precisa permanecer aberto; fechar o aplicativo encerra a recepção. Use localhost ou HTTPS para as notificações do sistema.

A placa publica em TLS/8883 e o Dashboard recebe em WSS/8084 no mesmo broker e tópicos. Não precisam estar na mesma rede local; ambos precisam de internet. Com um único protótipo, desligue o Wokwi ao usar a placa física para não misturar publicações nos mesmos tópicos. Pinos e polaridade dos relés continuam os do circuito existente; confira a montagem física antes de energizar. O Echo de um HC-SR04 de 5 V precisa de adequação para a entrada de 3,3 V do ESP32.

Esta revisão prepara a configuração para hardware real. Compilação Arduino, gravação USB, credenciais, rede e leituras da placa precisam de validação no dispositivo.
