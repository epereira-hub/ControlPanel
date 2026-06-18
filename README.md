# ProjectHub — Gerenciador de Projetos

Sistema completo de gerenciamento de projetos com frontend no **GitHub Pages**, backend no **Google Apps Script** e banco de dados no **Google Sheets**.

---

## 📐 Arquitetura

```
GitHub Pages (index.html)
    │  fetch() via HTTPS
    ▼
Google Apps Script (Code.gs) — Web App público
    │  read/write
    ▼
Google Sheets (banco de dados)
  ├── projects
  ├── tasks
  ├── comments
  ├── team
  └── logs
```

---

## 🚀 Passo a Passo de Deploy

### Passo 1 — Criar o Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha
2. Dê um nome como **"ProjectHub DB"**
3. Anote o **ID da planilha** (o código longo na URL: `https://docs.google.com/spreadsheets/d/**SEU_ID_AQUI**/edit`) 

https://docs.google.com/spreadsheets/d/1Wlam4hi9W_S__2MLq6ynwV2JkORSEKxRjhyJJxGB2qA/edit?gid=0#gid=0 

---

### Passo 2 — Criar o Google Apps Script

1. Na planilha aberta, clique em **Extensões → Apps Script**
2. Apague todo o conteúdo padrão (`function myFunction() {...}`)
3. Cole o conteúdo completo do arquivo **`Code.gs`**
4. Salve o projeto com `Ctrl+S` (dê um nome como "ProjectHub API")

---

### Passo 3 — Rodar o Setup inicial

1. No editor do Apps Script, no menu superior esquerdo selecione a função **`setupSheets`**
2. Clique em **▶ Executar**
3. Na primeira execução, o Google pedirá autorização — clique em **"Revisar permissões"** → escolha sua conta → **"Avançado"** → **"Ir para ProjectHub API"** → **"Permitir"**
4. Após executar, verifique sua planilha: as abas `projects`, `tasks`, `comments`, `team` e `logs` foram criadas com cabeçalhos e dados de exemplo

https://script.google.com/macros/s/AKfycbzVcUBoUkKOnkz6S74IMYvCwvU8Oh87uPdTpCijbXwSOVjFacNjjn2w-6sp5gBUpTT2jA/exec

---

### Passo 4 — Publicar o Apps Script como Web App

1. No editor do Apps Script, clique em **"Implantar"** → **"Nova implantação"**
2. Clique no ícone ⚙️ ao lado de "Tipo" → selecione **"App da Web"**
3. Configure:
   - **Descrição**: `v1`
   - **Executar como**: `Eu (seu-email@gmail.com)`
   - **Quem tem acesso**: `Qualquer pessoa` _(sem necessidade de login)_
4. Clique em **"Implantar"**
5. Copie a **URL do app da Web** gerada. Será algo como:
   ```
   https://script.google.com/macros/s/AKfy.../exec
   ```
6. Guarde essa URL — você vai precisar no próximo passo

> ⚠️ **Importante**: Toda vez que editar o `Code.gs`, você deve criar uma **nova implantação** (Implantar → Gerenciar implantações → botão de edição → Nova versão) para que as mudanças sejam publicadas.

---

### Passo 5 — Deploy no GitHub Pages

1. Crie um repositório no GitHub (ex: `meu-projecthub`)
2. Faça upload do arquivo **`index.html`** na raiz do repositório
3. Nas configurações do repositório, vá em **Settings → Pages**
4. Em **Source**, selecione `Deploy from a branch` → branch `main` → pasta `/` (root)
5. Clique em **Save**
6. Aguarde alguns minutos e acesse a URL gerada:
   ```
   https://seu-usuario.github.io/meu-projecthub/
   ```

---

### Passo 6 — Configurar a URL no Frontend

1. Acesse seu site no GitHub Pages
2. No menu lateral esquerdo, clique em **⚙️ Configurações**
3. No campo **"URL do Google Apps Script"**, cole a URL copiada no Passo 4
4. Clique em **💾 Salvar URL**
5. Volte ao **Dashboard** e os dados deverão carregar!

---

## 🧪 Testando a API diretamente

Você pode testar os endpoints no browser:

```
# Dashboard
https://script.google.com/macros/s/SEU_ID/exec?action=getDashboard

# Listar projetos
https://script.google.com/macros/s/SEU_ID/exec?action=getProjects

# Listar equipe
https://script.google.com/macros/s/SEU_ID/exec?action=getTeam

# Últimos 20 logs
https://script.google.com/macros/s/SEU_ID/exec?action=getLogs&limit=20
```

---

## 📋 Referência da API

### Endpoints GET

