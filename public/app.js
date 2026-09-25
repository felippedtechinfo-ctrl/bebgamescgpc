const state = {
  token: localStorage.getItem('bebGamesToken') || '',
  settings: {},
  catalog: [],
  clients: [],
  quotations: [],
  quoteItems: [],
  activeCatalogFilter: 'Todos',
  editingClientId: null
};

const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const userBadge = document.getElementById('userBadge');

const navButtons = document.querySelectorAll('.nav');
const panels = document.querySelectorAll('.panel');

const settingsForm = document.getElementById('settingsForm');
const catalogForm = document.getElementById('catalogForm');
const clientForm = document.getElementById('clientForm');
const saveQuoteButton = document.getElementById('saveQuoteButton');
const logoutButton = document.getElementById('logoutButton');
const quickAddClientButton = document.getElementById('quickAddClientButton');

const PC_ASSEMBLY_CATEGORIES = [
  'Processadores',
  'Placa Mãe',
  'Memória',
  'SSD',
  'Fonte',
  'Placa de Vídeo',
  'Gabinetes'
];

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function getProfitPrice(costPrice) {
  const marginPercent = Number(state.settings.profitMargin || 0);
  return Number(costPrice || 0) * (1 + marginPercent / 100);
}

function getQuoteProfitPrice(costPrice) {
  const marginInput = document.getElementById('quoteProfitMargin');
  const marginPercent = Number(marginInput?.value || state.settings.profitMargin || 0);
  return Number(costPrice || 0) * (1 + marginPercent / 100);
}

function getCategoryIcon(category) {
  const icons = {
    Processadores: '🧠',
    'Placa Mãe': '🧩',
    Memória: '💾',
    SSD: '⚡',
    Fonte: '🔋',
    'Placa de Vídeo': '🎮',
    Gabinetes: '🖥️',
    Outros: '📦'
  };

  return icons[category] || '📦';
}

function showMessage(element, text, type = 'info') {
  element.textContent = text;
  element.style.color = type === 'error' ? '#f87171' : '#fbbf24';
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' ? payload.message || 'Erro desconhecido.' : payload || 'Erro desconhecido.';
    throw new Error(message);
  }

  return payload;
}

function setActiveSection(sectionId) {
  const targetButton = document.querySelector(`.nav[data-section="${sectionId}"]`);
  const targetPanel = document.getElementById(sectionId);

  navButtons.forEach((nav) => nav.classList.toggle('active', nav === targetButton));
  panels.forEach((panel) => panel.classList.toggle('active-panel', panel === targetPanel));
}

function renderNav() {
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveSection(button.dataset.section);
    });
  });
}

