import { createContext, useContext } from "react";
import ui from "./policy-ui-en.json";
import vocabulary from "./policy-vocabulary-en.json";
import { AREA_SHORT, CATEGORY_LABEL, VERIFICATION_LABEL } from "./surveyLogic";

export const PolicyEnglishContext = createContext(false);
const dictionary: Record<string, string> = ui;
const words: Record<string, string> = vocabulary;
const locations: Record<string, string> = { "Múltiplos": "Múltiplos / conforme o uso", "Submissão/carta": "Submissão ou carta", "Sem exigência p/ redação": "Não exige para a redação" };
export function usePolicyLocale() {
  const english = useContext(PolicyEnglishContext);
  const t = (text: string) => {
    if (!english) return text;
    const translated = dictionary[text] ?? words[text];
    if (translated === undefined) throw new Error(`Missing policy UI translation: ${text}`);
    return translated;
  };
  const map = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).map(([key,value]) => [key,t(value)]));
  return { english, t, areaLabels: map(AREA_SHORT), categoryLabels: map(CATEGORY_LABEL), verificationLabels: map(VERIFICATION_LABEL), locationLabels: map(locations), label: (value: string) => english ? words[value] ?? value : value };
}
