// segredos.h - dados da rede Wi-Fi usados pelo estacionamento_esp32.ino
// NÃO compartilhe este arquivo: ele tem a senha do Wi-Fi.
// Para os alunos, entregue uma cópia com os valores trocados.
//
// Atenção: o ESP32 só conecta em redes 2,4 GHz com senha simples
// (WPA2-Personal). Redes "Enterprise" (usuário + senha) não funcionam.
//
// Rede atual: hotspot do próprio notebook (Configurações -> Rede e Internet
// -> Hotspot móvel), banda 2,4 GHz.

#pragma once

const char* WIFI_NOME  = "IOT";
const char* WIFI_SENHA = "123456789";