function toggleAuth(isLogged) {
  if (isLogged) {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    setActiveSection('quotesSection');
  } else {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
}

function populateSettingsForm() {
  document.getElementById('storeNameInput').value = state.settings.storeName || 'Beb Games';
  document.getElementById('profitMarginInput').value = state.settings.profitMargin || 0;
  document.getElementById('defaultDiscountInput').value = state.settings.defaultDiscount || 0;
  document.getElementById('quoteDiscount').value = state.settings.defaultDiscount || 0;
  document.getElementById('quoteProfitMargin').value = state.settings.profitMargin || 0;
}

function renderCatalogFilters() {
  const filterContainer = document.getElementById('catalogFilters');
  if (!filterContainer) return;

  const categories = ['Todos', ...new Set(state.catalog.map((item) => item.category || 'Outros'))];
  filterContainer.innerHTML = '';

  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-chip ${state.activeCatalogFilter === category ? 'active' : ''}`;
    button.textContent = category === 'Todos' ? 'Todos' : `${getCategoryIcon(category)} ${category}`;
    button.addEventListener('click', () => {
      state.activeCatalogFilter = category;
      renderCatalogFilters();
      renderCatalogTable();
    });
    filterContainer.appendChild(button);
  });
}

function renderPcAssemblyMenus() {
  const container = document.getElementById('pcAssemblyMenu');
  if (!container) return;

  container.innerHTML = '';

  PC_ASSEMBLY_CATEGORIES.forEach((category) => {
    const categoryItems = state.catalog.filter((item) => (item.category || 'Outros') === category);
    const group = document.createElement('div');
    group.className = 'pc-part-group';

    const options = categoryItems.length > 0
      ? categoryItems.map((item) => `<option value="${item.id}">${item.name} - ${formatMoney(getProfitPrice(item.costPrice))}</option>`).join('')
      : '<option value="">Sem itens disponíveis</option>';

    group.innerHTML = `
      <div class="pc-part-header">
        <span>${getCategoryIcon(category)} ${category}</span>
        <small>${categoryItems.length} itens</small>
      </div>
      <div class="pc-part-controls">
        <label>
          <span>Peça</span>
          <select class="pc-part-select" data-category="${category}">${options}</select>
        </label>
        <label class="pc-part-qty">
          <span>Qtd</span>
          <input type="number" min="1" value="1" data-qty-category="${category}" />
        </label>
        <button type="button" class="pc-part-add" data-part-category="${category}" ${categoryItems.length === 0 ? 'disabled' : ''}>Adicionar</button>
      </div>
    `;

    container.appendChild(group);
  });

  container.querySelectorAll('.pc-part-add').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.partCategory;
      const select = container.querySelector(`.pc-part-select[data-category="${category}"]`);
      const quantityInput = container.querySelector(`input[data-qty-category="${category}"]`);

      if (!select || !quantityInput) return;

      const item = state.catalog.find((product) => String(product.id) === String(select.value));
      if (!item) return;

      const quantity = Number(quantityInput.value || 1);
      const totalPrice = getQuoteProfitPrice(item.costPrice) * quantity;

      state.quoteItems.push({
        id: `${item.id}-${Date.now()}`,
        itemId: item.id,
        name: item.name,
        quantity,
        totalPrice,
        costPrice: Number(item.costPrice || 0)
      });

      quantityInput.value = 1;
      renderQuoteItems();
    });
  });
}

function renderCatalogTable() {
  const container = document.getElementById('catalogGroupsContainer');
  container.innerHTML = '';

  const groupedCatalog = state.catalog.reduce((acc, item) => {
    const key = item.category || 'Outros';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const categoriesToRender = state.activeCatalogFilter === 'Todos'
    ? Object.entries(groupedCatalog)
    : Object.entries(groupedCatalog).filter(([category]) => category === state.activeCatalogFilter);

  categoriesToRender.forEach(([category, items]) => {
    const categorySection = document.createElement('div');
    categorySection.className = 'catalog-category';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'catalog-category-header';
    sectionTitle.innerHTML = `<h4>${getCategoryIcon(category)} ${category}</h4><span>${items.length} itens</span>`;
    categorySection.appendChild(sectionTitle);

    const productGrid = document.createElement('div');
    productGrid.className = 'catalog-scroll-grid';

    items.forEach((item) => {
      const salePrice = getProfitPrice(item.costPrice);
      const card = document.createElement('article');
      card.className = 'catalog-card';
      card.innerHTML = `
        <div class="catalog-card-top">
          <span class="catalog-icon">${getCategoryIcon(category)}</span>
          <span class="catalog-brand">${item.brand}</span>
          <span class="catalog-stock">${item.stock} und</span>
        </div>
        <h5>${item.name}</h5>
        <p>${item.notes || 'Sem observações cadastradas.'}</p>
        <div class="catalog-card-footer">
          <strong>${formatMoney(salePrice)}</strong>
          <button type="button" class="add-card-button" data-add-card="${item.id}">Adicionar</button>
        </div>
      `;
      productGrid.appendChild(card);
    });

    categorySection.appendChild(productGrid);
    container.appendChild(categorySection);
  });

  if (categoriesToRender.length === 0) {
    container.innerHTML = '<div class="empty-catalog">Nenhuma peça encontrada nesta categoria.</div>';
  }

  document.querySelectorAll('[data-add-card]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.catalog.find((product) => String(product.id) === String(button.dataset.addCard));
      if (!item) return;

      const totalPrice = getQuoteProfitPrice(item.costPrice);
      state.quoteItems.push({
        id: `${item.id}-${Date.now()}`,
        itemId: item.id,
        name: item.name,
        quantity: 1,
        totalPrice
      });

      renderQuoteItems();
    });
  });
}

function renderClientsTable() {
  const tableBody = document.getElementById('clientsTableBody');
  tableBody.innerHTML = '';

  state.clients.forEach((client) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.name}</td>
      <td>${client.phone || '-'}</td>
      <td>${client.email || '-'}</td>
      <td>${client.notes || '-'}</td>
      <td class="table-actions">
        <button type="button" class="action-button edit" data-edit-client="${client.id}">Editar</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  tableBody.querySelectorAll('[data-edit-client]').forEach((button) => {
    button.addEventListener('click', () => {
      const client = state.clients.find((item) => String(item.id) === String(button.dataset.editClient));
      if (!client) return;

      state.editingClientId = client.id;
      document.getElementById('clientName').value = client.name || '';
      document.getElementById('clientPhone').value = client.phone || '';
      document.getElementById('clientEmail').value = client.email || '';
      document.getElementById('clientNotes').value = client.notes || '';
      document.getElementById('clientSubmitButton').textContent = 'Atualizar cliente';
      document.getElementById('cancelClientEditButton').classList.remove('hidden');
      document.getElementById('clientName').focus();
    });
  });
}

function resetClientForm() {
  state.editingClientId = null;
  clientForm.reset();
  document.getElementById('clientSubmitButton').textContent = 'Salvar cliente';
  document.getElementById('cancelClientEditButton').classList.add('hidden');
}

function populateQuoteClientSelect() {
  const select = document.getElementById('quoteClientSelect');
  select.innerHTML = '';
  state.clients.forEach((client) => {
    const option = document.createElement('option');
    option.value = client.id;
    option.textContent = client.name;
    select.appendChild(option);
  });
}

function populateQuoteProductSelect() {
  const select = document.getElementById('quoteProductSelect');
  if (!select) return;
  select.innerHTML = '';

  const groupedCatalog = state.catalog.reduce((acc, item) => {
    const key = item.category || 'Outros';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.entries(groupedCatalog).forEach(([category, items]) => {
    const group = document.createElement('optgroup');
    group.label = category;

    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.name} - ${formatMoney(getProfitPrice(item.costPrice))}`;
      group.appendChild(option);
    });

    select.appendChild(group);
  });
}

