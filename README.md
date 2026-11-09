# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Authentication & Supabase

Steps 1–3 of the hosted platform are wired:

- Typed Supabase browser client (`src/lib/supabase/client.ts`)
- Auth context with email/password, signup, signout, and demo mode
- `/login` and `/signup` pages
- `beforeLoad` route protection and admin-only route guards
- SQL migrations for profiles, courses, lessons, enrollments, progress, RLS, and the
  `course-videos` storage bucket

To connect a Supabase project, follow [supabase/README.md](supabase/README.md) and add
`.env` from `.env.example`. Without those variables the app remains in local demo
mode with “دخول كمدير / دخول كطالب” quick access.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
