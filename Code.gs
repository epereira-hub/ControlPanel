// ============================================================
// GERENCIADOR DE PROJETOS — Google Apps Script Backend
// ============================================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ---------- Cabeçalhos das abas ----------
const HEADERS = {
  projects: ['id','name','description','status','priority','startDate','dueDate','owner','color','createdAt'],
  tasks:    ['id','projectId','title','description','status','priority','assignee','dueDate','estimatedHours','actualHours','tags','createdAt','updatedAt'],
  comments: ['id','taskId','author','content','createdAt'],
  team:     ['id','name','email','role','avatar'],
  logs:     ['id','action','entity','entityId','description','timestamp']
};

// ---------- Utilitários ----------
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function now() {
  return new Date().toISOString();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data, message) {
  return jsonResponse({ success: true, data: data, message: message || 'OK' });
}

function err(message, code) {
  return jsonResponse({ success: false, data: null, message: message || 'Erro desconhecido', code: code || 500 });
}

// ---------- Acesso à planilha ----------
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Aba não encontrada: ' + name);
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] === '' ? null : row[i]; });
    return obj;
  });
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed
  }
  return -1;
}

function appendRow(sheet, headers, obj) {
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function updateRow(sheet, rowIndex, headers, obj) {
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function deleteRow(sheet, rowIndex) {
  sheet.deleteRow(rowIndex);
}

// ---------- Log automático ----------
function addLog(action, entity, entityId, description) {
  try {
    const sheet = getSheet('logs');
    const entry = {
      id: generateId(),
      action: action,
      entity: entity,
      entityId: entityId,
      description: description,
      timestamp: now()
    };
    appendRow(sheet, HEADERS.logs, entry);
  } catch(e) {
    // log silencioso
  }
}

// ============================================================
// SETUP — cria abas e cabeçalhos
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    const headers = HEADERS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  // Dados de exemplo — equipe
  const teamSheet = ss.getSheetByName('team');
  if (teamSheet.getLastRow() <= 1) {
    const members = [
      { id: generateId(), name: 'Ana Lima', email: 'ana@empresa.com', role: 'Designer', avatar: 'AL' },
      { id: generateId(), name: 'Bruno Costa', email: 'bruno@empresa.com', role: 'Dev Backend', avatar: 'BC' },
      { id: generateId(), name: 'Carla Mendes', email: 'carla@empresa.com', role: 'Dev Frontend', avatar: 'CM' },
      { id: generateId(), name: 'Diego Souza', email: 'diego@empresa.com', role: 'QA', avatar: 'DS' }
    ];
    members.forEach(m => appendRow(teamSheet, HEADERS.team, m));
  }

  // Projeto de exemplo
  const projSheet = ss.getSheetByName('projects');
  if (projSheet.getLastRow() <= 1) {
    const proj = {
      id: generateId(),
      name: 'Projeto Demo',
      description: 'Projeto de exemplo criado automaticamente',
      status: 'Em Andamento',
      priority: 'Alta',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      owner: 'Ana Lima',
      color: '#6366F1',
      createdAt: now()
    };
    appendRow(projSheet, HEADERS.projects, proj);
  }

  return 'Planilhas configuradas com sucesso!';
}

// ============================================================
// ROTEADOR — doGet / doPost
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (!action) return err('Parâmetro action obrigatório', 400);

    switch(action) {
      // Projects
      case 'getProjects':     return handleGetProjects(e);
      case 'getProject':      return handleGetProject(e);
      // Tasks
      case 'getTasks':        return handleGetTasks(e);
      case 'getTask':         return handleGetTask(e);
      // Comments
      case 'getComments':     return handleGetComments(e);
      // Team
      case 'getTeam':         return handleGetTeam(e);
      // Logs
      case 'getLogs':         return handleGetLogs(e);
      // Dashboard
      case 'getDashboard':    return handleGetDashboard(e);
      // Setup
      case 'setup':           return jsonResponse({ success: true, message: setupSheets() });

      default: return err('Action não reconhecida: ' + action, 404);
    }
  } catch(ex) {
    return err('Erro interno: ' + ex.message, 500);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch(_) {}
    }
    // Suporte a action via parâmetro URL ou corpo
    const action = (e.parameter && e.parameter.action) || body.action;
    if (!action) return err('Parâmetro action obrigatório', 400);

    switch(action) {
      // Projects
      case 'createProject':   return handleCreateProject(body);
      case 'updateProject':   return handleUpdateProject(body);
      case 'deleteProject':   return handleDeleteProject(body);
      // Tasks
      case 'createTask':      return handleCreateTask(body);
      case 'updateTask':      return handleUpdateTask(body);
      case 'deleteTask':      return handleDeleteTask(body);
      case 'moveTask':        return handleMoveTask(body);
      // Comments
      case 'createComment':   return handleCreateComment(body);
      case 'deleteComment':   return handleDeleteComment(body);
      // Team
      case 'createMember':    return handleCreateMember(body);
      case 'updateMember':    return handleUpdateMember(body);
      case 'deleteMember':    return handleDeleteMember(body);

      default: return err('Action não reconhecida: ' + action, 404);
    }
  } catch(ex) {
    return err('Erro interno: ' + ex.message, 500);
  }
}