function renderQuoteItems() {
  const list = document.getElementById('quoteItemsList');
  list.innerHTML = '';

  if (state.quoteItems.length === 0) {
    list.innerHTML = '<div class="empty-quote">Nenhuma peça selecionada. Escolha uma categoria e adicione itens ao PC.</div>';
    updateQuoteTotals();
    return;
  }

  const groupedItems = state.quoteItems.reduce((acc, item) => {
    const product = state.catalog.find((entry) => String(entry.id) === String(item.itemId));
    const category = product?.category || 'Outros';
    acc[category] = acc[category] || [];
    acc[category].push(item);
    return acc;
  }, {});

  Object.entries(groupedItems).forEach(([category, items]) => {
    const group = document.createElement('div');
    group.className = 'quote-group';

    const title = document.createElement('div');
    title.className = 'quote-group-title';
    title.innerHTML = `<span>${getCategoryIcon(category)} ${category}</span>`;
    group.appendChild(title);

    items.forEach((item) => {
      const block = document.createElement('div');
      block.className = 'quote-item';
      const product = state.catalog.find((entry) => String(entry.id) === String(item.itemId));
      const costTotal = Number(product?.costPrice || item.costPrice || 0) * Number(item.quantity || 1);
      block.innerHTML = `
        <div class="quote-item-main">
          <span class="quote-item-name">${item.name}</span>
          <small>x${item.quantity}</small>
          <small class="quote-item-cost">Custo: ${formatMoney(costTotal)}</small>
        </div>
        <div class="quote-item-actions">
          <span>${formatMoney(item.totalPrice)}</span>
          <button type="button" data-remove-quote-item="${item.id}">Remover</button>
        </div>
      `;
      group.appendChild(block);
    });

    list.appendChild(group);
  });

  document.querySelectorAll('[data-remove-quote-item]').forEach((button) => {
    button.addEventListener('click', () => {
      state.quoteItems = state.quoteItems.filter((item) => String(item.id) !== String(button.dataset.removeQuoteItem));
      renderQuoteItems();
    });
  });

  updateQuoteTotals();
}

