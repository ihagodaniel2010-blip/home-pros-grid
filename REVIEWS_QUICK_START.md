# 🚀 Quick Start - Client Reviews (localStorage)

## Status
✅ Implementado e testável no localhost

## Arquivos Principais Criados/Modificados

| Arquivo | Descrição |
|---------|-----------|
| `src/types/reviews.ts` | TypeScript interfaces |
| `src/lib/reviewsService.ts` | LocalReviewsService (localStorage) |
| `src/context/UserContext.tsx` | User session management |
| `src/components/ClientReviews.tsx` | Component premium (UI + logic) |
| `src/components/DevLoginSimulator.tsx` | DEV only: fake login button |
| `src/pages/Experiences.tsx` | Page completa com hero |
| `src/App.tsx` | Wrapped with UserProvider |
| `REVIEWS_SYSTEM.md` | Arquitetura de migração futura |

## Como Testar

### 1. Abrir http://localhost:5173/experiences
Deve ver:
- Hero gradient com "Real Experiences from Real Homeowners"
- Stats: 4.8/5, "Highly Rated", "5,000+ Active Reviews"
- Seção "Client Reviews" com search/filter/sort

### 2. Testar interface sem login
- Vê cards informativos (se houver dados no localStorage já)
- Seção "Bloqueada": "Sign in with Google to leave a review (Coming soon)"
- Botões de filtro/ordenação funcionam normalmente

### 3. Simular Login (DEV)
1. Olhe **canto inferior direito** da tela
2. Clique botão **"DEV: Login"**
3. Clique **"Login as João Silva"**
4. Agora aparece:
   - Seu nome e avatar (fake) acima do formulário
   - Formulário de review: seletor de stars + textarea
   - Botão "Post Review" habilitado

### 4. Postar um Review
1. Clique em **3 stars** (ou qualquer número)
2. No textarea, escreva:
   ```
   Great service! The team was professional and efficient.
   ```
3. Clique **"Post Review"**
4. Verá:
   - Toast verde: "Thank you! Your review has been posted."
   - Review aparece no topo da lista com **animação de entrada**
   - Stats atualizam (média pode mudar)
   - Formulário limpa

### 5. Testar Filtros
- **Dropdown "Highest Rating"**: reordena reviews por ⭐⭐⭐⭐⭐ primeiro
- **Dropdown "5 stars"**: mostra só reviews com 5 estrelas
- **Load More**: se tiver 6+ reviews, carrega mais 6

### 6. Logout
1. Clique no botão "DEV: Login" novamente
2. Vê seu name + "Logout"
3. Clique **"Logout"**
4. Form desaparece, volta "Sign in with Google (Coming soon)"

### 7. Verificar localStorage
F12 → Application → Local Storage → localhost:5173
- `barrigudo_user_session`: seu user data
- `barrigudo_reviews`: array (todos os reviews salvos)

## Mock Data
Se quiser testar com reviews pré-existentes:
1. Abra DevTools (F12)
2. Console
3. Cole:
```javascript
localStorage.setItem('barrigudo_reviews', JSON.stringify([
  {
    id: "review_1234567890_abc123",
    userName: "Maria Silva",
    userAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    rating: 5,
    body: "Amazing service! Highly recommend to everyone.",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "review_1234567891_def456",
    userName: "Carlos Santos",
    userAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
    rating: 4,
    body: "Very good! Pequena demora na entrega, mas qualidade top.",
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
]));
```
4. Refresh página
5. Verá reviews aparecerem + stats atualizarem

## Visual Checklist
- [ ] Hero section com gradient azul/roxo
- [ ] Stats bar: nota média (4.8), total reviews (5,000+)
- [ ] Filtros: dropdown ordenação + star filtering
- [ ] Cards com avatar circular, nome, ⭐⭐⭐⭐⭐, "via Google" badge, data
- [ ] Form de review (só se logado) com:
  - Avatar do user + name + "via Google"
  - 5 star selector (click para escolher)
  - Textarea com placeholder
  - "Post Review" button
- [ ] Load More button (se 6+ reviews)
- [ ] Animações suaves (fade-in nos cards)
- [ ] Responsive (mobile/tablet/desktop)

## Próximos Passos (Não Implementado Ainda)
- [ ] Integrar Supabase (substituir localStorage por banco)
- [ ] OAuth Google real (substituir DEV login)
- [ ] Rate limiting no backend
- [ ] Moderação de reviews (admin panel)
- [ ] Email notifications
- [ ] Review editing/deletion UI
