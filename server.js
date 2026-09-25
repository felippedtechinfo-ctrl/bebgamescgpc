const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const sessions = new Map();

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      settings: {
        storeName: 'Beb Games',
        profitMargin: 30,
        defaultDiscount: 0,
        defaultShipping: 0
      },
      users: [
        {
          id: 1,
          username: 'admin',
          password: 'admin123',
          name: 'Administrador'
        }
      ],
      catalog: [
        {
          id: 1,
          name: 'Ryzen 5 5600G',
          category: 'Processadores',
          brand: 'AMD',
          costPrice: 740,
          stock: 10,
          notes: 'Processador ideal para configurações equilibradas.'
        },
        {
          id: 2,
          name: 'B550M AORUS ELITE',
          category: 'Placa Mãe',
          brand: 'Gigabyte',
          costPrice: 820,
          stock: 5,
          notes: 'Socket AM4, ótimo custo-benefício.'
        },
        {
          id: 3,
          name: 'Corsair Vengeance 16GB',
          category: 'Memória',
          brand: 'Corsair',
          costPrice: 270,
          stock: 12,
          notes: 'DDR4 3200MHz.'
        },
        {
          id: 4,
          name: 'SSD 1TB NVMe',
          category: 'SSD',
          brand: 'Kingston',
          costPrice: 320,
          stock: 15,
          notes: 'Leitura rápida e volume suficiente para jogos.'
        },
        {
          id: 5,
          name: 'Fonte 750W 80+ Bronze',
          category: 'Fonte',
          brand: 'Corsair',
          costPrice: 420,
          stock: 8,
          notes: 'Boa eficiência e alta potência.'
        },
        {
          id: 6,
          name: 'RTX 4060 8GB',
          category: 'Placa de Vídeo',
          brand: 'NVIDIA',
          costPrice: 2100,
          stock: 3,
          notes: 'Desempenho para jogos em 1080p/1440p.'
        },
        {
          id: 7,
          name: 'Gabinete Gamer ATX',
          category: 'Gabinetes',
          brand: 'DeepCool',
          costPrice: 390,
          stock: 7,
          notes: 'Visual gamer com boa ventilação.'
        }
      ],
      clients: [
        {
          id: 1,
          name: 'Cliente Exemplo',
          phone: '(11) 99999-0000',
          email: 'cliente@exemplo.com',
          notes: 'Cliente favorito'
        }
      ],
      quotations: []
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function getData() {
  ensureStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function buildAuthToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getUserByToken(token) {
  const userId = sessions.get(token);
  if (!userId) return null;

  const data = getData();
  return data.users.find((user) => user.id === userId) || null;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não informado.' });
  }

  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }

  req.user = user;
  next();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const data = getData();
  const user = data.users.find(
    (item) => item.username.toLowerCase() === String(username || '').toLowerCase() && item.password === String(password || '')
  );

  if (!user) {
    return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
  }

  const token = buildAuthToken();
  sessions.set(token, user.id);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username
    }
  });
});

app.get('/api/config', authMiddleware, (req, res) => {
  const data = getData();
  res.json(data.settings);
});

app.put('/api/config', authMiddleware, (req, res) => {
  const data = getData();
  data.settings = {
    ...data.settings,
    ...req.body
  };

  saveData(data);
  res.json(data.settings);
});

app.get('/api/catalog', authMiddleware, (req, res) => {
  const data = getData();
  res.json(data.catalog);
});

app.post('/api/catalog', authMiddleware, (req, res) => {
  const data = getData();
  const item = {
    id: Date.now(),
    ...req.body,
    costPrice: Number(req.body.costPrice || 0),
    stock: Number(req.body.stock || 0)
  };

  data.catalog.push(item);
  saveData(data);
  res.status(201).json(item);
});

app.put('/api/catalog/:id', authMiddleware, (req, res) => {
  const data = getData();
  const catalogIndex = data.catalog.findIndex((item) => String(item.id) === String(req.params.id));

  if (catalogIndex === -1) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  data.catalog[catalogIndex] = {
    ...data.catalog[catalogIndex],
    ...req.body,
    costPrice: Number(req.body.costPrice ?? data.catalog[catalogIndex].costPrice),
    stock: Number(req.body.stock ?? data.catalog[catalogIndex].stock)
  };

  saveData(data);
  res.json(data.catalog[catalogIndex]);
});

app.delete('/api/catalog/:id', authMiddleware, (req, res) => {
  const data = getData();
  const originalLength = data.catalog.length;
  data.catalog = data.catalog.filter((item) => String(item.id) !== String(req.params.id));

  if (data.catalog.length === originalLength) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  saveData(data);
  res.json({ success: true });
});