function updateQuoteTotals() {
  const subtotal = state.quoteItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const discountPercent = Number(document.getElementById('quoteDiscount').value || 0);
  const discount = subtotal * (discountPercent / 100);
  const baseTotal = subtotal - discount;
  const cardInterestPercent = Number(document.getElementById('quoteCardInterest').value || 0);
  const cardInterest = baseTotal * (cardInterestPercent / 100);
  const total = baseTotal + cardInterest;
  const cost = state.quoteItems.reduce((sum, item) => {
    const product = state.catalog.find((entry) => String(entry.id) === String(item.itemId));
    return sum + (Number(product?.costPrice || item.costPrice || 0) * Number(item.quantity || 1));
  }, 0);
  const profit = subtotal - cost;
  const marginPercent = cost > 0 ? (profit / cost) * 100 : 0;
  const installments = Math.max(1, Number(document.getElementById('quoteInstallments').value || 1));
  const installmentValue = total / installments;

  const itemCount = state.quoteItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  document.getElementById('costValue').textContent = formatMoney(cost);
  document.getElementById('subtotalValue').textContent = formatMoney(subtotal);
  document.getElementById('miniSubtotalValue').textContent = formatMoney(subtotal);
  document.getElementById('discountValue').textContent = `${formatMoney(discount)} (${discountPercent.toFixed(2)}%)`;
  document.getElementById('profitValue').textContent = `${formatMoney(profit)} (${marginPercent.toFixed(1)}%)`;
  document.getElementById('totalValue').textContent = formatMoney(total);
  document.getElementById('cardInterestValue').textContent = formatMoney(cardInterest);
  document.getElementById('installmentLabel').textContent = installments === 1 ? 'À vista:' : `${installments}x de:`;
  document.getElementById('installmentValue').textContent = formatMoney(installmentValue);
  document.getElementById('quoteItemsCount').textContent = itemCount;
}

function renderQuotations() {
  const tableBody = document.getElementById('quotesTableBody');
  tableBody.innerHTML = '';

  state.quotations.forEach((quote) => {
    const client = state.clients.find((item) => String(item.id) === String(quote.clientId)) || { name: 'Cliente' };
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.name}</td>
      <td>${new Date(quote.createdAt).toLocaleDateString('pt-BR')}</td>
      <td>${formatMoney(quote.subtotal)}</td>
      <td>${formatMoney(quote.total)}</td>
      <td><button type="button" data-whatsapp="${quote.id}">Enviar</button></td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('[data-whatsapp]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const result = await api(`/api/quotations/${button.dataset.whatsapp}/whatsapp`, { method: 'POST' });
        const message = encodeURIComponent(result.message);
        window.open(`https://wa.me/?text=${message}`, '_blank');
      } catch (error) {
        showMessage(loginMessage, error.message, 'error');
      }
    });
  });
}

