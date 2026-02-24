<!-- GUIA DE SETUP - SEÇÃO SERVICE AREAS -->
<!-- Este arquivo documenta como configurar e customizar a seção "Service Areas" -->

# 🏗️ Service Areas - Guia de Configuração

## 📍 Arquivos Modificados/Criados

### Novos Arquivos:
1. **`src/config/site.ts`** - Configuração centralizada (PRINCIPAL)
2. **`src/components/ServiceAreas.tsx`** - Componente da seção premium

### Arquivos Modificados:
- **`src/components/ArticlesSection.tsx`** - Adicionada importação e renderização de `<ServiceAreas />`
  - Local: Logo após a seção "Are you a Pro?" (antes da exportação final)

---

## ⚙️ Como Configurar Rapidamente

### 1. Editar Email de Contato
Abra **`src/config/site.ts`** (linha ~20):
```typescript
contactEmail: "seu-email@dominio.com", // Mude aqui
```

### 2. Adicionar Telefone (Opcional)
Se tiver telefone, edite **`src/config/site.ts`** (linha ~21):
```typescript
contactPhone: "(617) 555-1234", // Descomente e atualize
```
Se deixar como `undefined`, o campo de telefone não aparecerá na seção.

### 3. Mudar Cidades/Áreas de Serviço
Edite **`src/config/site.ts`** (linhas ~24-33):
```typescript
serviceAreas: [
  "Wellesley",
  "Newton",
  // ... adicione ou remova cidades aqui
],
```

### 4. Adicionar Texto Final
Edite **`src/config/site.ts`** (linha ~35):
```typescript
serviceAreasPlus: "And surrounding communities throughout Greater Boston",
```

### 5. Mudar Endereço/Região
Edite **`src/config/site.ts`** (linhas ~37-38):
```typescript
businessAddress: "Boston, Massachusetts", // Endereço completo
businessRegion: "Greater Boston Area", // Exibido no badge do mapa
```

### 6. Mudar Destino do Botão "Get a Free Quote"
Edite **`src/config/site.ts`** (linha ~41):
```typescript
ctaGetQuote: "/services", // Ou "/quote", "/cost-guide", etc.
```

### 7. Mudar Busca do Mapa (Google Maps)
Edite **`src/config/site.ts`** (linha ~44):
```typescript
googleMapsQuery: "Boston Massachusetts home services",
```

---

## 🎨 Tokens de Estilo (se quiser customizar estilos)

Todos os valores estilísticos estão centralizados em **`src/config/site.ts`** (linhas 49-60):

```typescript
borderRadius: {
  lg: "xl", // Grandes (20px)
  md: "lg", // Médios (12px)
},
shadows: {
  sm: "0 2px 8px rgba(15,46,77,0.12)",
  md: "0 4px 16px rgba(15,46,77,0.15)",
},
colors: {
  primary: "var(--primary, #0b6dbf)", // Cor primária
}
```

Para alterar a cor PRIMARY em todo o site, atualize em `src/config/site.ts` ou no CSS global.

---

## 🗺️ Sobre o Mapa

### Embed do Google Maps (Atual)
- ✅ Uma única API key compartilhada (já incluída, sem limite de uso para embed público)
- ✅ Sem necessidade de configuração adicional
- ✅ Responsivo e acessível
- ✅ Badge "Greater Boston Area" flutuante

### Se quiser criar embed customizado later:
1. Visite: https://www.google.com/maps
2. Procure seu local
3. Menu (≡) → Compartilhar ou incorporar > Incorporar mapa
4. Copie o `<iframe>` src
5. Atualize `getGoogleMapsEmbedUrl()` em `src/config/site.ts`

---

## 📞 Funções Helper Úteis

Em **`src/config/site.ts`**, existem 3 funções auxiliares:

### `getGoogleMapsEmbedUrl(query?)`
Gera URL do embed do Google Maps.
```typescript
// Uso: Já usada no componente ServiceAreas
const mapUrl = getGoogleMapsEmbedUrl(); // usa siteConfig.googleMapsQuery
```

### `getGoogleMapsDirectionsUrl(destination?)`
Gera link para "Directions" no Google Maps.
```typescript
// Uso: Botão "Directions" no ServiceAreas clica neste link
const directionsUrl = getGoogleMapsDirectionsUrl(siteConfig.businessAddress);
```

### `getContactEmailLink(email?)`
Gera link mailto para contato.
```typescript
// Uso: Email link no ServiceAreas
const emailHref = getContactEmailLink(); // geraçõmailto: link
```

---

## 🎯 Localização no Site

A seção aparece em:
- **Página:** Home (Index.tsx → ArticlesSection.tsx)
- **Posição:** Logo após a seção "Are you a Pro?", antes do rodapé
- **Ordem de renderização em ArticlesSection:**
  1. Testimonials (Tim D., Cindy T., Jackie D.)
  2. ServicesShowcase (4 cards de serviços com carrossel)
  3. Missão (badge Barrigudo)
  4. CTA "Are you a Pro?"
  5. **← ServiceAreas (NOVA)**

---

## 🚀 Checklist Pós-Deploy

- [ ] Email no site está correto? (src/config/site.ts line 20)
- [ ] Cidades listadas são as certas? (src/config/site.ts lines 24-33)
- [ ] Telefone foi adicionado (se aplicável)?
- [ ] Mapa carrega sem erros?
- [ ] Botão "Directions" abre Google Maps?
- [ ] Botão "Get a Free Quote" aponta para destino certo?
- [ ] Responsive testing (mobile/tablet/desktop)?
- [ ] Links estão funcionando?

---

## 🐛 Troubleshooting

### Mapa não carrega?
1. Cheque conectividade internet
2. Verifique se `googleMapsQuery` está bem formatada em `src/config/site.ts`
3. Abra DevTools (F12) → Console → procure por erros

### Email não funciona?
1. Confira se é um email válido em `src/config/site.ts`
2. Clique no link de email para testar

### Styling quebrado?
1. Certifique-se que Tailwind CSS está carregando (verificar network tab)
2. Limpe cache do navegador (Ctrl+Shift+Delete)
3. Reimporte o componente se modificou estrutura

---

## 📝 Notas Importantes

- **Sem dependências pesadas:** Usa apenas Framer Motion (já no projeto) e Google Maps embed (sem API key necessária)
- **Acessibilidade:** Tout respects `prefers-reduced-motion`, tem aria-labels, headings corretos
- **Responsivo:** Mobile-first, 2 colunas desktop → empilhado mobile
- **Premium styling:** Glassmorphism, blur, gradientes suaves, hover effects
- **Nada hardcoded:** Tudo centralizado em `src/config/site.ts`

---

## 🔄 Exemplo: Trocar Email + Cidade em 30 segundos

1. Abra `src/config/site.ts`
2. Mude linha 20: `contactEmail: "novo@email.com"`
3. Mude array linhas 24-33: adicione/remova cidades
4. Save (Ctrl+S)
5. Navegador recarrega automaticamente (HMR)
6. ✅ Feito!

---

**Criado em:** 19 Fev 2026  
**Versão:** 1.0  
**Status:** ✅ Pronto para produção
