#!/bin/bash
# Instala o Caderninho para iniciar sozinho quando o Mac ligar.
# Depois disso, basta abrir pelo Dock (veja o LEIA-ME).
cd "$(dirname "$0")" || exit 1
DIR="$(pwd)"
PORT=3210
LABEL="com.caderninho.servidor"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Primeiro instale o Node.js (versão LTS). Vou abrir o site para você. Depois rode este instalador de novo." buttons {"OK"} default button 1 with title "Caderninho"'
  open "https://nodejs.org/pt-br/download"
  exit 1
fi
NODE="$(command -v node)"

echo ""
echo "  📒  Instalando o Caderninho"
echo "  ─────────────────────────────"
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1  # para a versão antiga, se houver
echo "  ▸ Instalando componentes…"
npm install --no-audit --no-fund --loglevel=error || { echo "Falha ao instalar."; read -r; exit 1; }
echo "  ▸ Preparando o sistema…"
npm run build --silent || { echo "Falha ao preparar."; read -r; exit 1; }

echo "  ▸ Configurando para iniciar junto com o Mac…"
mkdir -p "$HOME/Library/LaunchAgents" "$DIR/dados"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$DIR/node_modules/next/dist/bin/next</string>
    <string>start</string>
    <string>-p</string>
    <string>$PORT</string>
    <string>-H</string>
    <string>127.0.0.1</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(dirname "$NODE"):/usr/bin:/bin</string>
    <key>NODE_ENV</key><string>production</string>
    <key>NEXT_TELEMETRY_DISABLED</key><string>1</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/dados/servidor.log</string>
  <key>StandardErrorPath</key><string>$DIR/dados/servidor.log</string>
</dict>
</plist>
PL
launchctl bootstrap "gui/$(id -u)" "$PLIST"

for _ in $(seq 1 40); do sleep 0.5; curl -s -o /dev/null "http://localhost:$PORT" && break; done
open -a Safari "http://localhost:$PORT" 2>/dev/null || open "http://localhost:$PORT"

osascript -e 'display dialog "Pronto! O Caderninho agora liga sozinho junto com o Mac. ✅\n\nPara virar um app no Dock:\nno Safari, com o Caderninho aberto, vá no menu Arquivo → Adicionar ao Dock…\n\nDepois é só clicar no ícone laranja no Dock." buttons {"Entendi"} default button 1 with title "Caderninho"'