async function loadDashboard() {
  const [settings, catalog, clients, quotations] = await Promise.all([
    api('/api/config'),
    api('/api/catalog'),
    api('/api/clients'),
    api('/api/quotations')
  ]);

  state.settings = settings;
  state.catalog = catalog;
  state.clients = clients;
  state.quotations = quotations;

  populateSettingsForm();
  renderCatalogFilters();
  renderCatalogTable();
  renderClientsTable();
  populateQuoteClientSelect();
  renderPcAssemblyMenus();
  renderQuotations();
  renderQuoteItems();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || 'Falha ao entrar.');
    }

    state.token = payload.token;
    localStorage.setItem('bebGamesToken', payload.token);
    userBadge.textContent = payload.user.name;
    toggleAuth(true);
    setActiveSection('quotesSection');
    await loadDashboard();
  } catch (error) {
    showMessage(loginMessage, error.message, 'error');
  }
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    storeName: document.getElementById('storeNameInput').value.trim() || 'Beb Games',
    profitMargin: Number(document.getElementById('profitMarginInput').value || 0),
    defaultDiscount: Number(document.getElementById('defaultDiscountInput').value || 0)
  };

  try {
    state.settings = await api('/api/config', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    populateSettingsForm();
    renderPcAssemblyMenus();
    renderQuoteItems();
  } catch (error) {
    showMessage(loginMessage, error.message, 'error');
  }
});

catalogForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById('catalogName').value.trim(),
    category: document.getElementById('catalogCategory').value,
    brand: document.getElementById('catalogBrand').value.trim(),
    costPrice: Number(document.getElementById('catalogCostPrice').value || 0),
    stock: Number(document.getElementById('catalogStock').value || 0),
    notes: document.getElementById('catalogNotes').value.trim()
  };

  try {
    await api('/api/catalog', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    catalogForm.reset();
    await loadDashboard();
  } catch (error) {
    showMessage(loginMessage, error.message, 'error');
  }
});

clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById('clientName').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    notes: document.getElementById('clientNotes').value.trim()
  };

  try {
    const editingId = state.editingClientId;
    await api(editingId ? `/api/clients/${editingId}` : '/api/clients', {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    resetClientForm();
    await loadDashboard();
  } catch (error) {
    showMessage(loginMessage, error.message, 'error');
  }
});

document.getElementById('cancelClientEditButton').addEventListener('click', resetClientForm);

quickAddClientButton.addEventListener('click', async () => {
  const nameInput = document.getElementById('quickClientName');
  const phoneInput = document.getElementById('quickClientPhone');
  const message = document.getElementById('quickClientMessage');
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name) {
    showMessage(message, 'Digite o nome do cliente.', 'error');
    nameInput.focus();
    return;
  }

  try {
    const client = await api('/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email: '', notes: '' })
    });

    state.clients.unshift(client);
    populateQuoteClientSelect();
    document.getElementById('quoteClientSelect').value = client.id;
    nameInput.value = '';
    phoneInput.value = '';
    showMessage(message, 'Cliente cadastrado e selecionado.', 'info');
    renderClientsTable();
  } catch (error) {
    showMessage(message, error.message, 'error');
  }
});

document.getElementById('quoteDiscount').addEventListener('input', updateQuoteTotals);
document.getElementById('quoteInstallments').addEventListener('change', updateQuoteTotals);
document.getElementById('quoteCardInterest').addEventListener('input', updateQuoteTotals);
document.getElementById('quoteProfitMargin').addEventListener('input', () => {
  const margin = Number(document.getElementById('quoteProfitMargin').value || 0);

  state.quoteItems.forEach((item) => {
    const product = state.catalog.find((entry) => String(entry.id) === String(item.itemId));
    const cost = Number(product?.costPrice || item.costPrice || 0) * Number(item.quantity || 1);
    item.totalPrice = cost * (1 + margin / 100);
  });

  renderQuoteItems();
});

