# Welcome to your Lovable project

## Supabase Setup

To connect Google login and reviews storage:

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with values from your Supabase project.
3. In Supabase Auth, enable **Google** provider and set redirect URL to `http://localhost:8080/experiences` (and your production URL if needed).
4. Create the `reviews` table and RLS policies from `REVIEWS_SYSTEM.md`.
5. Run the app with `npm run dev`.

If Supabase variables are missing, the app falls back to local storage for reviews and uses dev login simulation.

### Supabase Cloud (No Docker)

Use this path if you cannot install Docker.

1. In Supabase Dashboard, create or open your project.
2. Get these values from **Project Settings > API**:
	- `Project URL` -> `VITE_SUPABASE_URL`
	- `anon public` key -> `VITE_SUPABASE_ANON_KEY`
3. Put both values in `.env`.
4. Open **SQL Editor** in Supabase and run [supabase/remote_setup.sql](supabase/remote_setup.sql).
5. In **Authentication > Providers > Google**, enable Google and add redirect URLs:
	- `http://localhost:8080`
	- `http://localhost:8080/experiences`
6. Run frontend with:

```sh
npm run dev
```

With this flow, the app uses remote Supabase directly and does not require `supabase start`.

### Local Supabase (VS Code Extension)

1. Install and open Docker Desktop.
2. In project root, run:

```sh
npx supabase login
npx supabase start
npx supabase db reset
```

3. Start frontend:

```sh
npm run dev
```

4. In VS Code Supabase extension, click **Connect** (local instance).

If `supabase start` fails with `//./pipe/docker_engine`, Docker is not running (or VS Code needs admin privileges on Windows).

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Vercel + External API

When deploying only the frontend on Vercel, set `VITE_API_URL` to your backend base URL.

Example:

```sh
VITE_API_URL="https://your-api-domain.com"
```

If `VITE_API_URL` is empty, the app uses relative paths (for local dev with Vite proxy, e.g. `/api/...`).

For admin session cookies to work across different domains, configure backend envs in production:

```sh
FRONTEND_ORIGIN="https://home-pros-grid.vercel.app"
SESSION_COOKIE_SAME_SITE="none"
SESSION_COOKIE_SECURE="true"
NODE_ENV="production"
```

## Vercel Single Project (Frontend + /api)

This repository now supports Vercel Serverless API at `/api` via `api/index.js`.

For same-domain setup (`https://home-pros-grid.vercel.app` serving frontend and API):

```sh
VITE_API_URL=""
FRONTEND_ORIGIN="https://home-pros-grid.vercel.app"
SESSION_COOKIE_SAME_SITE="lax"
SESSION_COOKIE_SECURE="true"
NODE_ENV="production"
```

Note: file-based writes run in `/tmp` on Vercel and are ephemeral between cold starts/redeploys.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
