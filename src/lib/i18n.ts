import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "../locales/en.json"
import es from "../locales/es.json"

export type Lang = "es" | "en"

const STORAGE_KEY = "lab_inventory_lang"

function initialLang(): Lang {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "es" || saved === "en") {
      return saved
    }
  }
  return "es"
}

const lng = initialLang()

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng,
  fallbackLng: "es",
  interpolation: { escapeValue: false },
})

if (typeof document !== "undefined") {
  document.documentElement.lang = lng
}

// Cambia el idioma, lo persiste y actualiza el atributo lang del <html>.
export function setLang(lang: Lang) {
  void i18n.changeLanguage(lang)
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang)
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang
  }
}

export default i18n
