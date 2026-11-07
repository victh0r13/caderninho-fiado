#!/bin/bash
# Dê dois cliques neste arquivo para abrir o Caderninho.
cd "$(dirname "$0")" || exit 1
PORT=3210
URL="http://localhost:$PORT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1

# Se já está rodando (ex.: instalado para iniciar sozinho), só abre o navegador.
if curl -s -o /dev/null "$URL"; then
  open "$URL"
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Para usar o Caderninho é preciso instalar o Node.js (só uma vez).\n\nVou abrir o site: baixe a versão LTS, instale e depois abra o Caderninho de novo." buttons {"OK"} default button 1 with title "Caderninho"'
  open "https://nodejs.org/pt-br/download"
  exit 1
fi

echo ""
echo "  📒  Caderninho — fiado da cantina"
echo "  ─────────────────────────────────"

if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  echo "  ▸ Instalando componentes (só na primeira vez, pode levar 1-2 minutos)…"
  npm install --no-audit --no-fund --loglevel=error || { echo "Falha ao instalar."; read -r; exit 1; }
  touch node_modules
fi

if [ ! -f .next/BUILD_ID ] || [ -n "$(find src package.json -newer .next/BUILD_ID 2>/dev/null | head -1)" ]; then
  echo "  ▸ Preparando o sistema…"
  npm run build --silent >/tmp/caderninho-build.log 2>&1 || { echo "Falha ao preparar. Veja /tmp/caderninho-build.log"; read -r; exit 1; }
fi

echo "  ▸ Abrindo em $URL"
echo ""
echo "  ⚠️  Deixe esta janela aberta enquanto usa o sistema."
echo "     Para fechar o Caderninho, feche esta janela."
echo ""

( for _ in $(seq 1 40); do sleep 0.5; curl -s -o /dev/null "$URL" && { open "$URL"; break; }; done ) &
exec npx next start -p "$PORT" -H 127.0.0.1