// ============================================================
// PROJECTS
// ============================================================
function handleGetProjects(e) {
  const sheet = getSheet('projects');
  let projects = sheetToObjects(sheet);
  // Filtros opcionais
  const status = e.parameter.status;
  const priority = e.parameter.priority;
  if (status) projects = projects.filter(p => p.status === status);
  if (priority) projects = projects.filter(p => p.priority === priority);
  return ok(projects);
}

function handleGetProject(e) {
  const id = e.parameter.id;
  if (!id) return err('id obrigatório', 400);
  const sheet = getSheet('projects');
  const projects = sheetToObjects(sheet);
  const proj = projects.find(p => String(p.id) === String(id));
  if (!proj) return err('Projeto não encontrado', 404);
  return ok(proj);
}

function handleCreateProject(body) {
  const sheet = getSheet('projects');
  const proj = {
    id: generateId(),
    name: body.name || 'Sem nome',
    description: body.description || '',
    status: body.status || 'A Fazer',
    priority: body.priority || 'Média',
    startDate: body.startDate || '',
    dueDate: body.dueDate || '',
    owner: body.owner || '',
    color: body.color || '#6366F1',
    createdAt: now()
  };
  appendRow(sheet, HEADERS.projects, proj);
  addLog('CREATE', 'project', proj.id, 'Projeto criado: ' + proj.name);
  return ok(proj, 'Projeto criado');
}

function handleUpdateProject(body) {
  if (!body.id) return err('id obrigatório', 400);
  const sheet = getSheet('projects');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Projeto não encontrado', 404);
  const projects = sheetToObjects(sheet);
  const existing = projects.find(p => String(p.id) === String(body.id));
  const updated = Object.assign({}, existing, body);
  updateRow(sheet, rowIndex, HEADERS.projects, updated);
  addLog('UPDATE', 'project', updated.id, 'Projeto atualizado: ' + updated.name);
  return ok(updated, 'Projeto atualizado');
}

function handleDeleteProject(body) {
  if (!body.id) return err('id obrigatório', 400);
  const sheet = getSheet('projects');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Projeto não encontrado', 404);
  deleteRow(sheet, rowIndex);
  // Apaga tarefas do projeto
  const taskSheet = getSheet('tasks');
  let tasks = sheetToObjects(taskSheet);
  const toDelete = tasks.filter(t => String(t.projectId) === String(body.id));
  toDelete.forEach(t => {
    const r = findRowById(taskSheet, t.id);
    if (r > 0) deleteRow(taskSheet, r);
  });
  addLog('DELETE', 'project', body.id, 'Projeto excluído');
  return ok(null, 'Projeto excluído');
}

// ============================================================
// TASKS
// ============================================================
function handleGetTasks(e) {
  const sheet = getSheet('tasks');
  let tasks = sheetToObjects(sheet);
  const projectId = e.parameter.projectId;
  const status = e.parameter.status;
  const assignee = e.parameter.assignee;
  if (projectId) tasks = tasks.filter(t => String(t.projectId) === String(projectId));
  if (status) tasks = tasks.filter(t => t.status === status);
  if (assignee) tasks = tasks.filter(t => t.assignee === assignee);
  return ok(tasks);
}

