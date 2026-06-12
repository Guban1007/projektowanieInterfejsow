const STORAGE_KEY = 'taskflow.tasks.v1';
const THEME_KEY = 'taskflow.theme.v1';

const today = new Date().toISOString().slice(0, 10);

const seedTasks = [
  {
    id: crypto.randomUUID(),
    title: 'Przygotować prototyp Hi-Fi',
    description: 'Doprecyzować komponenty, kolory i stany formularza.',
    deadline: today,
    priority: 'high',
    tag: 'studia',
    done: false,
    createdAt: Date.now() - 900000
  },
  {
    id: crypto.randomUUID(),
    title: 'Przeprowadzić testy użyteczności',
    description: 'Zebrać obserwacje od trzech użytkowników.',
    deadline: '',
    priority: 'medium',
    tag: 'UX',
    done: false,
    createdAt: Date.now() - 700000
  },
  {
    id: crypto.randomUUID(),
    title: 'Uzupełnić dokumentację projektu',
    description: 'Opisać persony, przepływ i decyzje projektowe.',
    deadline: '',
    priority: 'low',
    tag: 'dokumentacja',
    done: true,
    createdAt: Date.now() - 400000
  }
];

let tasks = loadTasks();

const $ = (selector) => document.querySelector(selector);

const elements = {
  list: $('#taskList'),
  empty: $('#emptyState'),
  resultInfo: $('#resultInfo'),

  dialog: $('#taskDialog'),
  form: $('#taskForm'),
  dialogTitle: $('#dialogTitle'),

  taskId: $('#taskId'),
  title: $('#titleInput'),
  description: $('#descriptionInput'),
  deadline: $('#deadlineInput'),
  priority: $('#priorityInput'),
  tag: $('#tagInput'),
  titleError: $('#titleError'),

  search: $('#searchInput'),
  sort: $('#sortSelect'),
  themeToggle: $('#themeToggle')
};

const priorityLabels = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki'
};

const priorityWeights = {
  low: 1,
  medium: 2,
  high: 3
};

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedTasks) ? savedTasks : seedTasks;
  } catch {
    return seedTasks;
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getPriorityLabel(priority) {
  return priorityLabels[priority] || priorityLabels.medium;
}

function getPriorityWeight(priority) {
  return priorityWeights[priority] || priorityWeights.medium;
}

function getTaskSearchText(task) {
  return `${task.title} ${task.description} ${task.tag}`.toLowerCase();
}

function getVisibleTasks() {
  const query = elements.search.value.trim().toLowerCase();

  return tasks
    .filter((task) => getTaskSearchText(task).includes(query))
    .sort(sortTasks);
}

function sortTasks(a, b) {
  switch (elements.sort.value) {
    case 'deadlineAsc':
      return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31');

    case 'priorityDesc':
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);

    case 'titleAsc':
      return a.title.localeCompare(b.title, 'pl');

    default:
      return b.createdAt - a.createdAt;
  }
}

function render() {
  const visibleTasks = getVisibleTasks();

  elements.list.innerHTML = '';
  elements.empty.hidden = visibleTasks.length > 0;
  elements.resultInfo.textContent = getResultText(visibleTasks.length);

  visibleTasks.forEach((task) => {
    elements.list.appendChild(createTaskCard(task));
  });
}

function getResultText(count) {
  return `${count} ${count === 1 ? 'zadanie' : 'zadań'}`;
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card ${task.done ? 'done' : ''}`;

  card.innerHTML = `
    <input class="task-check" type="checkbox" ${task.done ? 'checked' : ''} aria-label="Oznacz jako wykonane" />

    <div>
      <h4 class="task-title"></h4>
      <p class="task-desc"></p>

      <div class="meta">
        <span class="pill ${task.priority}">Priorytet: ${getPriorityLabel(task.priority)}</span>
        ${task.deadline ? `<span class="pill">Termin: ${task.deadline}</span>` : ''}
        ${task.tag ? `<span class="pill">#${escapeHtml(task.tag)}</span>` : ''}
      </div>
    </div>

    <div class="task-actions">
      <button class="icon-button edit" type="button" aria-label="Edytuj zadanie">✎</button>
      <button class="icon-button danger delete" type="button" aria-label="Usuń zadanie">×</button>
    </div>
  `;

  card.querySelector('.task-title').textContent = task.title;
  card.querySelector('.task-desc').textContent = task.description || 'Brak opisu.';

  card.querySelector('.task-check').addEventListener('change', () => toggleTask(task.id));
  card.querySelector('.edit').addEventListener('click', () => openEditModal(task.id));
  card.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));

  return card;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;'
    };

    return entities[char];
  });
}

function openAddModal() {
  elements.form.reset();
  elements.taskId.value = '';
  elements.dialogTitle.textContent = 'Dodaj zadanie';
  elements.titleError.textContent = '';

  elements.dialog.showModal();
  elements.title.focus();
}

function openEditModal(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  elements.taskId.value = task.id;
  elements.title.value = task.title;
  elements.description.value = task.description;
  elements.deadline.value = task.deadline;
  elements.priority.value = task.priority;
  elements.tag.value = task.tag;
  elements.dialogTitle.textContent = 'Edytuj zadanie';
  elements.titleError.textContent = '';

  elements.dialog.showModal();
}

function validateForm() {
  const isValid = elements.title.value.trim().length >= 3;
  elements.titleError.textContent = isValid ? '' : 'Tytuł musi mieć co najmniej 3 znaki.';

  return isValid;
}

function getFormData() {
  return {
    title: elements.title.value.trim(),
    description: elements.description.value.trim(),
    deadline: elements.deadline.value,
    priority: elements.priority.value,
    tag: elements.tag.value.trim()
  };
}

function submitTask(event) {
  event.preventDefault();

  if (!validateForm()) return;

  const taskId = elements.taskId.value;
  const formData = getFormData();

  if (taskId) {
    updateTask(taskId, formData);
  } else {
    addTask(formData);
  }

  saveTasks();
  elements.dialog.close();
  render();
}

function addTask(taskData) {
  tasks = [
    {
      id: crypto.randomUUID(),
      done: false,
      createdAt: Date.now(),
      ...taskData
    },
    ...tasks
  ];
}

function updateTask(id, taskData) {
  tasks = tasks.map((task) => {
    return task.id === id ? { ...task, ...taskData } : task;
  });
}

function toggleTask(id) {
  tasks = tasks.map((task) => {
    return task.id === id ? { ...task, done: !task.done } : task;
  });

  saveTasks();
  render();
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  const confirmed = confirm(`Usunąć zadanie „${task.title}”?`);

  if (!confirmed) return;

  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  render();
}

function initTheme() {
  const isDarkMode = localStorage.getItem(THEME_KEY) === 'dark';

  document.body.classList.toggle('dark', isDarkMode);
  elements.themeToggle.checked = isDarkMode;
}

function setTheme() {
  const isDarkMode = elements.themeToggle.checked;

  document.body.classList.toggle('dark', isDarkMode);
  localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
}

function closeModal() {
  elements.dialog.close();
}

$('#openAddModal').addEventListener('click', openAddModal);
$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);

elements.form.addEventListener('submit', submitTask);
elements.search.addEventListener('input', render);
elements.sort.addEventListener('change', render);
elements.themeToggle.addEventListener('change', setTheme);

initTheme();
render();