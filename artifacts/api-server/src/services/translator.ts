export const translations: Record<string, Record<string, string>> = {
  en: { evacuate: "Emergency detected. Please evacuate immediately." },
  hi: { evacuate: "आपातकाल! कृपया तुरंत निकासी करें।" },
  ar: { evacuate: "طوارئ! يرجى الإخلاء فوراً." },
  fr: { evacuate: "Urgence! Veuillez évacuer immédiatement." },
  es: { evacuate: "¡Emergencia! Por favor evacúe inmediatamente." },
  zh: { evacuate: "紧急情况！请立即疏散。" },
  ja: { evacuate: "緊急事態！直ちに避難してください。" },
  de: { evacuate: "Notfall! Bitte sofort evakuieren." },
  ru: { evacuate: "Чрезвычайная ситуация! Немедленно эвакуируйтесь." },
};

export function getAllTranslations(type: string): Record<string, string> {
  const result: Record<string, string> = {};
  Object.keys(translations).forEach(lang => {
    result[lang] = translations[lang][type] || translations['en'][type];
  });
  return result;
}
