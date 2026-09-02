# Saneamento e Correção de Branding Público em Produção — H&A Construction

## 1. Diagnóstico do Problema de Produção
A investigação identificou que o texto antigo "Barrigudo" e expressões legadas em Português ("Sua Casa. Mais Feliz.", "Encontrar Profissional", "Seja um Profissional") apareciam em produção por dois motivos combinados:
1. **Dicionário de Traduções (`src/context/LanguageContext.tsx`)**: O arquivo de contexto possuía entradas legadas em Português (`translations.pt`) e o `LanguageProvider` lia o idioma do navegador do usuário (`navigator.language`), ativando as mensagens em português por padrão em navegadores locais.
2. **Template HTML do Vite (`index.html.vite`)**: O arquivo mantinha as tags `<title>` e metadados OpenGraph/Twitter com o título antigo `"Barrigudo - Home Services Platform"`.

---

## 2. Ações Corretivas Aplicadas

### 2.1 Atualização Global do Contexto de Idiomas (`LanguageContext.tsx`)
- **Idioma Padrão**: Definido como **Inglês (`en`)** para a operação oficial no mercado norte-americano em `https://h-a-construction.com`.
- **Limpeza nos Dicionários**:
  - `en`, `pt` e `es` foram padronizados para **H&A Construction** / **H-A Construction**.
  - `"hero.title"` atualizado para: *"Construction & Remodeling Services You Can Trust"*.
  - `"hero.subtitle"` atualizado para: *"Request a quote for construction, remodeling, roofing, flooring, drywall, painting and carpentry services."*.
  - `"nav.find_pro"` atualizado para: *"Services"*.
  - `"nav.join_pro"` atualizado para: *"Join Partner Network"*.
  - `"quote.zip_code"` atualizado para: *"ZIP Code"*.

### 2.2 Atualização do Template de Metadados (`index.html.vite` e `layout.tsx`)
- Título da aba e metadados das redes sociais padronizados como **`H&A Construction — Construction, Remodeling & Home Improvement Services`**.

### 2.3 Atualização dos Componentes Públicos Visíveis
- `Header.tsx`, `Footer.tsx`, `TopProjects.tsx`, `About.tsx`, `Login.tsx`, `Join.tsx`, `Pricing.tsx`, `Experiences.tsx` e páginas de termos/privacidade/disclaimer.

---

## 3. Resultado & Rastreabilidade Técnica
- **Público Visível**: **0 ocorrências** de "Barrigudo" ou "HomeLeadPro" na vitrine pública ou no código-fonte das páginas.
- **Back-office / Legado Interno**: As únicas ocorrências mantidas são chaves internas de `localStorage` (`barrigudo_user_session`, `barrigudo_leads`) e nomes de scripts SQL históricos em `supabase/migrations`, para garantir que nenhuma sessão de usuário logado seja desconectada.
