export const promptTemplateCategories = [
  { id: "anamnese", label: "Anamnese" },
  { id: "planos", label: "Planos alimentares" },
  { id: "protocolos", label: "Protocolos clínicos" },
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "educacao", label: "Educação e conteúdo" },
] as const;

export type PromptTemplateCategory =
  (typeof promptTemplateCategories)[number]["id"];

export type PromptTemplate = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: PromptTemplateCategory;
  keywords?: string[];
};

export const promptTemplates: PromptTemplate[] = [
  {
    id: "anamnese-rotina-diaria",
    title: "Anamnese Alimentar — Rotina Diária Detalhada",
    description:
      "Avaliação aprofundada da rotina, hábitos alimentares, fatores emocionais e contexto das refeições para mapeamento nutricional completo.",
    content: `Realize uma anamnese alimentar completa para compreender a rotina diária do paciente. Investigue de forma estruturada:
- Horário em que acorda e dorme, incluindo regularidade do ciclo sono–vigília.
- Janelas de refeições, lanches, intervalos longos e possíveis períodos de jejum.
- Situações de maior fome emocional, estresse ou impulsividade alimentar.
- Ambientes e contextos das refeições (trabalho, casa, restaurante, trânsito).
- Sintomas gastrointestinais: empachamento, refluxo, gases, constipação, diarreia ou desconfortos específicos.
- Alergias ou intolerâncias alimentares — relatadas, suspeitas ou em investigação.
- Ingestão hídrica: quantidade total estimada, distribuição ao longo do dia e tipo de água.
- Suplementação atual: tipos, dosagens, horários, adesão e propósito de uso.
- Atividade física: modalidade, intensidade, frequência, duração e horários.
Finalize com:
- Um resumo em tópicos, destacando padrões e oportunidades claras de ajuste.
- Uma estimativa da distribuição atual de macronutrientes e fibras (em % e g, quando possível).
`,
    category: "anamnese",
    keywords: ["rotina", "hábitos", "comportamento"],
  },
  {
    id: "anamnese-recordatorio-24h",
    title: "Recordatório Alimentar de 24h",
    description:
      "Coleta estruturada e detalhada da alimentação realizada no último dia para avaliação qualitativa e quantitativa.",
    content: `Conduza um recordatório alimentar completo das últimas 24 horas, iniciando pelo primeiro alimento consumido ontem até o último item antes de dormir. Para cada refeição, colete:
- Horário aproximado.
- Local e companhia.
- Preparos, métodos de cocção e porções estimadas.
- Sensações físicas e emocionais antes e após comer.
Além disso, registre:
- Horário em que acordou e dormiu.
- Sintomas gastrointestinais: empachamento, refluxo, gases, constipação ou diarreia.
- Alergias/intolerâncias relatadas ou suspeitas.
- Ingestão hídrica (volume total, distribuição e tipo).
- Suplementação atual (tipos, horários, adesão).
- Atividade física (modalidade, intensidade, frequência, duração e horários).
Organize as informações em tabela com colunas:
Horário | Refeição | Itens consumidos | Observações`,
    category: "anamnese",
    keywords: ["recordatório", "quantidade", "porções"],
  },
  {
    id: "anamnese-comorbidades",
    title: "Checklist de comorbidades",
    description:
      "Guia rápido para mapear histórico clínico e medicamentos em uso.",
    content: `Liste perguntas objetivas para identificar comorbidades e uso de medicamentos. Inclua:
- Doenças diagnosticadas (metabólicas, hormonais, gastrointestinais).
- Suplementos e fitoterápicos em uso.
- Alergias e intolerâncias.
- Exames recentes relevantes.
Finalize com recomendações de exames complementares caso faltem dados críticos.`,
    category: "anamnese",
    keywords: ["histórico clínico", "medicação", "exames"],
  },
  {
    id: "plano-lowcarb",
    title: "Plano alimentar low carb flexível",
    description:
      "Sugestão de refeições low carb com substituições e distribuição calórica diária.",
    content: `Crie um plano alimentar low carb (40% calorias de gorduras boas, 35% proteínas, 25% carboidratos) para adulto saudável. Inclua:
- Café da manhã, almoço, jantar e 2 lanches opcionais.
- Sugestões de substituição equivalente para cada refeição.
- Lista de compras resumida da semana.
Apresente em tabela com colunas Refeição | Opção principal | Substituições.`,
    category: "planos",
    keywords: ["low carb", "substituições", "lista de compras"],
  },
  {
    id: "plano-ajuste-calorico",
    title: "Ajuste calórico semanal",
    description:
      "Modelo para ajustar carboidrato e calorias conforme rotina de treinos.",
    content: `Monte um esquema alimentar com dois níveis calóricos:
1. Dias de treino de força (hipercalórico leve).
2. Dias de descanso (déficit moderado).
Explique como alternar entre versões, destaque macros alvo e dê dicas de preparo antecipado.`,
    category: "planos",
    keywords: ["cutting", "hipercalórico", "carbo cycle"],
  },
  {
    id: "plano-intolerancia",
    title: "Plano anti-inflamatório sem lactose/glúten",
    description:
      "Sugestão semanal clean label para pacientes com queixas inflamatórias.",
    content: `Crie um cardápio de 3 dias sem lactose e sem glúten com foco anti-inflamatório. Inclua:
- Sugestões culinárias brasileiras.
- Lista de temperos anti-inflamatórios.
- Estratégias de preparo em batelada.
Finalize com recomendações de monitoramento de sinais clínicos.`,
    category: "planos",
    keywords: ["anti-inflamatório", "restrições", "preparo"],
  },
  {
    id: "protocolo-resistencia-insulina",
    title: "Protocolo — Resistência à Insulina",
    description:
      "Roteiro estruturado com diretrizes de alimentação, sono, atividade física e suplementação para manejo inicial da resistência à insulina.",
    content: `Monte um protocolo claro e objetivo para pacientes com resistência à insulina, contendo:
Ajustes alimentares prioritários
- Redução de carga glicêmica e priorização de alimentos de baixo índice glicêmico.
- Aumento de fibras (solúveis e insolúveis), proteínas de boa qualidade e gorduras adequadas.
- Estratégias práticas para controle de picos glicêmicos (ordem dos alimentos, combinações, timing das refeições).
Tarefas semanais
- Atividade física: metas de intensidade, frequência e tipos de treino (resistido + aeróbico).
- Higiene do sono: rotina pré-sono, horários recomendados, exposição à luz e práticas relaxantes.
Sugestões de suplementação (com doses de referência)
- Magnésio
- Berberina
- Outros suplementos pertinentes
Inclua observações importantes destacando a necessidade de avaliação e liberação médica.
Apresente o plano final em formato de checklist semanal, organizado por categorias (alimentação, sono, atividade física, suplementação).
`,
    category: "protocolos",
    keywords: ["resistência à insulina", "checklist"],
  },
  {
    id: "protocolo-colesterol",
    title: "Protocolo - Otimização de perfil lipídico",
    description:
      "Pacientes com colesterol elevado sem uso de estatina precisam de plano claro.",
    content: `Descreva um protocolo em 4 pilares para reduzir LDL e triglicerídeos:
1. Alimentação rica em fibras solúveis.
2. Gorduras boas e redução de ultraprocessados.
3. Suplementação possível (ômega-3, fitosteróis) com dosagens sugeridas.
4. Monitoramento por exames em 90 dias.
Traga mensagens que reforcem adesão e uso de diário alimentar.`,
    category: "protocolos",
    keywords: ["colesterol", "triglicerídeos", "ômega-3"],
  },
  {
    id: "protocolo-pre-treino",
    title: "Protocolo - Pré-treino para mulheres",
    description:
      "Sugestão pronta para orientar pacientes que treinam cedo com pouco tempo.",
    content: `Crie três opções rápidas de pré-treino (até 300 kcal) para mulheres que treinam às 6h:
- Combinação sólida.
- Shake/smoothie.
- Opção para quem treina em jejum (suporte eletrolítico).
Inclua recomendações de hidratação e sinais para ajustar a individualização.`,
    category: "protocolos",
    keywords: ["pré-treino", "mulheres", "hidratação"],
  },
  {
    id: "acompanhamento-checkin",
    title: "Check-in semanal automatizado",
    description: "Mensagem para enviar via WhatsApp pedindo feedback objetivo.",
    content: `Redija um check-in semanal amigável pedindo:
- Adesão média (%) ao plano.
- Dificuldade principal da semana.
- Vitória que merece celebrar.
- Peso/medidas atualizadas (se aplicável).
Inclua CTA para enviar fotos das refeições ou diário alimentar.`,
    category: "acompanhamento",
    keywords: ["check-in", "whatsapp", "adesão"],
  },
  {
    id: "acompanhamento-recaida",
    title: "Mensagem de suporte pós-recaída",
    description:
      "Texto acolhedor para quando o paciente relata sair totalmente da rotina.",
    content: `Crie uma mensagem curta reconhecendo a recaída, reforçando:
- Que deslizes são esperados no processo.
- 3 micro-ações para retomar (hidratação, refeição rica em fibras, planejamento da próxima compra).
- Convite para compartilhar gatilhos percebidos.
Use tom acolhedor, sem julgamento e com foco em retomada rápida.`,
    category: "acompanhamento",
    keywords: ["motivação", "retomada", "comportamental"],
  },
  {
    id: "acompanhamento-recursos",
    title: "Checklist pós-consulta",
    description:
      "Lista do que o paciente deve receber imediatamente após o atendimento.",
    content: `Monte um checklist organizado para enviar após a consulta contendo:
- Link do plano alimentar.
- Lista de compras ou e-book complementar.
- Datas dos próximos contatos obrigatórios.
- Orientações burocráticas (pagamento, política de remarcação).
Apresente em tópicos numerados para facilitar o envio por e-mail ou WhatsApp.`,
    category: "acompanhamento",
    keywords: ["organização", "pós-consulta"],
  },
  {
    id: "educacao-reels",
    title: "Roteiro rápido para Reels educativo",
    description:
      "Estrutura de 45s para explicar um tema nutricional de forma leve.",
    content: `Estruture um roteiro em 5 blocos para vídeo curto:
1. Gancho (pergunta polêmica ou dado curioso).
2. Contexto breve do problema.
3. 3 dicas práticas com exemplos reais.
4. Chamada à ação (salvar/enviar para alguém).
5. CTA suave para agendar consulta.
Tema sugerido: Como organizar marmitas em 40 minutos.`,
    category: "educacao",
    keywords: ["reels", "conteúdo", "marketing"],
  },
  {
    id: "educacao-email",
    title: "E-mail educacional sobre fibras",
    description: "Template para newsletter leve conectando ciência e prática.",
    content: `Escreva um e-mail curto falando da importância das fibras para controle glicêmico. Estruture em:
- Introdução com história de paciente fictício.
- Explicação simples sobre fibras solúveis vs insolúveis.
- 4 exemplos de trocas inteligentes para aumentar o consumo.
- Assinatura com CTA para conversa rápida.
Use linguagem descomplicada e amigável.`,
    category: "educacao",
    keywords: ["newsletter", "fibras", "educação"],
  },
  {
    id: "educacao-desafios",
    title: "Desafio de 5 dias - alívio do inchaço",
    description:
      "Sequência diária enviada por mensagem para melhorar desconfortos.",
    content: `Crie um desafio de 5 dias com tarefas simples, cada uma contendo:
- Objetivo do dia.
- Passo a passo em até 3 itens.
- Checklist para o paciente marcar.
- Mensagem motivacional curta.
Inclua lembrete para compartilhar evidências (foto do prato, garrafa de água etc.).`,
    category: "educacao",
    keywords: ["desafio", "engajamento", "inchaço"],
  },
];