app.get('/api/marketplace/boadica/search', authMiddleware, async (req, res) => {
  const query = String(req.query.q || '').trim();
  const region = String(req.query.region || 'all').trim().toLowerCase();

  if (query.length < 2) {
    return res.status(400).json({ message: 'Informe pelo menos dois caracteres para buscar.' });
  }

  try {
    const requestHeaders = { Accept: 'application/json', 'User-Agent': 'BebGames/1.0' };
    const suggestionsResponse = await fetch(
      `https://boadica.com.br/api/busca/sugestoes?termo=${encodeURIComponent(query)}`,
      { headers: requestHeaders }
    );

    if (!suggestionsResponse.ok) {
      return res.status(502).json({ message: 'O BoaDica não respondeu à busca.' });
    }

    const suggestions = await suggestionsResponse.json();
    const products = await Promise.all((suggestions || []).slice(0, 3).map(async (suggestion) => {
      const productResponse = await fetch(
        `https://boadica.com.br/api/produto/${encodeURIComponent(suggestion.codProduto)}`,
        { headers: requestHeaders }
      );

      if (!productResponse.ok) return null;
      return productResponse.json();
    }));

    const results = products
      .filter(Boolean)
      .flatMap((product) => (product.ofertas || []).map((offer) => ({
        id: `${product.produto.codProduto}-${offer.codLoja}`,
        title: `${product.produto.modelo} - ${offer.nome}`,
        price: Number(offer.preco || 0),
        permalink: `https://www.boadica.com.br/produto/${product.produto.codProduto}`,
        thumbnail: product.produto.urlImagem,
        neighborhood: offer.bairro || '',
        city: offer.cidade || '',
        state: offer.estado || ''
      })))
      .filter((item) => item.price > 0)
      .filter((item) => region !== 'zona-oeste' || isWestZoneOffer(item))
      .sort((first, second) => first.price - second.price)
      .slice(0, 8);

    res.json(results);
  } catch (error) {
    res.status(502).json({ message: 'Não foi possível consultar o BoaDica agora.' });
  }
});

function isWestZoneOffer(offer) {
  const westZoneNeighborhoods = [
    'anil', 'bangu', 'barra da tijuca', 'barra de guaratiba', 'camorim', 'campo grande',
    'cidade de deus', 'curicica', 'deodoro', 'gardênia azul', 'guaratiba',
    'honório gurgel', 'ilha de guaratiba', 'inguá', 'itanhangá', 'jacarepaguá', 'joá',
    'mallet', 'paciência', 'padre miguel', 'pechincha', 'praça seca', 'realengo',
    'recreio dos bandeirantes', 'santa cruz', 'santíssimo', 'senador camará', 'senador vasconcelos',
    'sepetiba', 'sulacap', 'taquara', 'tanque', 'vargem grande', 'vargem pequena', 'vila militar'
  ];
  const normalizeLocation = (value) => String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const neighborhood = normalizeLocation(offer.neighborhood);
  return westZoneNeighborhoods.some((item) => neighborhood.includes(normalizeLocation(item)));
}

app.get('/api/clients', authMiddleware, (req, res) => {
  const data = getData();
  res.json(data.clients);
});

app.post('/api/clients', authMiddleware, (req, res) => {
  const data = getData();
  const client = {
    id: Date.now(),
    ...req.body
  };

  data.clients.push(client);
  saveData(data);
  res.status(201).json(client);
});

app.put('/api/clients/:id', authMiddleware, (req, res) => {
  const data = getData();
  const clientIndex = data.clients.findIndex((client) => String(client.id) === String(req.params.id));

  if (clientIndex === -1) {
    return res.status(404).json({ message: 'Cliente não encontrado.' });
  }

  data.clients[clientIndex] = {
    ...data.clients[clientIndex],
    ...req.body
  };

  saveData(data);
  res.json(data.clients[clientIndex]);
});

app.get('/api/quotations', authMiddleware, (req, res) => {
  const data = getData();
  res.json(data.quotations);
});

app.post('/api/quotations', authMiddleware, (req, res) => {
  const data = getData();
  const quotation = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  data.quotations.unshift(quotation);
  saveData(data);
  res.status(201).json(quotation);
});

app.post('/api/quotations/:id/whatsapp', authMiddleware, (req, res) => {
  const data = getData();
  const quotation = data.quotations.find((item) => String(item.id) === String(req.params.id));

  if (!quotation) {
    return res.status(404).json({ message: 'Orçamento não encontrado.' });
  }

  const client = data.clients.find((item) => String(item.id) === String(quotation.clientId)) || { name: 'Cliente' };
  const text = buildWhatsAppMessage(quotation, client, data.settings);
  res.json({ message: text });
});

function buildWhatsAppMessage(quotation, client, settings) {
  const lines = [
    `*${settings.storeName}*`,
    `Olá ${client.name}, segue o orçamento solicitado:`,
    '',
    'Itens:'
  ];

  quotation.items.forEach((item) => {
    lines.push(`- ${item.name} x${item.quantity} = R$ ${(item.totalPrice || 0).toFixed(2)}`);
  });

  lines.push('', `Subtotal: R$ ${Number(quotation.subtotal || 0).toFixed(2)}`);
  lines.push(`Desconto: R$ ${Number(quotation.discount || 0).toFixed(2)}`);
  lines.push(`Frete: R$ ${Number(quotation.shipping || 0).toFixed(2)}`);
  lines.push(`Total: *R$ ${Number(quotation.total || 0).toFixed(2)}*`);

  return lines.join('\n');
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Beb Games está rodando em http://localhost:${PORT}`);
});
