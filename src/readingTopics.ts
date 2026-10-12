// Equivalent legacy labels only. Distinct social/cultural subjects are retained.
const groups = [
  ["language-models", "Modelos de linguagem e IA generativa", "Language models and generative AI", "LLMs e IA generativa", "LLMs and generative AI"],
  ["market", "Estratégia, mercado e impactos", "Strategy, market and impacts", "Modelos, mercado e indústria", "Models, market and industry"],
  ["agents", "Agentes, RAG e aplicações", "Agents, RAG and applications", "Agents, RACs and applications", "Agents, RAC and applications"],
  ["foundations", "Fundamentos técnicos de IA", "Technical foundations of AI", "Fundamentos, matemática e deep learning", "Fundamentals, mathematics, and deep learning", "Fundamentals, mathematics and deep learning"],
  ["attention", "Transformers e mecanismos de atenção", "Transformers and attention mechanisms", "Transformers e atenção", "Transformers and attention"],
  ["data", "Dados, vetores e gestão do conhecimento", "Data, vectors and knowledge management", "Bases vetoriais e conhecimento", "Vector bases and knowledge"],
  ["learning", "Aprendizado, pesquisa e produtividade", "Learning, research and productivity"],
  ["social-impacts", "Impactos sociais e econômicos", "Social and economic impacts"],
  ["governance", "Regulação, justiça e segurança", "Regulation, justice and security"],
  ["culture", "Cultura, sociedade e comportamento", "Culture, society and behavior"],
];
const key = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function readingTopic(value: string, english = false) {
  const group = groups.find(labels => labels.some(label => key(label) === key(value)));
  return group ? { id: group[0], label: group[english ? 2 : 1] } : { id: value, label: value.trim() };
}

// Stable bilingual filter IDs; this does not change the source taxonomy.
const subgroups = [
  ["future-work", "Aceleração tecnológica e futuro do trabalho", "Technological acceleration and the future of work"],
  ["learning-research", "Aprendizado e pesquisa", "Learning and research"],
  ["agent-architecture", "Arquitetura de agentes", "Agent architecture"],
  ["medium-articles", "Artigos no Medium", "Articles on Medium"],
  ["vectors-embeddings", "Bancos vetoriais e embeddings", "Vector databases and embeddings", "Vector databases e embeddings"],
  ["concepts", "Conceitos e fundamentos", "Concepts and foundations", "Concepts and fundamentals"],
  ["application-security", "Engenharia e segurança de aplicações", "Application engineering and security", "Application engineering and safety", "Engineering and application safety", "Engenharia e segurança de apps", "Engineering and app security"],
  ["knowledge-formats", "Formatos e gestão do conhecimento", "Formats and knowledge management"],
  ["industry", "Indústria, estratégia e impactos", "Industry, strategy and impacts"],
  ["model-comparisons", "Lançamentos e comparativos de modelos", "Model launches and comparisons", "New releases and model comparisons"],
  ["claude-tools", "MCP e ferramentas Claude", "MCP and Claude tools"],
  ["mathematics", "Matemática para IA", "Mathematics for AI"],
  ["mental-models", "Modelos mentais e uso crítico", "Mental models and critical use"],
  ["model-limits", "Modelos, limites e impactos", "Models, limits and impacts", "Models, limitations and impacts"],
  ["productivity", "Produtividade com IA e NotebookLM", "Productivity with AI and NotebookLM", "AI productivity and NotebookLM"],
  ["neural-networks", "Redes neurais e aprendizado", "Neural networks and learning"],
  ["ai-governance", "Regulação e governança de IA", "AI regulation and governance"],
  ["unspecified", "Sem subtema", "No subtopic"],
  ["imaginaries", "Tecnologia, política e imaginários do futuro", "Technology, politics, and imaginaries of the future"],
  ["attention", "Transformers e atenção", "Transformers and attention", "Transformers e mecanismos de atenção", "Transformers and attention mechanisms"],
];
export function readingSubtopic(value: string, english = false) {
  const group = subgroups.find(labels => labels.some(label => key(label) === key(value)));
  return group ? { id: group[0], label: group[english ? 2 : 1] } : { id: value, label: value.trim() };
}
