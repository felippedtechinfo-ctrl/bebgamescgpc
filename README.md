# Beb Games - Sistema de Orçamentos

Sistema web simples para loja de informática, com login, catálogo de peças, margem configurável e geração de orçamento.

## Funcionalidades

- Login com autenticação
- Configuração da margem de lucro por porcentagem
- Cadastro de peças por categoria
- Cadastro de clientes
- Montagem de orçamento com itens, desconto e frete
- Visualização do valor final e preço com markup
- Preparado para exportação por WhatsApp e impressão/PDF

## Tecnologias

- Node.js
- Express
- HTML, CSS e JavaScript puro
- Armazenamento local em JSON

## Como rodar

1. Instale as dependências:
   npm install
2. Inicie o sistema:
   npm start
3. Acesse no navegador:
   http://localhost:3000

## Publicar na internet

O projeto está preparado para o Render usando o arquivo `render.yaml`.

1. Crie um repositório privado no GitHub e envie estes arquivos do projeto.
2. No Render, escolha **New > Blueprint** e conecte o repositório.
3. Confirme o serviço `beb-games-orcamentos` e aguarde o deploy.
4. Acesse a URL HTTPS fornecida pelo Render.

O serviço usa um disco persistente para manter `data/store.json`. O plano com disco persistente pode ser cobrado pelo Render; não remova o disco, pois ele contém clientes, catálogo e orçamentos.

Antes de publicar, troque o usuário e a senha padrão em `data/store.json` e mantenha o repositório privado.

## Acesso padrão

- Usuário: admin
- Senha: admin123

## Observação

Este é um MVP prático para uso local e pode evoluir com banco de dados real, PDF, integração de compra e automações de WhatsApp.
