const translations: Record<string, Record<string, string>> = {
  en: {
    evacuate: "Emergency detected. Please evacuate immediately.",
    fire: "Fire detected. Use nearest stairwell. Do NOT use elevators.",
    smoke: "Smoke detected. Cover mouth. Evacuate via nearest exit.",
    panic: "Emergency alert. Staff have been notified. Please remain calm.",
    all_clear: "All clear. Emergency has been resolved. Thank you.",
  },
  hi: {
    evacuate: "आपातकाल! कृपया तुरंत निकासी करें।",
    fire: "आग लगी है। निकटतम सीढ़ी का उपयोग करें। लिफ्ट का उपयोग न करें।",
    smoke: "धुआं है। मुंह ढकें। निकटतम निकास से बाहर निकलें।",
    panic: "आपातकालीन अलर्ट। कर्मचारियों को सूचित किया गया है। शांत रहें।",
    all_clear: "सब ठीक है। आपातकाल समाप्त हो गया है।",
  },
  ar: {
    evacuate: "طوارئ! يرجى الإخلاء فوراً.",
    fire: "تم اكتشاف حريق. استخدم أقرب درج. لا تستخدم المصعد.",
    smoke: "تم اكتشاف دخان. غطِ فمك. اخرج من أقرب مخرج.",
    panic: "تنبيه طوارئ. تم إخطار الموظفين. يرجى التزام الهدوء.",
    all_clear: "الوضع طبيعي. انتهت حالة الطوارئ.",
  },
  fr: {
    evacuate: "Urgence! Veuillez évacuer immédiatement.",
    fire: "Incendie détecté. Utilisez l'escalier le plus proche. N'utilisez pas l'ascenseur.",
    smoke: "Fumée détectée. Couvrez-vous la bouche. Évacuez par la sortie la plus proche.",
    panic: "Alerte d'urgence. Le personnel a été notifié. Restez calme.",
    all_clear: "Tout est normal. L'urgence est résolue.",
  },
  es: {
    evacuate: "¡Emergencia! Por favor evacúe inmediatamente.",
    fire: "Incendio detectado. Use la escalera más cercana. NO use el ascensor.",
    smoke: "Humo detectado. Cúbrase la boca. Evacúe por la salida más cercana.",
    panic: "Alerta de emergencia. El personal ha sido notificado. Mantenga la calma.",
    all_clear: "Todo despejado. La emergencia ha sido resuelta.",
  },
  zh: {
    evacuate: "紧急情况！请立即疏散。",
    fire: "检测到火灾。使用最近的楼梯。不要使用电梯。",
    smoke: "检测到烟雾。捂住口鼻。从最近的出口撤离。",
    panic: "紧急警报。工作人员已收到通知。请保持冷静。",
    all_clear: "一切正常。紧急情况已解除。",
  },
  ja: {
    evacuate: "緊急事態！直ちに避難してください。",
    fire: "火災が検出されました。最寄りの階段を使用してください。エレベーターは使用しないでください。",
    smoke: "煙が検出されました。口を覆ってください。最寄りの出口から避難してください。",
    panic: "緊急アラート。スタッフに通知されました。冷静にお待ちください。",
    all_clear: "安全です。緊急事態は解除されました。",
  },
  de: {
    evacuate: "Notfall! Bitte sofort evakuieren.",
    fire: "Brand erkannt. Benutzen Sie das nächste Treppenhaus. Benutzen Sie KEINEN Aufzug.",
    smoke: "Rauch erkannt. Mund bedecken. Verlassen Sie durch den nächsten Ausgang.",
    panic: "Notfallalarm. Personal wurde benachrichtigt. Bitte ruhig bleiben.",
    all_clear: "Entwarnung. Der Notfall ist beendet.",
  },
  ru: {
    evacuate: "Чрезвычайная ситуация! Немедленно эвакуируйтесь.",
    fire: "Обнаружен пожар. Используйте ближайшую лестницу. НЕ используйте лифт.",
    smoke: "Обнаружен дым. Прикройте рот. Эвакуируйтесь через ближайший выход.",
    panic: "Экстренное оповещение. Персонал уведомлён. Сохраняйте спокойствие.",
    all_clear: "Отбой тревоги. Чрезвычайная ситуация ликвидирована.",
  },
};

export function translateAlert(
  type: 'evacuate' | 'fire' | 'smoke' | 'panic' | 'all_clear',
  language: string
): string {
  const lang = translations[language] ?? translations['en'];
  return lang[type] ?? translations['en'][type];
}

export function getAllTranslations(
  type: 'evacuate' | 'fire' | 'smoke' | 'panic' | 'all_clear'
): Record<string, string> {
  const result: Record<string, string> = {};
  Object.keys(translations).forEach(lang => {
    result[lang] = translations[lang][type];
  });
  return result;
}

export { translations };