function handleGetTask(e) {
  const id = e.parameter.id;
  if (!id) return err('id obrigatório', 400);
  const sheet = getSheet('tasks');
  const tasks = sheetToObjects(sheet);
  const task = tasks.find(t => String(t.id) === String(id));
  if (!task) return err('Tarefa não encontrada', 404);
  return ok(task);
}

function handleCreateTask(body) {
  if (!body.projectId) return err('projectId obrigatório', 400);
  const sheet = getSheet('tasks');
  const task = {
    id: generateId(),
    projectId: body.projectId,
    title: body.title || 'Sem título',
    description: body.description || '',
    status: body.status || 'A Fazer',
    priority: body.priority || 'Média',
    assignee: body.assignee || '',
    dueDate: body.dueDate || '',
    estimatedHours: body.estimatedHours || 0,
    actualHours: body.actualHours || 0,
    tags: body.tags || '',
    createdAt: now(),
    updatedAt: now()
  };
  appendRow(sheet, HEADERS.tasks, task);
  addLog('CREATE', 'task', task.id, 'Tarefa criada: ' + task.title);
  return ok(task, 'Tarefa criada');
}

function handleUpdateTask(body) {
  if (!body.id) return err('id obrigatório', 400);
  const sheet = getSheet('tasks');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Tarefa não encontrada', 404);
  const tasks = sheetToObjects(sheet);
  const existing = tasks.find(t => String(t.id) === String(body.id));
  const updated = Object.assign({}, existing, body, { updatedAt: now() });
  updateRow(sheet, rowIndex, HEADERS.tasks, updated);
  addLog('UPDATE', 'task', updated.id, 'Tarefa atualizada: ' + updated.title);
  return ok(updated, 'Tarefa atualizada');
}

function handleDeleteTask(body) {
  if (!body.id) return err('id obrigatório', 400);
  const sheet = getSheet('tasks');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Tarefa não encontrada', 404);
  deleteRow(sheet, rowIndex);
  // Apaga comentários
  const commSheet = getSheet('comments');
  let comms = sheetToObjects(commSheet);
  comms.filter(c => String(c.taskId) === String(body.id)).forEach(c => {
    const r = findRowById(commSheet, c.id);
    if (r > 0) deleteRow(commSheet, r);
  });
  addLog('DELETE', 'task', body.id, 'Tarefa excluída');
  return ok(null, 'Tarefa excluída');
}

function handleMoveTask(body) {
  if (!body.id || !body.status) return err('id e status obrigatórios', 400);
  const sheet = getSheet('tasks');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Tarefa não encontrada', 404);
  const tasks = sheetToObjects(sheet);
  const existing = tasks.find(t => String(t.id) === String(body.id));
  const updated = Object.assign({}, existing, { status: body.status, updatedAt: now() });
  updateRow(sheet, rowIndex, HEADERS.tasks, updated);
  addLog('MOVE', 'task', updated.id, 'Tarefa movida para: ' + body.status);
  return ok(updated, 'Tarefa movida');
}

// ============================================================
// COMMENTS
// ============================================================
function handleGetComments(e) {
  const taskId = e.parameter.taskId;
  const sheet = getSheet('comments');
  let comments = sheetToObjects(sheet);
  if (taskId) comments = comments.filter(c => String(c.taskId) === String(taskId));
  return ok(comments);
}

function handleCreateComment(body) {
  if (!body.taskId) return err('taskId obrigatório', 400);
  const sheet = getSheet('comments');
  const comment = {
    id: generateId(),
    taskId: body.taskId,
    author: body.author || 'Anônimo',
    content: body.content || '',
    createdAt: now()
  };
  appendRow(sheet, HEADERS.comments, comment);
  addLog('COMMENT', 'task', body.taskId, 'Comentário adicionado por: ' + comment.author);
  return ok(comment, 'Comentário adicionado');
}

