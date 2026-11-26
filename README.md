# SalonBook Studio API

Express REST API with MongoDB, Better Auth, signed JWT middleware, ImgBB and Stripe Checkout.

## Run locally

1. Install Node 22+ and run `npm install`.
2. Copy the environment template to `.env`. Use a MongoDB Atlas replica set for transactional webhooks.
3. Configure Google OAuth with `/api/auth/callback/google` on the public client origin.
4. Run `npm run seed` to seed the catalog. Set the admin variables only while bootstrapping a fresh evaluation account, then remove them from the environment.
5. Run `npm start`. The local API defaults to port 4000.
6. Configure Stripe to deliver `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` to the API at `/api/webhooks/stripe`. The webhook signing secret must match the endpoint. Use Stripe test mode for evaluation.

Environment variable names are listed in `.env.example`. For deployment, set CLIENT_URL and BETTER_AUTH_URL to the public Next.js website origin. Keep API_BASE_URL in the client pointed at the Express host.

[Client repository](https://github.com/shanajtech/salonbook-studio-client) · [Server repository](https://github.com/shanajtech/salonbook-studio-server)

[Live website](https://salonbook-studio-client-ktn7.vercel.app) · [API health](https://salonbook-studio-server.vercel.app/api/health)
