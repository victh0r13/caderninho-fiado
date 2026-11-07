#!/bin/bash
# Para de iniciar o Caderninho junto com o Mac. Seus dados NÃO são apagados.
LABEL="com.caderninho.servidor"
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
osascript -e 'display dialog "O Caderninho não vai mais iniciar sozinho.\nSeus dados continuam guardados na pasta \"dados\"." buttons {"OK"} default button 1 with title "Caderninho"'
