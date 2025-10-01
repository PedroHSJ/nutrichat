#!/usr/bin/env node

/**
 * Script para fazer release automatizado
 * Executa o processo completo: gerar notes + versionar + push
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  generateReleaseNotes,
  getNextVersion,
} = require("./generate-release-notes");
const https = require("https");

// Carregar variáveis de ambiente do arquivo .env
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const equalIndex = trimmedLine.indexOf("=");
          if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            if (key && value && !process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
      console.log("📄 Arquivo .env carregado");
    }
  } catch (error) {
    console.log("⚠️ Erro ao carregar .env:", error.message);
  }
}

// Carregar .env no início
loadEnvFile();

// Função para traduzir mensagens de commit para português
function translateCommitMessage(message) {
  // Dicionário de traduções comuns
  const translations = {
    // Ações
    add: "adicionar",
    create: "criar",
    implement: "implementar",
    build: "construir",
    develop: "desenvolver",
    setup: "configurar",
    init: "inicializar",
    install: "instalar",

    // Correções
    fix: "corrigir",
    correct: "corrigir",
    resolve: "resolver",
    solve: "solucionar",
    repair: "reparar",
    patch: "corrigir",

    // Melhorias
    improve: "melhorar",
    enhance: "aprimorar",
    optimize: "otimizar",
    update: "atualizar",
    upgrade: "atualizar",
    refactor: "refatorar",
    clean: "limpar",
    polish: "polir",

    // Remoções
    remove: "remover",
    delete: "deletar",
    drop: "remover",

    // Funcionalidades
    feature: "funcionalidade",
    functionality: "funcionalidade",
    system: "sistema",
    component: "componente",
    module: "módulo",
    service: "serviço",
    api: "API",
    interface: "interface",
    ui: "interface",
    ux: "experiência do usuário",

    // Específicos do projeto
    auth: "autenticação",
    authentication: "autenticação",
    login: "login",
    logout: "logout",
    user: "usuário",
    users: "usuários",
    dashboard: "painel",
    calendar: "calendário",
    schedule: "escala",
    scales: "escalas",
    member: "membro",
    members: "membros",
    department: "departamento",
    departments: "departamentos",
    organization: "organização",
    organizations: "organizações",
    holiday: "feriado",
    holidays: "feriados",
    vacation: "folga",
    vacations: "folgas",
    report: "relatório",
    reports: "relatórios",
    export: "exportar",
    import: "importar",
    pdf: "PDF",
    email: "email",
    notification: "notificação",
    notifications: "notificações",
    validation: "validação",
    form: "formulário",
    forms: "formulários",
    button: "botão",
    buttons: "botões",
    modal: "modal",
    sidebar: "barra lateral",
    navbar: "barra de navegação",
    footer: "rodapé",
    header: "cabeçalho",
    layout: "layout",
    theme: "tema",
    "dark mode": "modo escuro",
    "light mode": "modo claro",
    responsive: "responsivo",
    mobile: "mobile",
    desktop: "desktop",
    tablet: "tablet",

    // Técnicos
    database: "banco de dados",
    db: "banco de dados",
    migration: "migração",
    schema: "esquema",
    query: "consulta",
    endpoint: "endpoint",
    middleware: "middleware",
    config: "configuração",
    configuration: "configuração",
    environment: "ambiente",
    env: "ambiente",
    dependency: "dependência",
    dependencies: "dependências",
    package: "pacote",
    packages: "pacotes",
    version: "versão",
    release: "release",
    deploy: "deploy",
    deployment: "deployment",
    test: "teste",
    tests: "testes",
    testing: "teste",
    bug: "bug",
    error: "erro",
    warning: "aviso",
    log: "log",
    logging: "logging",
    security: "segurança",
    performance: "performance",
    loading: "carregamento",
    cache: "cache",
    storage: "armazenamento",
    session: "sessão",
    cookie: "cookie",
    token: "token",
    jwt: "JWT",
    oauth: "OAuth",
  };

  let translatedMessage = message;

  // Primeiro, aplicar traduções do dicionário local
  Object.entries(translations).forEach(([english, portuguese]) => {
    const regex = new RegExp(`\\b${english}\\b`, "gi");
    translatedMessage = translatedMessage.replace(regex, portuguese);
  });

  return translatedMessage;
}

// Função para traduzir usando Google Translate API (fallback)
async function translateWithGoogleAPI(text) {
  try {
    // Verificar se o texto já está principalmente em português
    const portugueseWords = [
      "o",
      "a",
      "de",
      "para",
      "com",
      "em",
      "do",
      "da",
      "no",
      "na",
      "por",
      "são",
      "foi",
      "ser",
      "tem",
      "mais",
      "seu",
      "que",
      "uma",
      "como",
      "ele",
      "ela",
      "ou",
      "se",
      "na",
      "um",
      "dos",
      "das",
      "nos",
      "nas",
    ];
    const wordsInText = text.toLowerCase().split(/\s+/);
    const portugueseWordCount = wordsInText.filter((word) =>
      portugueseWords.includes(word)
    ).length;

    // Se mais de 30% das palavras são portuguesas, provavelmente já está em português
    if (portugueseWordCount / wordsInText.length > 0.3) {
      return text;
    }

    // URL da API do Google Translate (gratuita via MyMemory)
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|pt-br`;

    return new Promise((resolve, reject) => {
      const https = require("https");

      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const response = JSON.parse(data);
              if (
                response.responseStatus === 200 &&
                response.responseData.translatedText
              ) {
                resolve(response.responseData.translatedText);
              } else {
                resolve(text); // Retorna o texto original se falhar
              }
            } catch (error) {
              resolve(text); // Retorna o texto original se falhar
            }
          });
        })
        .on("error", (error) => {
          resolve(text); // Retorna o texto original se falhar
        });
    });
  } catch (error) {
    return text; // Retorna o texto original se falhar
  }
}

// Função para traduzir mensagens com fallback para Google API
async function translateCommitMessageAdvanced(message) {
  // Primeiro, aplicar tradução local
  let translatedMessage = translateCommitMessage(message);

  // Se a mensagem ainda tem muitas palavras em inglês, tentar Google API
  const originalWords = message.split(/\s+/);
  const translatedWords = translatedMessage.split(/\s+/);

  // Se menos de 50% das palavras foram traduzidas, usar Google API
  const translationRate =
    (originalWords.length -
      translatedWords.filter(
        (word, index) =>
          originalWords[index] &&
          word.toLowerCase() === originalWords[index].toLowerCase()
      ).length) /
    originalWords.length;

  if (translationRate < 0.5) {
    try {
      const googleTranslated = await translateWithGoogleAPI(message);
      if (googleTranslated && googleTranslated !== message) {
        return googleTranslated;
      }
    } catch (error) {
      // Se falhar, continua com a tradução local
    }
  }

  return translatedMessage;
}

// Função para obter commits desde a última tag
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync("git describe --tags --abbrev=0", {
      encoding: "utf8",
    }).trim();
    const commits = execSync(`git log ${lastTag}..HEAD --oneline --no-merges`, {
      encoding: "utf8",
    }).trim();
    return commits ? commits.split("\n") : [];
  } catch (error) {
    // Se não há tags, pega todos os commits
    const commits = execSync("git log --oneline --no-merges", {
      encoding: "utf8",
    }).trim();
    return commits ? commits.split("\n") : [];
  }
}

// Função para categorizar commits
function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    technical: [],
    breaking: [],
  };

  commits.forEach((commit) => {
    const message = commit.toLowerCase();

    if (message.includes("feat:") || message.includes("feature:")) {
      categories.features.push(commit);
    } else if (message.includes("fix:") || message.includes("bug:")) {
      categories.fixes.push(commit);
    } else if (
      message.includes("improve:") ||
      message.includes("perf:") ||
      message.includes("style:")
    ) {
      categories.improvements.push(commit);
    } else if (
      message.includes("refactor:") ||
      message.includes("chore:") ||
      message.includes("deps:")
    ) {
      categories.technical.push(commit);
    } else if (message.includes("breaking:") || message.includes("!:")) {
      categories.breaking.push(commit);
    } else {
      // Categorizar por palavras-chave
      if (
        message.includes("add") ||
        message.includes("implement") ||
        message.includes("create")
      ) {
        categories.features.push(commit);
      } else if (
        message.includes("fix") ||
        message.includes("correct") ||
        message.includes("resolve")
      ) {
        categories.fixes.push(commit);
      } else {
        categories.improvements.push(commit);
      }
    }
  });

  return categories;
}

// Função para gerar o corpo da release
async function generateReleaseBody(version, type, commits) {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const typeLabels = {
    major: "Versão Principal (Mudanças Importantes)",
    minor: "Versão Secundária (Novas Funcionalidades)",
    patch: "Correção (Correções e Melhorias)",
  };

  const categories = categorizeCommits(commits);

  let body = `**Data de Lançamento**: ${date}  
**Versão**: ${version}  
**Tipo**: ${typeLabels[type]}

---

`;

  // Breaking Changes (para major)
  if (type === "major" && categories.breaking.length > 0) {
    body += `## ⚠️ **Mudanças Importantes**

`;
    for (const commit of categories.breaking) {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^breaking:\s*/i, "");
      const translatedMessage = await translateCommitMessageAdvanced(message);
      body += `- ${translatedMessage}\n`;
    }
    body += "\n";
  }

  // Novas Funcionalidades
  if (categories.features.length > 0) {
    body += `## ✨ **Novas Funcionalidades**

`;
    for (const commit of categories.features) {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(feat|feature):\s*/i, "");
      const translatedMessage = await translateCommitMessageAdvanced(message);
      body += `- ${translatedMessage}\n`;
    }
    body += "\n";
  }

  // Correções de Bugs
  if (categories.fixes.length > 0) {
    body += `## 🐛 **Correções de Bugs**

`;
    for (const commit of categories.fixes) {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(fix|bug):\s*/i, "");
      const translatedMessage = await translateCommitMessageAdvanced(message);
      body += `- ${translatedMessage}\n`;
    }
    body += "\n";
  }

  // Melhorias
  if (categories.improvements.length > 0) {
    body += `## ⚡ **Melhorias**

`;
    for (const commit of categories.improvements) {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(improve|perf|style):\s*/i, "");
      const translatedMessage = await translateCommitMessageAdvanced(message);
      body += `- ${translatedMessage}\n`;
    }
    body += "\n";
  }

  // Alterações Técnicas
  if (categories.technical.length > 0) {
    body += `## 🔧 **Alterações Técnicas**

`;
    for (const commit of categories.technical) {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(refactor|chore|deps):\s*/i, "");
      const translatedMessage = await translateCommitMessageAdvanced(message);
      body += `- ${translatedMessage}\n`;
    }
    body += "\n";
  }

  body += `---

**Sistema de Escalas v${version}**  

*Esta versão foi testada e está pronta para produção.*`;

  return body;
}