| Action | Parâmetros opcionais | Descrição |
|--------|---------------------|-----------|
| `getDashboard` | — | Dados consolidados para o dashboard |
| `getProjects` | `status`, `priority` | Lista todos os projetos |
| `getProject` | `id` (obrigatório) | Retorna um projeto |
| `getTasks` | `projectId`, `status`, `assignee` | Lista tarefas |
| `getTask` | `id` (obrigatório) | Retorna uma tarefa |
| `getComments` | `taskId` | Comentários de uma tarefa |
| `getTeam` | — | Lista membros da equipe |
| `getLogs` | `limit` (padrão: 50) | Últimas N ações |
| `setup` | — | Cria as abas no Sheets |

### Endpoints POST

Enviar `Content-Type: application/json` com corpo JSON:

| Action | Campos obrigatórios | Descrição |
|--------|-------------------|-----------|
| `createProject` | `name` | Cria projeto |
| `updateProject` | `id` | Atualiza projeto |
| `deleteProject` | `id` | Exclui projeto e suas tarefas |
| `createTask` | `projectId`, `title` | Cria tarefa |
| `updateTask` | `id` | Atualiza tarefa |
| `deleteTask` | `id` | Exclui tarefa e comentários |
| `moveTask` | `id`, `status` | Move tarefa para novo status |
| `createComment` | `taskId`, `content` | Adiciona comentário |
| `deleteComment` | `id` | Remove comentário |
| `createMember` | `name` | Adiciona membro à equipe |
| `updateMember` | `id` | Atualiza membro |
| `deleteMember` | `id` | Remove membro |

### Formato de resposta

```json
{
  "success": true,
  "data": { ... },
  "message": "OK"
}
```

Em caso de erro:
```json
{
  "success": false,
  "data": null,
  "message": "Descrição do erro",
  "code": 400
}
```

---

## 🗂️ Estrutura das Abas (Sheets)

### projects
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (timestamp+random) |
| name | string | Nome do projeto |
| description | string | Descrição |
| status | string | A Fazer / Em Andamento / Concluído / Arquivado |
| priority | string | Baixa / Média / Alta / Urgente |
| startDate | string | ISO 8601 (YYYY-MM-DD) |
| dueDate | string | ISO 8601 (YYYY-MM-DD) |
| owner | string | Nome do responsável |
| color | string | Cor hex (#6366F1) |
| createdAt | string | ISO 8601 datetime |

### tasks
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único |
| projectId | string | FK → projects.id |
| title | string | Título da tarefa |
| description | string | Descrição |
| status | string | A Fazer / Em Andamento / Bloqueado / Concluído |
| priority | string | Baixa / Média / Alta / Urgente |
| assignee | string | Nome do responsável |
| dueDate | string | YYYY-MM-DD |
| estimatedHours | number | Horas estimadas |
| actualHours | number | Horas realizadas |
| tags | string | Tags separadas por vírgula |
| createdAt | string | ISO datetime |
| updatedAt | string | ISO datetime |

---

## 🔧 Manutenção

### Atualizar o backend após edições no Code.gs

1. No Apps Script, clique em **Implantar → Gerenciar implantações**
2. Clique no ícone de edição (lápis) da implantação ativa
3. Em "Versão", selecione **"Nova versão"**
4. Clique em **"Implantar"**

> A URL do Web App **não muda** ao criar novas versões na mesma implantação.

### Fazer backup dos dados

1. No Google Sheets, clique em **Arquivo → Fazer download → Microsoft Excel (.xlsx)**

### Limpar cache do frontend

1. Acesse **Configurações** no menu lateral
2. Clique em **"Limpar Cache"**

---

## 🐛 Solução de Problemas

**Erro "Configure a URL do Apps Script"**
→ Acesse Configurações e cole a URL do Web App

**Erro CORS / "Failed to fetch"**
→ Verifique se o Web App está publicado como "Qualquer pessoa" (não "Qualquer pessoa com conta Google")

**Dados não atualizam após editar o Code.gs**
→ Crie uma nova versão na implantação (veja "Manutenção" acima)

**"Aba não encontrada"**
→ Execute `setupSheets` novamente pelo Apps Script

**Timeout na API**
→ O Apps Script tem limite de 6 min por execução. Para grandes volumes, considere paginar as requisições.

---

## 📱 Funcionalidades

- ✅ Dashboard com métricas em tempo real
- ✅ Gerenciamento completo de projetos (CRUD)
- ✅ Kanban com drag-and-drop nativo
- ✅ Lista de tarefas ordenável
- ✅ Gantt simplificado
- ✅ Comentários por tarefa
- ✅ Gestão de equipe
- ✅ Sistema de logs automático
- ✅ Cache offline (localStorage)
- ✅ Toasts de feedback
- ✅ Filtros e busca
- ✅ Design responsivo (desktop + tablet)
- ✅ Sidebar colapsável
- ✅ Gráficos (Chart.js)

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript puro (ES6+) |
| Hospedagem | GitHub Pages (gratuito) |
| Backend | Google Apps Script (gratuito) |
| Banco de dados | Google Sheets (gratuito) |
| Gráficos | Chart.js 4.4 (CDN) |
| Fontes | Google Fonts — Inter |

**Custo total: R$ 0,00** 🎉
