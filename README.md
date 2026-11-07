# 📒 Caderninho — fiado da cantina

Sistema para anotar e cobrar o fiado dos alunos da lanchonete da escola.
Roda **no próprio MacBook**, sem internet e sem mensalidade. Os dados ficam só no computador.

---

## ✨ O que ele faz

| | |
|---|---|
| **Anotar fiado em 2 toques** | Aperte **F**, escolha o aluno e toque nos lanches do cardápio (ou digite um valor avulso). |
| **Receber pagamento** | Aperte **R**: tudo, metade, ou qualquer valor. Dinheiro, Pix, cartão ou desconto. Pagamento a mais vira crédito. |
| **Saldo sempre certo** | O sistema sabe exatamente quais lanches ainda estão em aberto e há quantos dias (os pagamentos quitam os lanches mais antigos primeiro). |
| **Cobrança pelo WhatsApp** | Mensagem pronta e educada, com o valor e a lista do que foi consumido. Um clique abre o WhatsApp do responsável. |
| **Pix com valor certinho** | Cadastre sua chave Pix e cada cobrança gera **QR Code** e **Pix copia e cola** com o valor exato. |
| **Quem cobrar primeiro** | Lista de devedores ordenada por atraso, com a data da última cobrança e o progresso de “cobrados hoje”. |
| **Limite por aluno** | Aviso quando o aluno vai passar do limite; opção de **bloquear** o fiado. |
| **Observações em destaque** | Ex.: “alergia a amendoim” aparece toda vez que for anotar para aquele aluno. |
| **Painel** | Total a receber, atrasados, recebido no mês, gráfico dos últimos 14 dias e lanches mais pedidos. |
| **Histórico e planilhas** | Filtros por período, e exportação para Excel/Numbers (saldos e movimentos). |
| **Extrato para imprimir** | Na ficha do aluno: ⋯ → Imprimir extrato (dá para salvar em PDF e mandar ao responsável). |
| **Desfazer** | Errou? Logo após anotar aparece o botão **Desfazer**. |
| **Lançar em outra data** | Para passar as anotações do caderno de papel para o sistema. |
| **Backup automático** | Uma cópia por dia (guarda os últimos 60 dias), além de backup/restauração manual. |
| **PIN de 4 números** | Criado no primeiro acesso. Pedido ao abrir e quando o sistema fica parado (tempo ajustável). Botão **Bloquear** no canto. |
| **Tema claro e escuro** | Escolha no menu lateral ou em Ajustes → Aparência: claro, escuro ou automático (segue o Mac). |

### Atalhos de teclado
- **F** — anotar fiado · **R** — receber pagamento · **⌘K** ou **/** — buscar aluno
- **⌘ Enter** — salvar o fiado · **Esc** — fechar · **botão direito** no produto — tirar 1 unidade

---

## 🚀 Como instalar no MacBook (uma vez só)

1. **Instale o Node.js** (versão **LTS**): https://nodejs.org/pt-br/download → baixe o instalador para macOS e clique em “Continuar” até o fim.
2. **Baixe esta pasta** para o Mac (no GitHub: botão verde **Code → Download ZIP**, e descompacte em *Documentos*, por exemplo).
3. Dê **dois cliques** em **`Instalar no Mac.command`**.
   - Se o Mac disser que não pode abrir porque é de um desenvolvedor não identificado: clique com o **botão direito** no arquivo → **Abrir** → **Abrir**.
   - Na primeira vez leva 1–2 minutos.
4. O Safari vai abrir o Caderninho. Para ele virar um **app no Dock**:
   **Safari → menu Arquivo → Adicionar ao Dock…** → Adicionar.

Pronto! A partir daí é só clicar no ícone laranja no Dock — o sistema liga sozinho junto com o Mac. 🎉

### Prefere não instalar como serviço?
Dê dois cliques em **`Abrir Caderninho.command`** sempre que for usar (deixe a janela do Terminal aberta enquanto usa).

### Desinstalar
`Desinstalar do Mac.command` faz o sistema parar de iniciar sozinho. **Os dados não são apagados.**

---

## 🔒 PIN

- No primeiro acesso o sistema pede para criar um PIN de 4 números.
- Ele é pedido de novo ao abrir o Caderninho, ao clicar em **Bloquear** e depois de alguns minutos parado (padrão: 10 min — muda em **Ajustes → PIN e bloqueio**).
- Depois de 5 tentativas erradas, o sistema faz esperar antes de tentar de novo.
- **Esqueceu o PIN?** Apague o arquivo `dados/seguranca.json` e recarregue a página para criar outro. Nenhum fiado é perdido.
- O sistema só aceita conexões do próprio Mac (não fica visível para outros aparelhos no Wi-Fi).

## 💾 Onde ficam os dados

- Tudo fica na pasta **`dados/`** dentro desta pasta (arquivo `caderninho.json`).
- Backups automáticos diários em **`dados/backups/`**.
- Em **Ajustes → Backup** dá para baixar uma cópia e restaurar. Recomendação: de vez em quando, guarde um backup no iCloud Drive.
- ⚠️ Não apague a pasta `dados/` — é ali que está todo o caderninho.

## 🔄 Atualizar para uma versão nova

Substitua os arquivos pela versão nova (**mantendo a pasta `dados/`**) e rode `Instalar no Mac.command` de novo.

---

## 🛠️ Parte técnica

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript** + **Tailwind CSS 4**.
- Armazenamento em arquivo JSON local com gravação atômica, fila de escrita e backups diários — sem banco de dados para instalar.
- PIN com hash `scrypt`, sessão em cookie assinado (HMAC) verificada no `proxy.ts` e em todas as ações do servidor.
- Valores guardados em centavos (inteiros) para não haver erro de arredondamento.
- Pix “copia e cola” gerado localmente no padrão BR Code (EMV) do Banco Central.

```bash
npm install
npm run dev     # desenvolvimento em http://localhost:3210
npm run build && npm start
```

Variável opcional: `CADERNINHO_DATA_DIR` para guardar os dados em outra pasta.

```
src/
  proxy.ts        bloqueio por PIN de todas as páginas e rotas
  app/            páginas (painel, alunos, cobranças, histórico, cardápio, ajustes) e ações do servidor
  components/     diálogos (anotar fiado, receber, cobrar, aluno), busca e componentes de interface
  lib/            dados (db.ts), cálculos de saldo (calc.ts), Pix (pix.ts), mensagem (message.ts)
```
