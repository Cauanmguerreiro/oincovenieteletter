# O Inconveniente — por Cauan Guerreiro

Aplicação web editorial de opinião, cobrindo Tecnologia & IA, Projetos, Trabalho e Sociedade & política.

Construído com base no protótipo visual `O_Inconveniente_Landingpage.html` e no contrato de dados e segurança da pasta `O_Inconveniente_Firebase` (Cloud Firestore, Firebase Storage e Firebase Authentication).

---

## 1. Identidade Visual e Editorial

- **Tipografia e Cores**: Estilo editorial refinado baseado em `--paper: #f8f8f5`, `--ink: #171717`, `--red: #b91c28`, títulos serifados (`Newsreader` / Georgia) e tipografia sans limpa.
- **Símbolo do Corvo**: Extraído e preservado com transparência e a icônica pena vermelha afiada na face. Símbolo editorial independente ("Um olhar. Outra pergunta.").
- **Autoria e Bio**: Assinatura *por Cauan Guerreiro*, Founder da CodeBrand, Viamão — RS.
- **Fechamento e Assinatura**: A frase *“Mas, de novo, isso é só mais um ponto em aberto…”* é renderizada de forma única, preservando o encerramento editorial antes da chamada *Assinar em breve* (com `subscriptionsEnabled: false`).

---

## 2. Estrutura de Rotas e Páginas Públicas

- `/` ou `#/`: **Home**
  - **Última matéria publicada**: Filtro `status == 'published'`, ordenado por `publishedAt desc` (limit 1).
  - **Mais acessada**: Filtro `status == 'published'`, ordenado por `readingCount desc` e desempate por `publishedAt desc` (limit 1). Se todas tiverem 0 leituras, apresenta estado vazio editorial sincero.
  - **Destaque do Inconveniente**: Configurado em `settings/publication.featuredArticleSlug`.
  - **Temas editoriais**: Tecnologia sem atalho, Projetos no mundo real, Trabalho & sociedade.
  - **Modo Demonstração**: Enquanto o banco remoto estiver com o artigo piloto em rascunho (*draft* conforme `seed.json`), exibe prévia demonstrativa claramente identificada.
- `/sobre` ou `#/sobre`: **Sobre a publicação**
  - Lê `settings/publication`, perfil do autor principal (Cauan Guerreiro) e assuntos visíveis ordenados por `sortOrder`.
- `/paginas` ou `#/paginas`: **Arquivo de Artigos**
  - Lista paginada por cursor de matérias publicadas com título, resumo, assunto, autor, data e tempo de leitura.
- `/paginas/:slug` ou `#/paginas/:slug`: **Página do Artigo**
  - Renderiza cabeçalho, autoria, capa opcional e blocos ordenados (`paragraph`, `heading`, `quote`, `image`).
  - Imagens de blocos com alt text e legendas.
  - Registro seguro de leitura única por sessão por dia UTC via `/api/read`.
- `/admin/login` e `/admin`: **Administração Editorial**
  - Protegido por Firebase Authentication e verificação da claim `newsletterAdmin: true`.

---

## 3. Painel Administrativo (`/admin`)

O acesso editorial requer autenticação e custom claim `newsletterAdmin: true`:
1. **Listagem de Matérias**: Filtros por status (*Todos*, *Rascunhos*, *Publicados*, *Arquivados*), contador de leituras, data e ação de destaque.
2. **Editor de Matéria**:
   - Criação com geração automática de slug; slug é travado/estável após criação.
   - Edição de Título, Resumo, Autor, Tema e Minutos de leitura.
   - Editor de blocos ordenados: adicionar, editar, mover (subir/descer) e excluir blocos (`paragraph`, `heading` níveis 2/3/4, `quote`, `image`).
   - Upload de imagens para o Firebase Storage (`articles/{slug}/{fileName}`) com validação PNG/JPEG/WebP/GIF até 2 MiB e registro de metadados em `media`.
   - Salvar Rascunho, Visualizar Prévia, Publicar (com `serverTimestamp()`) e Arquivar.
   - Confirmação visual em tempo real após resposta do Firebase e aviso antes de descartar alterações pendentes.
3. **Configurações & Sobre**:
   - Edição de `settings/publication` (Nome, Tagline, Frase de encerramento, Chamada de assinatura, Texto Sobre em Markdown).
   - Edição do autor padrão `authors/cauan-guerreiro` e tópicos `topics/{topicId}`.
4. **Banco & Seed**:
   - Inicialização segura do banco com os 7 documentos de `seed.json` sob confirmação explícita, sem sobrescrever documentos já existentes.

---

## 4. Procedimento Seguro para Atribuição da Claim `newsletterAdmin`

A claim não pode ser autoatribuída no navegador por questões de segurança. O ambiente dispõe de duas formas confiáveis:

### Via Endpoint de Servidor Confiável:
Faça uma requisição autenticada do servidor:
```bash
curl -X POST http://localhost:3000/api/admin/claim \
  -H "Content-Type: application/json" \
  -d '{"uid": "SEU_UID_FIREBASE", "userEmail": "cauanmguerreiro@gmail.com"}'
```

Ou clique no botão de autorização disponível em `/admin/login` quando conectado com o e-mail do autor (`cauanmguerreiro@gmail.com`).

---

## 5. Comandos e Testes

- **Desenvolvimento**:
  ```bash
  npm run dev
  ```
- **Executar Testes de Contratos e Regras**:
  ```bash
  npm test
  ```
- **Compilação de Produção**:
  ```bash
  npm run build
  ```
- **Iniciar Servidor Completo**:
  ```bash
  npm start
  ```

---

## 6. Verificações Realizadas

- [x] Leitura pública disponível sem login.
- [x] Rascunhos e mídias de rascunhos inacessíveis a usuários não autenticados ou sem permissão.
- [x] Edição restrita a usuários com `newsletterAdmin: true`.
- [x] Seleções da Home (Última, Mais lida e Destaque) com consultas independentes e estado vazio honesto.
- [x] Matérias arquivadas mantêm URL mas ficam fora da listagem pública.
- [x] Frase de encerramento exibida sem repetição e botão "Assinar em breve".
- [x] Testes unitários de contratos (`tests/contracts.test.mjs`) aprovados com 100% de sucesso.
- [x] Testes de regras de segurança (`tests/rules.test.mjs`) aprovados.
- [x] Responsividade mobile testada sem rolagem horizontal.
