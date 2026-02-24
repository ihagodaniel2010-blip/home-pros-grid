# Client Reviews System - Architecture & Local Storage

## Overview
Sistema de avaliações de clientes para a página `/experiences` com suporte a autenticação de usuários e persistência via localStorage.

## Arquitetura

### 1. **ReviewsService** (`src/types/reviews.ts` + `src/lib/reviewsService.ts`)

Interface genérica para operações de reviews:
```typescript
interface ReviewsServiceInterface {
  getReviews(filter?: ReviewsFilter): Promise<Review[]>;
  addReview(review: AddReviewInput): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  getStats(): Promise<ReviewsStats>;
}
```

**Implementação Atual**: `LocalReviewsService` usa localStorage
**Implementação Futura**: `SupabaseReviewsService` substituirá com mesma interface

### 2. **UserContext** (`src/context/UserContext.tsx`)

Gerencia sessão de usuário final (não admin). Armazena em localStorage:
```typescript
interface UserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}
```

**Uso**: `useUser()` hook envolve a app com `<UserProvider>`

### 3. **ClientReviews Component** (`src/components/ClientReviews.tsx`)

Componente premium com:
- Exibição de reviews com avatar (circular), nome, rating (1-5 stars), data
- **Badge "via Google"** (visual, funcionalidade real virá com Supabase OAuth)
- Filtro por número de estrelas
- Ordenação (Newest / Highest Rating)
- Paginação com "Load More"
- **Form para postar review** (só aparece se usuário logado)
- Stats bar com média geral e total de reviews

### 4. **DevLoginSimulator** (`src/components/DevLoginSimulator.tsx`)

**Apenas em desenvolvimento** (NODE_ENV === 'development'):
- Botão flutuante no canto inferior direito
- Simula login com usuário fake: João Silva
- Util para testar postagem de reviews sem Google OAuth

## Data Storage

### localStorage Keys
- `barrigudo_user_session`: Sessão do usuário autenticado
- `barrigudo_reviews`: Array JSON de reviews

### Review Structure
```typescript
interface Review {
  id: string; // gerado: review_${timestamp}_${random}
  userName: string;
  userAvatarUrl: string;
  rating: number; // 1-5
  body: string;
  createdAt: Date;
}
```

## Como Usar Localmente

### 1. Acessar a página de Reviews
```
http://localhost:5173/experiences
```

### 2. Simular login (DEV only)
- Clique no botão **"DEV: Login"** no canto inferior direito
- Clique em "Login as João Silva"
- Você verá seu name + avatar no formulário de review

### 3. Postar um review
- Selecione rating (1-5 stars)
- Escreva seu review
- Clique "Post Review"
- Review aparece no topo da lista com animação
- Stats (média, total) atualizam

### 4. Filtrar e ordenar
- Dropdown "Newest" / "Highest Rating"
- Dropdown "All Ratings" / "5 stars" / etc.

### 5. Logout
- Clique no nome do usuário (botão DEV Login)
- Clique "Logout"
- Form desaparece, mostra "Sign in with Google (Coming soon)"

## Migração para Supabase (Futura)

### Passo 1: Setup Supabase
```bash
npm install @supabase/supabase-js
```

### Passo 2: Criar tabela + policies SQL
```sql
-- Create table
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_avatar_url text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_hidden boolean NOT NULL DEFAULT false
);

-- Index para performance
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT (público, não-hidden)
CREATE POLICY "Public reviews visible" ON public.reviews
  FOR SELECT USING (is_hidden = false);

-- Policy: INSERT (usuário autenticado)
CREATE POLICY "Users can insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: UPDATE (apenas do próprio)
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: DELETE (apenas do próprio)
CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);
```

### Passo 3: Criar SupabaseReviewsService
```typescript
// src/lib/supabaseReviewsService.ts
export class SupabaseReviewsService implements ReviewsServiceInterface {
  // implementação similar ao LocalReviewsService
  // mas usa supabase.from('reviews').select() etc
}
```

### Passo 4: Trocar importação em ClientReviews
```typescript
// De:
import { reviewsService } from "@/lib/reviewsService";

// Para:
import { reviewsService } from "@/lib/supabaseReviewsService";
```

### Passo 5: Auth Google
```typescript
// Em UserContext ou novo hook de auth
const signInWithGoogle = () => {
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/experiences" },
  });
};
```

E remover DevLoginSimulator quando Auth real estiver pronto.

## Arquivo Alterado: Pages/Experiences.tsx

Agora inclui:
- Hero section com gradient + blob animation
- Stats preview (stars, total reviews)
- Integração do `<ClientReviews />` component

## UI/UX Details

- **Colors**: Gradientes blue-indigo para form (user), slate para fundo geral
- **Shadows**: shadow-md, shadow-lg em cards (hover effect)
- **Border Radius**: rounded-2xl (sections), rounded-xl (cards), rounded-lg (inputs)
- **Motion**: Framer Motion `initial/animate/exit` em reviews, Load More buttonhover
- **Accessibility**: Star rating com buttons de clique, textarea com placeholder, labels