function openPrintableQuote() {
  const clientId = document.getElementById('quoteClientSelect').value;
  const selectedClient = state.clients.find((client) => String(client.id) === String(clientId)) || { name: 'Cliente' };
  const subtotal = state.quoteItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const discountPercent = Number(document.getElementById('quoteDiscount').value || 0);
  const discount = subtotal * (discountPercent / 100);
  const cardInterestPercent = Number(document.getElementById('quoteCardInterest').value || 0);
  const baseTotal = subtotal - discount;
  const pixTotal = baseTotal;
  const installmentCount = Math.max(1, Number(document.getElementById('quoteInstallments').value || 1));
  const cardTotal = baseTotal * (1 + cardInterestPercent / 100);
  const installmentValue = cardTotal / installmentCount;

  const itemRows = state.quoteItems.map((item) => `
    <tr>
      <td>${state.catalog.find((entry) => String(entry.id) === String(item.itemId))?.category || 'Componente'}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.totalPrice / Math.max(1, Number(item.quantity || 1)))}</td>
      <td>${formatMoney(item.totalPrice)}</td>
    </tr>
  `).join('');

  const content = `
    <html>
      <head>
        <title>Orçamento Beb Games</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          @page { size: A4; margin: 0; }
          body { margin: 0; background: #f5f1fb; color: #25163e; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { max-width: 820px; margin: 0 auto; padding: 42px; background: #fff; min-height: 100vh; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 28px; border-bottom: 4px solid #f4c542; }
          .logo { width: 190px; height: auto; }
          .title { text-align: right; }
          h1 { margin: 0; color: #492075; font-size: 28px; letter-spacing: 0.02em; }
          .eyebrow { margin: 0 0 8px; color: #8d55c7; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
          .store-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 22px; padding: 14px 16px; border-radius: 10px; background: #492075; color: #fff; font-size: 12px; }
          .store-info strong { display: block; margin-bottom: 4px; color: #f4c542; font-size: 10px; text-transform: uppercase; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 28px 0; }
          .meta-box { padding: 16px; border: 1px solid #e4d9f0; border-radius: 10px; background: #fbf9fe; }
          .label { display: block; margin-bottom: 6px; color: #8d55c7; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .value { font-size: 16px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { padding: 12px 10px; background: #492075; color: #fff; font-size: 12px; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          td { padding: 14px 10px; border-bottom: 1px solid #eadff4; font-size: 14px; }
          .summary { width: 330px; margin: 28px 0 0 auto; padding: 18px; border: 1px solid #e4d9f0; border-radius: 12px; background: #fbf9fe; }
          .row { display: flex; justify-content: space-between; gap: 18px; margin: 9px 0; }
          .total { margin-top: 14px; padding-top: 14px; border-top: 2px solid #f4c542; color: #492075; font-size: 20px; }
          .installment { margin-top: 12px; padding: 12px; border-radius: 8px; background: #f4c542; color: #25163e; font-weight: 700; }
          .footer { margin-top: 54px; padding-top: 16px; border-top: 1px solid #e4d9f0; color: #8d55c7; font-size: 12px; text-align: center; }
          @media print { body { background: #fff; } .page { min-height: auto; padding: 18mm; } }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <img class="logo" src="${window.location.origin}/logo.webp" alt="Beb Games" />
            <div class="title">
              <p class="eyebrow">Documento comercial</p>
              <h1>Orçamento de PC</h1>
            </div>
          </header>
          <section class="store-info">
            <div><strong>Telefone</strong>(21) 98095-4360</div>
            <div><strong>Endereço</strong>Estr. do Monteiro, 1200 - Campo Grande, Rio de Janeiro - RJ</div>
            <div><strong>Instagram</strong>@bebgamescampogrande</div>
          </section>
          <section class="meta">
            <div class="meta-box"><span class="label">Cliente</span><span class="value">${selectedClient.name}</span></div>
            <div class="meta-box"><span class="label">Data de emissão</span><span class="value">${new Date().toLocaleDateString('pt-BR')}</span></div>
          </section>
          <section>
              <table>
                <thead><tr><th>Categoria</th><th>Produto</th><th>Qtd.</th><th>Valor unitário</th><th>Total</th></tr></thead>
                <tbody>${itemRows || '<tr><td colspan="5">Nenhum item selecionado.</td></tr>'}</tbody>
            </table>
          </section>
          <section class="summary">
            <div class="row"><span>Subtotal</span><strong>${formatMoney(subtotal)}</strong></div>
            <div class="row"><span>Desconto (${discountPercent.toFixed(2)}%)</span><strong>${formatMoney(discount)}</strong></div>
            <div class="row total"><span>Pix / à vista</span><strong>${formatMoney(pixTotal)}</strong></div>
            <div class="row"><span>Total no cartão</span><strong>${formatMoney(cardTotal)}</strong></div>
            <div class="row installment"><span>Cartão em ${installmentCount}x</span><strong>${formatMoney(installmentValue)} / parcela</strong></div>
          </section>
          <footer class="footer">Agradecemos a preferência. Este orçamento está sujeito à disponibilidade dos produtos.</footer>
        </main>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    showMessage(loginMessage, 'O navegador bloqueou a janela de impressão. Permita pop-ups para gerar o PDF.', 'error');
    return;
  }

  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();

  let hasPrinted = false;
  const printDocument = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    setTimeout(() => printWindow.print(), 250);
  };
  const logo = printWindow.document.querySelector('.logo');
  if (logo && !logo.complete) {
    logo.addEventListener('load', printDocument, { once: true });
    setTimeout(printDocument, 1200);
  } else {
    printDocument();
  }
}

document.getElementById('printQuoteButton').addEventListener('click', () => {
  if (state.quoteItems.length === 0) {
    showMessage(loginMessage, 'Adicione pelo menos um item antes de imprimir o orçamento.', 'error');
    return;
  }
  openPrintableQuote();
});

saveQuoteButton.addEventListener('click', async () => {
  if (state.quoteItems.length === 0) {
    showMessage(loginMessage, 'Adicione pelo menos um item ao orçamento.', 'error');
    return;
  }

  const clientId = document.getElementById('quoteClientSelect').value;
  const subtotal = state.quoteItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const discountPercent = Number(document.getElementById('quoteDiscount').value || 0);
  const discount = subtotal * (discountPercent / 100);
  const profitMargin = Number(document.getElementById('quoteProfitMargin').value || 0);
  const cardInterest = Number(document.getElementById('quoteCardInterest').value || 0);
  const baseTotal = subtotal - discount;
  const cardInterestValue = baseTotal * (cardInterest / 100);
  const total = baseTotal + cardInterestValue;
  const installments = Math.max(1, Number(document.getElementById('quoteInstallments').value || 1));
  const installmentValue = total / installments;

  const payload = {
    clientId,
    items: state.quoteItems,
    subtotal,
    discount,
    discountPercent,
    total,
    profitMargin,
    cardInterest,
    cardInterestValue,
    installments,
    installmentValue,
    notes: 'Orçamento gerado pelo sistema Beb Games.'
  };

  try {
    await api('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    state.quoteItems = [];
    document.getElementById('quoteDiscount').value = 0;
    document.getElementById('quoteProfitMargin').value = state.settings.profitMargin || 0;
    document.getElementById('quoteCardInterest').value = 0;
    document.getElementById('quoteInstallments').value = 1;
    renderQuoteItems();
    await loadDashboard();
  } catch (error) {
    showMessage(loginMessage, error.message, 'error');
  }
});

logoutButton.addEventListener('click', () => {
  state.token = '';
  localStorage.removeItem('bebGamesToken');
  toggleAuth(false);
  loginForm.reset();
  showMessage(loginMessage, 'Sessão encerrada.', 'info');
});

if (!state.token) {
  toggleAuth(false);
} else {
  toggleAuth(true);
  setActiveSection('quotesSection');
  userBadge.textContent = 'Carregando...';
  loadDashboard().catch((error) => {
    showMessage(loginMessage, error.message, 'error');
  });
}

renderNav();