// Função para verificar se GitHub CLI está disponível
function isGitHubCliAvailable() {
  try {
    execSync("gh --version", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// Função para criar release usando GitHub CLI
function createReleaseWithCli(version, title, body, isPrerelease = false) {
  const tagName = `v${version}`;

  // Escapar caracteres especiais no body para o shell
  const escapedBody = body.replace(/"/g, '\\"').replace(/`/g, "\\`");

  const command = `gh release create "${tagName}" --title "${title}" --notes "${escapedBody}" ${
    isPrerelease ? "--prerelease" : ""
  }`;

  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error("Erro ao criar release com GitHub CLI:", error.message);
    return false;
  }
}

// Função para criar release usando API do GitHub
function createReleaseWithApi(version, title, body, isPrerelease = false) {
  const token = process.env.GITHUB_TOKEN;
  if (!token || token.trim() === "") {
    console.error(
      "❌ Token do GitHub não encontrado ou vazio. Verifique a variável GITHUB_TOKEN no arquivo .env"
    );
    console.log(
      "🔍 Token atual:",
      token ? `${token.substring(0, 10)}...` : "undefined"
    );
    return false;
  }

  const tagName = `v${version}`;
  const repoOwner = "PedroHSJ";
  const repoName = "escalas-ministeriais";

  const data = JSON.stringify({
    tag_name: tagName,
    target_commitish: "master",
    name: title,
    body: body,
    draft: false,
    prerelease: isPrerelease,
  });

  const options = {
    hostname: "api.github.com",
    port: 443,
    path: `/repos/${repoOwner}/${repoName}/releases`,
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "escalas-ministeriais-release-script",
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const release = JSON.parse(responseBody);
          console.log(`✅ Release criada com sucesso: ${release.html_url}`);
          resolve(true);
        } else {
          console.error(`❌ Erro na API do GitHub: ${res.statusCode}`);
          console.error(responseBody);
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Erro na requisição:", error.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || "patch";

  if (!["patch", "minor", "major"].includes(versionType)) {
    console.error("❌ Tipo de versão inválido. Use: patch, minor ou major");
    process.exit(1);
  }

  async function executeRelease() {
    try {
      console.log("🚀 Iniciando processo de release no GitHub...\n");

      // 1. Verificar se há mudanças não commitadas
      try {
        const status = execSync("git status --porcelain", { encoding: "utf8" });
        if (status.trim()) {
          console.error(
            "❌ Há mudanças não commitadas. Commit ou stash antes de fazer release."
          );
          process.exit(1);
        }
      } catch (error) {
        console.error("❌ Erro ao verificar status do git:", error.message);
        process.exit(1);
      }

      // 2. Ler versão atual
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const currentVersion = packageJson.version;
      const nextVersion = getNextVersion(currentVersion, versionType);

      console.log(`📦 Versão atual: ${currentVersion}`);
      console.log(`🎯 Nova versão: ${nextVersion}`);

      // 3. Obter commits
      const commits = getCommitsSinceLastTag();
      console.log(
        `📝 Encontrados ${commits.length} commits desde a última tag`
      );

      if (commits.length === 0) {
        console.log("⚠️  Nenhum commit novo encontrado.");
        console.log("❌ Não é possível criar uma release sem commits novos.");
        console.log(
          "💡 Faça algumas alterações e commits antes de criar uma release."
        );
        process.exit(0);
      }

      // 4. Atualizar versão no package.json
      console.log(`🏷️  Atualizando versão para ${nextVersion}...`);
      execSync(`npm version ${versionType} --no-git-tag-version`, {
        stdio: "pipe",
      });

      // 5. Commit da nova versão
      execSync("git add package.json package-lock.json", { stdio: "pipe" });
      execSync(`git commit -m "chore: bump version to ${nextVersion}"`, {
        stdio: "pipe",
      });

      // 6. Criar tag
      execSync(`git tag v${nextVersion}`, { stdio: "pipe" });

      // 7. Push dos commits e tags
      console.log("📤 Fazendo push dos commits e tags...");
      execSync("git push origin master", { stdio: "inherit" });
      execSync("git push origin --tags", { stdio: "inherit" });

      // 8. Gerar conteúdo da release
      const title = `${
        versionType === "major" ? "🚀" : versionType === "minor" ? "✨" : "🔧"
      } Release v${nextVersion}`;

      console.log("🌐 Traduzindo mensagens dos commits...");
      const body = await generateReleaseBody(nextVersion, versionType, commits);

      // 9. Criar release no GitHub
      console.log("📋 Criando release no GitHub...");

      let success = false;

      if (isGitHubCliAvailable()) {
        console.log("🔧 Usando GitHub CLI...");
        success = createReleaseWithCli(
          nextVersion,
          title,
          body,
          versionType === "major"
        );
      } else {
        console.log("🌐 Usando API do GitHub...");
        success = await createReleaseWithApi(
          nextVersion,
          title,
          body,
          versionType === "major"
        );
      }

      if (success) {
        console.log("\n✅ Release criada com sucesso!");
        console.log(`🎉 Versão ${nextVersion} foi publicada no GitHub`);
        console.log("🚀 O deploy automático no Vercel deve começar em breve");

        console.log("\n📋 Links úteis:");
        console.log(
          `� GitHub Release: https://github.com/PedroHSJ/escalas-ministeriais/releases/tag/v${nextVersion}`
        );
        console.log(
          "� Todas as Releases: https://github.com/PedroHSJ/escalas-ministeriais/releases"
        );
        console.log("🌐 Vercel Dashboard: https://vercel.com/dashboard");
      } else {
        console.error("❌ Falha ao criar release no GitHub");
        console.log("\n💡 Dicas para resolver:");
        console.log("1. Instale o GitHub CLI: winget install --id GitHub.cli");
        console.log("2. Autentique: gh auth login");
        console.log("3. Ou configure GITHUB_TOKEN nas variáveis de ambiente");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Erro durante o release:", error.message);
      process.exit(1);
    }
  }

  // Executar função async
  executeRelease().catch((error) => {
    console.error("❌ Erro não tratado:", error);
    process.exit(1);
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
