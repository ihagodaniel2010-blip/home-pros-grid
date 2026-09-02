# Fase 7.6 — Connect h-a-construction.com Domain to Vercel via Cloudflare

## 1. Visão Geral
A Fase 7.6 conectou com sucesso o domínio oficial **`h-a-construction.com`** (registrado na Cloudflare) ao projeto de produção na Vercel, ativando suporte a HTTPS/SSL automático e mantendo a URL original da Vercel como fallback funcional.

---

## 2. Configurações de Domínio na Vercel
1. **Projeto Vercel de Produção**: Conectado ao repositório GitHub `ihagodaniel2010-blip/home-pros-grid.git` (`dev-Hugo`).
2. **Domínio Principal (Apex/Root)**: `h-a-construction.com` configurado como domínio primário.
3. **Subdomínio www**: `www.h-a-construction.com` configurado para redirecionamento 301 automático para `h-a-construction.com`.
4. **URL de Fallback**: A URL original da Vercel (`.vercel.app`) foi preservada como endpoint secundário.

---

## 3. Apontamento de Registros DNS na Cloudflare
Os registros DNS foram configurados no painel Cloudflare exatamente como solicitado pela Vercel:

| Tipo | Nome / Host | Valor / Destino | Proxy Status | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | DNS Only (Grey Cloud) | Auto |
| **CNAME** | `www` | `cname.vercel-dns.com` | DNS Only (Grey Cloud) | Auto |

- **Validação de Certificado SSL**: Configurado como *DNS Only* na validação inicial para que a Vercel emita e gerencie o certificado SSL/TLS (Let's Encrypt) sem bloqueios de proxy.

---

## 4. Segurança & Testes de Produção
- **Projeto Supabase**: `Carpentry` (`https://ozhjvprhhsdglxokfwze.supabase.co`) mantido sem alterações.
- **Banco de Dados**: Nenhuma instrução SQL ou migração foi executada.
- **Rotas Protegidas por Token**: `/estimate/:token`, `/extra/:token` e `/public/receipt/:token` continuam funcionando estritamente com tokens de 64 caracteres.
- **Painel Administrativo**: Acesso em `/admin` e `/admin/login` mantido e seguro.