function handleDeleteComment(body) {
  if (!body.id) return err('id obrigatório', 400);
  const sheet = getSheet('comments');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Comentário não encontrado', 404);
  deleteRow(sheet, rowIndex);
  return ok(null, 'Comentário excluído');
}

// ============================================================
// TEAM
// ============================================================
function handleGetTeam(e) {
  const sheet = getSheet('team');
  const members = sheetToObjects(sheet);
  return ok(members);
}

function handleCreateMember(body) {
  if (!body.name) return err('name obrigatório', 400);
  const sheet = getSheet('team');
  const parts = (body.name || '').split(' ');
  const avatar = parts.length >= 2
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : (body.name.substr(0,2)).toUpperCase();
  const member = {
    id: generateId(),
    name: body.name,
    email: body.email || '',
    role: body.role || '',
    avatar: body.avatar || avatar
  };
  appendRow(sheet, HEADERS.team, member);
  addLog('CREATE', 'team', member.id, 'Membro adicionado: ' + member.name);
  return ok(member, 'Membro adicionado');
}

function handleUpdateMember(body) {
  if (!body.id) return err('id obrigatório', 400);
  const sheet = getSheet('team');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Membro não encontrado', 404);
  const members = sheetToObjects(sheet);
  const existing = members.find(m => String(m.id) === String(body.id));
  const updated = Object.assign({}, existing, body);
  updateRow(sheet, rowIndex, HEADERS.team, updated);
  addLog('UPDATE', 'team', updated.id, 'Membro atualizado: ' + updated.name);
  return ok(updated, 'Membro atualizado');
}

function handleDeleteMember(body) {
  if (!body.id) return err('id obrigatório', 400);
  const sheet = getSheet('team');
  const rowIndex = findRowById(sheet, body.id);
  if (rowIndex < 0) return err('Membro não encontrado', 404);
  deleteRow(sheet, rowIndex);
  addLog('DELETE', 'team', body.id, 'Membro removido');
  return ok(null, 'Membro removido');
}

// ============================================================
// LOGS
// ============================================================
function handleGetLogs(e) {
  const sheet = getSheet('logs');
  let logs = sheetToObjects(sheet);
  // Retorna os últimos N (padrão 50)
  const limit = parseInt(e.parameter.limit) || 50;
  logs = logs.reverse().slice(0, limit);
  return ok(logs);
}

// ============================================================
// DASHBOARD
// ============================================================
function handleGetDashboard(e) {
  const projSheet = getSheet('projects');
  const taskSheet = getSheet('tasks');
  const logSheet = getSheet('logs');

  const projects = sheetToObjects(projSheet);
  const tasks = sheetToObjects(taskSheet);
  const logs = sheetToObjects(logSheet).reverse().slice(0, 10);

  // Contagem por status de tarefa
  const tasksByStatus = { 'A Fazer': 0, 'Em Andamento': 0, 'Concluído': 0, 'Bloqueado': 0 };
  tasks.forEach(t => {
    if (tasksByStatus.hasOwnProperty(t.status)) tasksByStatus[t.status]++;
    else tasksByStatus[t.status] = 1;
  });

  // Próximas 7 dias
  const today = new Date();
  const in7 = new Date(today.getTime() + 7*24*60*60*1000);
  const upcoming = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= today && d <= in7 && t.status !== 'Concluído';
  }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Projetos vencidos
  const overdueProjects = projects.filter(p => {
    if (!p.dueDate || p.status === 'Concluído') return false;
    return new Date(p.dueDate) < today;
  });

  // Progresso por projeto
  const projectsWithProgress = projects.map(p => {
    const ptasks = tasks.filter(t => String(t.projectId) === String(p.id));
    const done = ptasks.filter(t => t.status === 'Concluído').length;
    const total = ptasks.length;
    return Object.assign({}, p, { progress: total > 0 ? Math.round(done/total*100) : 0, taskCount: total });
  });

  return ok({
    summary: {
      totalProjects: projects.length,
      totalTasks: tasks.length,
      tasksByStatus: tasksByStatus,
      overdueProjects: overdueProjects.length
    },
    upcoming: upcoming.slice(0, 10),
    recentActivity: logs,
    projects: projectsWithProgress
  });
}
