# DevCity

Plataforma de aprendizado para devs júnior: uma **biblioteca gratuita e curada** e **trilhas de projetos reais**, apresentadas como uma cidade cyberpunk em 3D (com modo 2D completo).

> **Status: as 8 fases do prompt estão implementadas.** Cidade 3D com dois modos de navegação, modo 2D completo, 243 recursos gratuitos na biblioteca e 30 projetos (215 etapas) nas 6 trilhas, em PT-BR e inglês. Para fechar: rodar os testes ponta a ponta e publicar na Vercel (passo a passo em [Deploy na Vercel](#deploy-na-vercel)).

## Cidade 3D (Fase 3)

- A Torre Central (`/pt` ou `/en`) abre como cidade 3D quando o navegador tem WebGL e o sistema não pede menos animações. Caso contrário, abre o modo 2D. O botão **Cidade 3D / Modo 2D** no topo troca a qualquer momento, e a escolha fica salva.
- **Modo Viagem:** clique num prédio, num letreiro ou num item da lista **Destinos**. A câmera voa em curva bezier (1,5 a 2,5 s) e, ao chegar, abre o painel do destino. Arrastar gira a câmera e a roda do mouse aproxima.
- **Prédios:** cada projeto é um prédio com um andar por etapa. Etapa concluída acende o andar; projeto completo acende o letreiro do topo.
- **Acessibilidade:** a lista Destinos é navegável por teclado, os painéis fecham com Esc e leitores de tela recebem avisos de "viajando / chegou".
- O layout da cidade é calculado em `lib/city-layout.ts` (matemática pura, com testes). A cena fica em `components/three/`, carregada só no navegador.

## Visual cyberpunk (Fase 5)

- **Neon com bloom:** só os materiais neon (brilho acima de 1, `toneMapped={false}`) passam do limiar do bloom; fachadas e chão ficam escuros. Tone mapping ACES no fim (`components/three/Effects.tsx`).
- **Prédios dos projetos:** um andar de vidro escuro por etapa, cada um com uma faixa neon. Etapa concluída acende a faixa e as janelas do andar; projeto completo acende o letreiro do topo.
- **Atmosfera:** neblina exponencial, céu noturno em gradiente com brilho magenta no horizonte, estrelas, chuva de partículas que acompanha a câmera, chão molhado com `MeshReflectorMaterial`, janelas acesas nos prédios decorativos (textura gerada no navegador) e neon nos telhados.
- **Biblioteca:** fachada virada para a praça, estantes de luz e estantes holográficas flutuando ao redor.
- **Carros voadores** em órbitas acima dos prédios (um único `InstancedMesh`).
- **Trilha ambiente synthwave** gerada na hora com Web Audio (sem arquivos), **desligada por padrão**.
- **Ajustes no HUD:** Chuva, Som ambiente, Eventos no céu e Gráficos (Automático, Alto, Leve). Tudo fica salvo.

## Desempenho, acessibilidade e eventos no céu (Fase 6)

- **Qualidade adaptativa:** no modo de gráficos **Automático**, o `PerformanceMonitor` do drei mede o fps e move um fator entre 0 e 1. Dele saem a resolução de desenho (0,75 a 1,5) e três níveis de detalhe (`lib/quality.ts`): **alto** (reflexo 512, antisserrilhado, bloom completo), **médio** (reflexo 256, sem antisserrilhado) e **leve** (sem reflexo, bloom mais barato, menos chuva, carros e estrelas). Celulares e aparelhos com poucos núcleos ou pouca memória começam no médio ou no leve e sobem se o fps permitir. **Alto** e **Leve** fixam o nível.
- **Troca automática para o 2D:** se, com tudo no mínimo, o fps ficar abaixo de 20 por 6 s (ou abaixo de 8 por 4 s em qualquer nível), a cidade dá lugar ao modo 2D, com aviso e botão **Tentar o 3D de novo**. A troca vale só para a sessão. Quem escolheu "Cidade 3D" de propósito não é trocado: recebe um aviso com o botão **Usar modo 2D**.
- **Prédios instanciados:** os prédios de projeto são montados com peças modulares (`lib/building-pieces.ts`, com testes). Cada distrito desenha todos os andares em **duas** chamadas de desenho (vidro + neon), em vez de duas por andar de cada prédio. O brilho de cada andar vem da cor da instância. Isso prepara a cidade para os muitos projetos da Fase 7.
- **LOD (`<Detailed>` do drei):** de longe, os andares de vidro de cada distrito viram uma torre só e as estantes holográficas da biblioteca somem.
- **Carregamento progressivo:** na primeira visita da sessão, os distritos aparecem um a um, "subindo do chão", para a primeira imagem sair rápido.
- **Eventos no céu:** a cada 20 a 45 s acontece um evento aleatório: estrela cadente, chuva de meteoros, dirigível com painel holográfico e holofote, show de drones (V → anel → coração), nave cargueira ou aurora neon. O trajeto é escolhido para cruzar o que a câmera está vendo (`lib/sky-events.ts`, com testes); eventos longos não se sobrepõem. Dá para desligar em Ajustes → Eventos no céu.
- **Chuva mais leve:** de 3000 para 1000 gotas no nível alto (650 no médio, 400 no leve), mais transparentes.
- **Acessibilidade do 2D:** auditoria de contraste (AA), nomes acessíveis, ordem de títulos, idioma da página e landmarks nas páginas principais. Corrigidos: números dos projetos com contraste baixo, campo de importação oculto aparecendo para leitores de tela e um salto de título na biblioteca.
- **Ferramentas de teste (só em `npm run dev`):** no console do navegador, `__devcity.sky("blimp")` dispara um evento na hora (`meteor`, `meteorShower`, `blimp`, `drones`, `cargo`, `aurora`) e `__devcity.quality()` mostra o fator de qualidade e o fps medido.
- **Sobre glTF/KTX2:** o prompt pede modelos glTF comprimidos e texturas KTX2, mas a cidade não usa nenhum arquivo de modelo ou textura: tudo é geometria simples e texturas desenhadas no navegador. Se modelos forem adicionados no futuro, a regra vale para eles.

## Navegação (Fase 4)

- **Dois modos**, alternados com a tecla **F** ou com o botão no canto superior esquerdo (a escolha fica salva):
  - **Viagem:** clicar num prédio, letreiro, item de Destinos ou distrito do minimapa faz a câmera voar até lá.
  - **Voo livre:** clique na cena para capturar o mouse. **WASD/setas** movem, o **mouse** olha, **Espaço** sobe e **Shift** desce. **Esc** solta o mouse.
- **Celular:** no voo livre aparecem um joystick (andar), botões ▲ ▼ (subir/descer) e arrastar a tela olha em volta.
- **Colisão:** não dá para atravessar prédios (a câmera desliza encostada na parede) nem sair dos limites da cidade. A lógica fica em `resolveMovement` (`lib/city-layout.ts`), com testes.
- **Minimapa:** a cidade vista de cima, com uma seta mostrando posição e direção da câmera. Clicar num distrito viaja até ele.
- **Letreiros:** são elementos HTML comuns posicionados a cada quadro (`LabelProjector` + `CityLabels`), sempre legíveis, traduzidos junto com a interface e sem criar raízes React extras.

## Conteúdo (Fase 7)

Todas as trilhas da seção 6.2 do prompt estão cadastradas. Cada projeto tem etapas de 30 min a 3 h com objetivo, instruções sem o código pronto, critérios de pronto, recursos da biblioteca e, quando ajuda, uma dica escondida. Todo projeto passa por Git, README e publicação.

| Distrito | Projetos (em ordem de dificuldade) |
|---|---|
| Fundamentos | Meu perfil de dev · Calculadora e jogo da velha · Banco de dados de biblioteca em SQL · Terminal e HTTP |
| Web | Landing page com Tailwind · App de tarefas com React, TypeScript e testes · Blog com Next.js, MDX e SEO · Mini-SaaS de agendamentos (Next.js, PostgreSQL, Auth.js, Stripe em modo teste, Playwright) · *Bônus:* o mesmo app em Vue ou Angular |
| Backend | API de biblioteca com Node.js · Encurtador com Python, FastAPI e Redis · Estoque com Java e Spring Boot · Agendamentos com C# e ASP.NET Core · E-commerce com PHP e Laravel · Chat com WebSocket e rate limiter em Go · *Bônus:* painel admin com Django |
| Mobile | Lista de compras com React Native (Expo) · Clima com Flutter · Hábitos nativo com Kotlin e Jetpack Compose · Lista conectada à sua API com build de teste |
| Cloud & DevOps | Linux e terminal · Docker e Docker Compose · CI/CD com GitHub Actions · API na nuvem com domínio e HTTPS · Observabilidade · *Bônus:* Kubernetes e Terraform |
| IA | Chatbot com streaming · RAG: converse com seus PDFs · Agente que usa ferramentas · IA em produção: custos, segurança e avaliação |

**Biblioteca:** 243 recursos gratuitos (52 em PT-BR, 191 em inglês), com 8 ou mais por tecnologia principal (HTML, CSS, JavaScript, TypeScript, React, Node, Git, SQL, HTTP, Python, Linux, terminal, React Native, IA, Docker e PostgreSQL) e docs oficiais de Next.js, FastAPI, Django, Spring, .NET, Laravel, Go, Flutter, Kotlin, Kubernetes e GitHub Actions. Testes garantem as metas e que toda etapa aponta para recursos que existem.

**Links a verificar:** 5 recursos estão marcados com `"verified": false` (aparecem com o selo "Link a verificar") porque eu não tinha certeza absoluta do endereço atual: `fullstackopen-pt`, `laravel-bootcamp`, `claude-tool-use`, `building-effective-agents` e `owasp-llm-top10`. Abra cada um antes de publicar e mude para `true` (ou corrija a URL).

## Como rodar

Precisa do **Node.js 20.9 ou mais novo**.

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. Você será levado para `/pt` ou `/en` conforme o idioma do navegador.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (também valida todo o conteúdo) |
| `npm test` | Testes de unidade (Vitest) |
| `npm run test:e2e` | Testes ponta a ponta (Playwright, desktop e celular) |
| `npm run typecheck` | Checagem de tipos (TypeScript estrito) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## O que já funciona (Fase 1)

- **Next.js 15 (App Router) + TypeScript estrito + Tailwind 4**
- **i18n com next-intl**: rotas `/pt` e `/en`, seletor de idioma, toda a UI e o conteúdo nos dois idiomas
- **Conteúdo versionado em `/content`** (JSON), validado com **zod** no build: schema, ids duplicados e referências quebradas (recurso ou pré-requisito inexistente) quebram o build com mensagem clara
- **Torre Central**: boas-vindas, progresso geral, "próximo passo", exportar/importar/apagar progresso, cards dos distritos
- **Arquivo Neon**: filtros por tecnologia, tipo, nível, idioma e "minha lista", busca fuzzy (fuse.js), status "quero ver / vendo / concluído"
- **Distritos**: card "Por que aprender isso?" com dados de mercado e fontes, lista de projetos com progresso
- **Projetos**: etapas com objetivo, instruções em Markdown, dica escondida, critérios de pronto, recursos e botão de concluir
- **Busca global** com `Ctrl/Cmd + K`
- **Progresso** em `localStorage` (zustand + persist), versionado com migração tolerante a dados antigos ou corrompidos
- **Acessibilidade**: link "pular para o conteúdo", foco visível, navegação por teclado, `aria-*`, texto de leitura em painéis escuros de alto contraste, respeita `prefers-reduced-motion`

## Estrutura

```
app/[locale]/          páginas: hub, library, tracks/[track], tracks/[track]/[project]
components/three/      cena 3D (cidade, prédios, efeitos, monitor de qualidade)
components/three/sky/  eventos aleatórios no céu
components/ui/         HUD, painéis, cards, busca
content/resources/     biblioteca (JSON)
content/tracks/        tracks.json + um JSON por projeto
i18n/                  rotas e configuração do next-intl
lib/                   schemas zod, loaders, busca, progresso, layout da cidade, qualidade, eventos do céu
messages/              traduções da UI (pt.json, en.json)
store/                 zustand (progresso e preferências, navegação na cidade, desempenho)
tests/unit/            Vitest
tests/e2e/             Playwright
.github/workflows/     CI no GitHub Actions
```

## Como adicionar conteúdo

**Recurso da biblioteca:** adicione um objeto em `content/resources/*.json` seguindo `ResourceSchema` (`lib/schemas.ts`). Use só links oficiais. Se não tiver certeza do link, marque `"verified": false`: ele aparece com o selo "Link a verificar".

**Projeto de trilha:** crie `content/tracks/<trilha>/<id>.json` seguindo `ProjectSchema` e importe em `lib/content.ts` (lista `rawProjects`). Regras pedagógicas: cada etapa termina com algo funcionando, explica o porquê, **não entrega o código pronto** e dura de 30 min a 3 h (o schema recusa durações fora disso). Todo projeto inclui etapas de Git, README e deploy.

Depois rode `npm test` para validar.

## Decisões e ajustes em relação ao prompt

- **Next.js 15.5** (e não 16): a API de middleware do next-intl é a mais estável nessa versão. Dá para migrar depois.
- **zod 3.25**: versão madura; os schemas usam só a API comum ao zod 3 e 4.
- `whatYouLearn`, `checklist` e `extraChallenges` viraram listas **bilíngues** (`{ pt, en }[]`), para cumprir "todo conteúdo em PT-BR e inglês".
- Campos extras: `order` e `bonus` nos projetos, `estimatedMinutes` nas etapas e `verified` nos recursos.
- Idioma dos recursos aparece como selo **PT-BR / EN** em vez de emoji de bandeira, porque o Windows não desenha bandeiras.
- Segmentos de rota em inglês (`/pt/library`, `/pt/tracks/web`) nos dois idiomas, para manter os links estáveis.

## Testes (Fase 8)

- **Vitest (`npm test`):** lógica de progresso e migração, carregamento e validação do conteúdo (schemas, referências, metas da biblioteca, cobertura da seção 6.2), as stores (progresso, desempenho e cidade), o layout da cidade com os 30 projetos reais, qualidade adaptativa, peças dos prédios e eventos do céu.
- **Playwright (`npm run test:e2e`):** sobe o build de produção na porta 3100 e testa, no Chrome de desktop e num celular emulado:
  - modo 2D: Torre Central, distritos, páginas de projeto, 404;
  - progresso: marcar etapa, recarregar, exportar, apagar e importar de volta, arquivo inválido;
  - biblioteca: filtro por tecnologia, busca com erro de digitação, "Quero ver" e "Minha lista", só links https;
  - idioma e busca global (`Ctrl+K`);
  - cidade 3D: viagem até um distrito com painel, página da trilha pelo painel, tecla F e joystick no celular, troca para 2D e queda para 2D sem WebGL;
  - acessibilidade com axe (as mesmas regras WCAG que o Lighthouse usa) nas páginas do modo 2D.
- Na primeira vez: `npx playwright install chromium`.
- **CI:** `.github/workflows/ci.yml` roda lint, testes de unidade, build e checagem de tipos, e depois os testes ponta a ponta, a cada push na `main` e em cada pull request.

## Deploy na Vercel

O projeto não precisa de configuração especial: a Vercel reconhece o Next.js sozinha e não há variáveis de ambiente nem banco.

1. Crie um repositório no GitHub e envie o projeto (`git init`, `git add .`, `git commit`, `git push`).
2. Em <https://vercel.com>, entre com a conta do GitHub, clique em **Add New → Project** e importe o repositório.
3. Deixe tudo no padrão e clique em **Deploy**. Em um ou dois minutos o site está no ar num endereço `.vercel.app`.
4. Cada `git push` na `main` publica uma versão nova; cada pull request ganha um link de preview.

Alternativa pelo terminal: `npx vercel` (pede login na primeira vez) e depois `npx vercel --prod`.

## Critérios de pronto (seção 11 do prompt)

| Critério | Como foi atendido |
|---|---|
| Chegar a qualquer seção pelos dois modos e pelo 2D | Destinos, prédios e minimapa na cidade; cabeçalho, cards e busca no 2D (testes e2e) |
| Biblioteca com filtros, busca e só links gratuitos e válidos | Filtros e busca fuzzy; schema exige `free: true` e `https`; 5 links marcados para verificação |
| Todas as trilhas da seção 6.2 | 30 projetos e 215 etapas, conferidos por teste |
| Progresso persiste; exportar/importar | localStorage versionado; fluxo completo testado no Playwright |
| PT-BR e inglês | UI e conteúdo nos dois idiomas; teste de paridade das traduções |
| 60 fps, celular e queda para 2D sem WebGL | Qualidade adaptativa, prédios instanciados com LOD, joystick; queda para 2D testada |
| Lighthouse ≥ 90 de acessibilidade no 2D | Auditoria manual de contraste e nomes + axe nos testes e2e |
| Testes passando e deploy publicado | Vitest + Playwright + CI prontos; o deploy depende da sua conta na Vercel |
