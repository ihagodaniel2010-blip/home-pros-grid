import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "pt";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        // Header
        "nav.find_pro": "Find a Pro",
        "nav.about": "About",
        "nav.portfolio": "Portfolio",
        "nav.experiences": "Experiences",
        "nav.login": "Login",
        "nav.join_pro": "Join As a Pro",
        "nav.back_to_site": "Back to Site",

        // Quote Form
        "quote.zip_code": "Zip Code",
        "quote.city": "City",
        "quote.state": "State",
        "quote.where_project": "Where is your project located?",
        "quote.service_type": "What type of service do you need?",
        "quote.details_title": "Add details for more exact quotes",
        "quote.details_desc": "Describe your project so pros can give you a better estimate.",
        "quote.contact_title": "Contact Information",
        "quote.contact_desc": "Get your free quotes now — no obligation.",
        "quote.full_name": "Full Name",
        "quote.address": "Street Address",
        "quote.email": "Email",
        "quote.phone": "Phone",
        "quote.continue": "Continue",
        "quote.submit": "Get my free quote",

        // Admin
        "admin.save": "Save",
        "admin.saving": "Saving...",
        "admin.save_estimate": "Save Estimate",
        "admin.settings": "Settings",
        "admin.dashboard": "Dashboard",
    },
    pt: {
        // Header
        "nav.find_pro": "Encontrar Profissional",
        "nav.about": "Sobre",
        "nav.portfolio": "Portfólio",
        "nav.experiences": "Experiências",
        "nav.login": "Entrar",
        "nav.join_pro": "Seja um Profissional",
        "nav.back_to_site": "Voltar ao Site",

        // Quote Form
        "quote.zip_code": "CEP",
        "quote.city": "Cidade",
        "quote.state": "Estado",
        "quote.where_project": "Onde seu projeto está localizado?",
        "quote.service_type": "Que tipo de serviço você precisa?",
        "quote.details_title": "Adicione detalhes para orçamentos exatos",
        "quote.details_desc": "Descreva seu projeto para que os profissionais possam dar um orçamento melhor.",
        "quote.contact_title": "Informações de Contato",
        "quote.contact_desc": "Receba seus orçamentos grátis agora — sem compromisso.",
        "quote.full_name": "Nome Completo",
        "quote.address": "Endereço (Rua, Nº, Apto)",
        "quote.email": "E-mail",
        "quote.phone": "Telefone",
        "quote.continue": "Continuar",
        "quote.submit": "Solicitar orçamento grátis",

        // Admin
        "admin.save": "Salvar",
        "admin.saving": "Salvando...",
        "admin.save_estimate": "Salvar Orçamento",
        "admin.settings": "Configurações",
        "admin.dashboard": "Painel",
    },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>("en");

    useEffect(() => {
        const saved = localStorage.getItem("preferred_language") as Language;
        if (saved && (saved === "en" || saved === "pt")) {
            setLanguageState(saved);
        } else {
            // Auto-detect browser language
            const browserLang = navigator.language.split("-")[0];
            if (browserLang === "pt") {
                setLanguageState("pt");
            }
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("preferred_language", lang);
    };

    const t = (key: string) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
