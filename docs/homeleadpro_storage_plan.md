# Plano de Buckets de Storage — HomeLeadPro (Versão 2)

> **Nota de nomenclatura e revisão:** o produto anteriormente chamado Barrigudo passa a ter o nome comercial HomeLeadPro. Esta versão 2 do plano de buckets de storage reforça a segurança contra URLs públicas para arquivos confidenciais.

---

## 1. Mapeamento de Buckets no Supabase Storage

Para proteger documentos fiscais, recibos e mídias de vistorias confidenciais, os buckets são configurados seguindo controle de visibilidade estrito:

| Nome do Bucket | Tipo de Acesso | Upload (Quem envia?) | Leitura (Quem lê?) | Restrição RLS / Mecanismo de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| **`lead-files`** | Privado | Público Anônimo / Funcionários | Membros da Org / Cliente via Token | Leitura pública direta por URL bloqueada. Acesso de clientes feito via RPC com validação de token. |
| **`service-files`** | Privado | Funcionários / Gestores | Membros da Org / Cliente via Token | Acesso do cliente anônimo é liberado pela RPC `get_public_estimate_files` apenas se `visibility='client'`. |
| **`receipt-files`** | Privado | Gestores da Empresa | Apenas Gestores (Owner e Admin) | Totalmente privado. Bloqueado para trabalhadores e clientes. Sem URLs públicas. |
| **`company-assets`** | Público | Owner da Empresa | Público Geral (CDN do Supabase) | Contém imagens institucionais e logotipos das empresas parceiras para exibição em faturas. |
| **`public-portfolio`**| Público | Super Admin | Público Geral (Vitrine do site) | Portfólio de obras concluídas de Massachusetts para o site público. |

---

## 2. Parâmetros Técnicos de Upload e Compactação

Para otimizar o uso do storage e reduzir custos, todas as mídias passam por pré-processamento client-side antes de serem enviadas ao Supabase:

### 2.1. Fotos (Client-Side)
* **Biblioteca:** `browser-image-compression` (instalada no package.json).
* **Configuração:**
  * Largura máxima: 1920px.
  * Altura máxima: 1080px.
  * Qualidade: 0.8 (80% de preservação visual, gerando arquivos de ~300KB a 600KB).

### 2.2. Vídeos (Limites de Upload)
* **Tamanho Máximo:** 15MB.
* **Duração Máxima:** 15 segundos.
* **MIME Types Permitidos:** `video/mp4`, `video/quicktime` (mov), `video/webm`.
* **Processamento:** O input de arquivos do celular valida a duração antes do upload, evitando sobrecarga do bucket.

### 2.3. Documentos e PDFs
* **Tamanho Máximo:** 5MB.
* **MIME Types Permitidos:** `application/pdf`, `image/jpeg`, `image/png` (recibos e licenças).
* **Mecanismo:** Armazenados no bucket privado `receipt-files`. As URLs geradas de leitura são assinadas temporariamente (`signed URLs`) expiráveis em até 5 minutos, válidas apenas para sessões de Owners ou Admins da empresa.
