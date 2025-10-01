#!/usr/bin/env node

/**
 * Script para gerar automaticamente release notes
 * Uso: node scripts/generate-release-notes.js [patch|minor|major]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função para obter a próxima versão
function getNextVersion(currentVersion, type = 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// Função para obter commits desde a última tag
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    const commits = execSync(`git log ${lastTag}..HEAD --oneline --no-merges`, { encoding: 'utf8' }).trim();
    return commits ? commits.split('\n') : [];
  } catch (error) {
    // Se não há tags, pega todos os commits
    const commits = execSync('git log --oneline --no-merges', { encoding: 'utf8' }).trim();
    return commits ? commits.split('\n') : [];
  }
}

// Função para categorizar commits
function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    technical: [],
    breaking: []
  };

  commits.forEach(commit => {
    const message = commit.toLowerCase();
    
    if (message.includes('feat:') || message.includes('feature:')) {
      categories.features.push(commit);
    } else if (message.includes('fix:') || message.includes('bug:')) {
      categories.fixes.push(commit);
    } else if (message.includes('improve:') || message.includes('perf:') || message.includes('style:')) {
      categories.improvements.push(commit);
    } else if (message.includes('refactor:') || message.includes('chore:') || message.includes('deps:')) {
      categories.technical.push(commit);
    } else if (message.includes('breaking:') || message.includes('!:')) {
      categories.breaking.push(commit);
    } else {
      // Categorizar por palavras-chave
      if (message.includes('add') || message.includes('implement') || message.includes('create')) {
        categories.features.push(commit);
      } else if (message.includes('fix') || message.includes('correct') || message.includes('resolve')) {
        categories.fixes.push(commit);
      } else {
        categories.improvements.push(commit);
      }
    }
  });

  return categories;
}

// Função para gerar template baseado em commits
function generateReleaseNotes(version, type, commits) {
  const date = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const typeLabels = {
    major: 'Major (Breaking Changes)',
    minor: 'Minor (Novas Funcionalidades)',
    patch: 'Patch (Correções e Melhorias)'
  };

  const typeIcons = {
    major: '🚀',
    minor: '✨',
    patch: '🔧'
  };

  const categories = categorizeCommits(commits);

  let content = `# ${typeIcons[type]} Release Notes - Sistema de Escalas Ministeriais v${version}

**Data de Lançamento**: ${date}  
**Versão**: ${version}  
**Tipo**: ${typeLabels[type]}

---

`;

  // Breaking Changes (para major)
  if (type === 'major' && categories.breaking.length > 0) {
    content += `## ⚠️ **Breaking Changes**

`;
    categories.breaking.forEach(commit => {
      const message = commit.replace(/^[a-f0-9]+\s/, '').replace(/^breaking:\s*/i, '');
      content += `- **${message}**: [Descrever impacto e migração necessária]\n`;
    });
    content += '\n---\n\n';
  }

  // Novas Funcionalidades
  if (categories.features.length > 0) {
    content += `## ✨ **Novas Funcionalidades**

`;
    categories.features.forEach(commit => {
      const message = commit.replace(/^[a-f0-9]+\s/, '').replace(/^(feat|feature):\s*/i, '');
      content += `- **${message}**: [Descrever funcionalidade em detalhes]\n`;
    });
    content += '\n---\n\n';
  }

  // Correções de Bugs
  if (categories.fixes.length > 0) {
    content += `## 🐛 **Correções de Bugs**

`;
    categories.fixes.forEach(commit => {
      const message = commit.replace(/^[a-f0-9]+\s/, '').replace(/^(fix|bug):\s*/i, '');
      content += `- **${message}**: [Descrever problema e solução]\n`;
    });
    content += '\n---\n\n';
  }

  // Melhorias
  if (categories.improvements.length > 0) {
    content += `## ⚡ **Melhorias**

`;
    categories.improvements.forEach(commit => {
      const message = commit.replace(/^[a-f0-9]+\s/, '').replace(/^(improve|perf|style):\s*/i, '');
      content += `- **${message}**: [Descrever melhoria e benefício]\n`;
    });
    content += '\n---\n\n';
  }

  // Alterações Técnicas
  if (categories.technical.length > 0) {
    content += `## 🔧 **Alterações Técnicas**

`;
    categories.technical.forEach(commit => {
      const message = commit.replace(/^[a-f0-9]+\s/, '').replace(/^(refactor|chore|deps):\s*/i, '');
      content += `- **${message}**: [Descrever mudança técnica]\n`;
    });
    content += '\n---\n\n';
  }

  // Próximas versões
  const nextVersions = {
    patch: { version: getNextVersion(version, 'minor'), type: 'minor' },
    minor: { version: getNextVersion(version, 'minor'), type: 'minor' },
    major: { version: getNextVersion(version, 'minor'), type: 'minor' }
  };

  content += `## 📈 **Próxima Versão (v${nextVersions[type].version})**

Planejado para a próxima versão:
- [ ] [Funcionalidade planejada 1]
- [ ] [Funcionalidade planejada 2]
- [ ] [Melhoria planejada 3]

---

**Sistema de Escalas Ministeriais v${version}**  
*"[Adicionar slogan da versão]"*

---

*Esta versão foi testada e está pronta para produção.*
`;

  return content;
}

// Função principal
function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch';

  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Tipo de versão inválido. Use: patch, minor ou major');
    process.exit(1);
  }

  try {
    // Ler versão atual
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    const nextVersion = getNextVersion(currentVersion, versionType);

    console.log(`📦 Versão atual: ${currentVersion}`);
    console.log(`🎯 Próxima versão: ${nextVersion}`);

    // Obter commits
    const commits = getCommitsSinceLastTag();
    console.log(`📝 Encontrados ${commits.length} commits desde a última tag`);

    // Gerar release notes
    const releaseNotes = generateReleaseNotes(nextVersion, versionType, commits);
    const filename = `RELEASE_NOTES_v${nextVersion}.md`;

    // Salvar arquivo
    fs.writeFileSync(filename, releaseNotes);
    console.log(`✅ Release notes criadas: ${filename}`);

    // Mostrar próximos passos
    console.log('\n📋 Próximos passos:');
    console.log('1. Edite o arquivo de release notes gerado');
    console.log('2. Preencha as descrições detalhadas');
    console.log('3. Execute: npm run release');
    console.log(`4. Ou execute: npm version ${versionType} && git push origin master --follow-tags`);

  } catch (error) {
    console.error('❌ Erro ao gerar release notes:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { generateReleaseNotes, getNextVersion, categorizeCommits };
