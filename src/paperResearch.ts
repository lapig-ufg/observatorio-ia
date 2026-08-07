import type { Article } from "./catalog";

export const paperResearchAreas = [
  "Ciências da Vida e Saúde",
  "Ciências Humanas, Sociais e Linguística",
  "Engenharias e Agrárias",
  "Ciências Exatas e da Terra",
  "Epistemologia e Metaciência",
  "Fundamentos de IA",
] as const;

export type PaperResearchArea = typeof paperResearchAreas[number];

const curatedResearchPapers: Record<PaperResearchArea, string[]> = {
  "Ciências da Vida e Saúde": [
    "ia-redesign-protein-evolution",
    "universal-cell-embedding-foundation-model-cell-biology",
    "paper-fnnx94",
    "paper-gko6q6",
    "paper-lb9mnp",
    "paper-towards-autonomous-medical-artificial-intelligence-agen-86-026-10675-5",
    "autonomous-biomedical-research-ai-agent",
    "paper-explicit-dynamic-cross-strand-interactions-for-dna-sequ-56-026-01249-1",
    "paper-the-therabot-will-see-you-now-cience-aeh4808",
    "paper-disparate-privacy-risks-from-medical-ai-86-026-10688-0",
    "paper-towards-conversational-ai-for-disease-management-86-026-10764-5",
    "paper-people-are-turning-to-ai-chatbots-to-plug-gaps-in-healt-86-026-01737-9",
  ],
  "Ciências Humanas, Sociais e Linguística": [
    "paper-yaoz55",
    "paper-h56pxu",
    "paper-dnsfw0",
    "paper-kp8zzf",
    "paper-1qc8bdu",
    "expanding-lexicon-geez-african-languages",
    "llms-predict-social-science-experiments",
    "paper-judicious-use-of-llms-could-speed-up-progress-in-the-so-86-026-01875-0",
    "paper-is-ai-ruining-our-skills-early-results-are-in-and-they--86-026-01947-1",
    "paper-ai-may-raise-the-bar-and-thin-the-pipeline-cience-aeh4940",
    "paper-gen-z-scepticism-towards-ai-is-a-wake-up-call-universit-86-026-01814-z",
  ],
  "Engenharias e Agrárias": [
    "paper-1d1qtz3",
  ],
  "Ciências Exatas e da Terra": [
    "paper-cuo5iu",
    "paper-guiding-generative-models-to-uncover-diverse-and-novel--56-026-01262-4",
    "paper-an-agentic-artificially-intelligent-x-ray-scientist-56-026-01261-5",
  ],
  "Epistemologia e Metaciência": [
    "drive-1ga-knowledge-preservation",
    "drive-1s3-fifth-era-science",
    "towards-end-to-end-automation-ai-research",
    "paper-1ysej23",
    "paper-16rdv6d",
    "paper-ai-in-scientific-publishing-slower-worse-and-more-expen-cience-aek5570",
    "paper-humanizer-tool-can-erase-signs-of-ai-written-text-alarm-86-026-02105-3",
    "paper-scientists-have-a-bad-case-of-ai-fomo-nature-poll-revea-86-026-01690-7",
  ],
  "Fundamentos de IA": [
    "paper-1jrkzci",
    "paper-1tcfgji",
    "atencao-alinhamento-humano-ia-multimodal",
    "fortifai-colapso-modelos-ia",
    "beyond-success-rate-cost-aware-evaluation-security-agents",
    "symbal-detecting-misalignments-model-captions",
    "paper-a4e3kh",
    "seguranca-sistemas-multiagente-llm",
    "searchos-v1-agent-collaboration",
    "bridge-evidence-agentic-search",
    "armor-plus-plus-deepfake-detectors",
    "beyond-retrieval-compounding-scientific-extelligence-ai-wikis",
  ],
};

const curatedAreas = new Map<string, PaperResearchArea>(
  paperResearchAreas.flatMap((area) => curatedResearchPapers[area].map((id) => [id, area] as const)),
);

// Estes itens contêm vocabulário de IA, mas não tratam predominantemente de
// IA generativa, modelos fundacionais, agentes ou seus efeitos diretos na pesquisa.
const excludedPaperIds = new Set([
  "paper-people-use-fast-and-flat-simulation-to-reason-about-new-86-026-10722-1",
  "paper-bots-are-scraping-open-data-how-should-researchers-resp-86-026-01689-0",
  "paper-silicon-valley-s-vision-for-global-ai-is-flawed-each-co-86-026-01951-5",
]);

const generativeResearchAnchors = [
  "llm", "llms", "large language", "language model", "language modelling",
  "foundation model", "modelo fundacional", "generative", "genai", "model generated",
  "ai generated", "agentic", "agent", "agents", "agente", "agentes", "chatbot",
  "chatbots", "conversational ai", "ia conversacional", "prompt", "model collapse",
  "unlearning", "retrieval augmented", "rag",
];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizedPhrases(article: Article) {
  return ` ${normalized([article.title, article.summary, ...article.tags].join(" ")).replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function hasAnchor(article: Article) {
  const text = normalizedPhrases(article);
  return generativeResearchAnchors.some((anchor) => text.includes(` ${anchor} `));
}

export function isPublicResearchPaper(article: Article) {
  if (article.type !== "paper" || excludedPaperIds.has(article.id)) return false;
  return curatedAreas.has(article.id) || hasAnchor(article);
}

export function paperResearchArea(article: Article): PaperResearchArea | null {
  if (!isPublicResearchPaper(article)) return null;

  const curatedArea = curatedAreas.get(article.id);
  if (curatedArea) return curatedArea;

  const text = normalizedPhrases(article);
  if (/ health | medic| clinical | disease | cancer | oncolog| therap| hospital | psychiatr| genom| dna | protein | cell /.test(text)) return "Ciências da Vida e Saúde";
  if (/ agric| crop | farm | pasture | soil | engineering | robot | manufacturing /.test(text)) return "Engenharias e Agrárias";
  if (/ geoscience | geospatial | geoai | remote sensing | quantum | math | physics | crystal | optical | photonic | x ray /.test(text)) return "Ciências Exatas e da Terra";
  if (/ social | language | linguist| education | ethic| human | cognit| culture | philosoph| art | policy | governance | work | skill /.test(text)) return "Ciências Humanas, Sociais e Linguística";
  if (/ scientific | science | research | publish| scholar| citation | peer review | reproducib| knowledge preservation /.test(text)) return "Epistemologia e Metaciência";
  return "Fundamentos de IA";
}
