# SmartCart AI

SmartCart AI creates personalized digital guides, prices them, accepts PayPal
payments, and delivers paid products as PDFs. A single creator can manage store
branding, base pricing, orders, and revenue from a protected dashboard.

## Requirements

- Node.js 20.9 or newer
- MySQL 8 (or a compatible MySQL server)
- PayPal Sandbox credentials to test checkout
- An OpenAI API key for AI-generated content (optional; demo content is used
  when the key is unset)

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env.local`. Keep `.env.local` private and out of
   source control. Set `DATABASE_URL` to the MySQL account and database you
   created. Percent-encode special characters in the username or password
   (for example, encode `@` as `%40`). The MySQL account must be allowed to
   connect from the host in the URL and have privileges on `smartcart`.

3. Create the schema using MySQL Workbench or a MySQL client:

   - For a new database, execute `database/schema.sql`.
   - For an existing SmartCart database, execute `database/dashboard.sql` to
     add creator branding without replacing existing orders or settings.

4. Check the connection and required tables/columns:

   ```powershell
   npm run db:check
   ```

   The check reports the connection host and database only; it never prints
   credentials. On `ER_ACCESS_DENIED_ERROR`, verify the password and the
   account's MySQL host entry. An account such as `'smartcart'@'localhost'`
   may not grant access to a TCP connection from `127.0.0.1`. Do not paste
   passwords into chat, logs, or source files.

5. Configure the creator dashboard login from an interactive terminal:

   ```powershell
   npm run setup:creator
   ```

   Enter a creator email and a password of at least 12 characters. Password
   input is hidden; the setup command writes only the bcrypt hash and generated
   session secret to `.env.local`. Restart the server after changing
   environment settings.

6. Start the application:

   ```powershell
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) for the storefront,
   `/login` for creator sign-in, and `/dashboard` for store management.

## Optional integrations

- Set `OPENAI_API_KEY` and `OPENAI_MODEL` to enable AI product generation. With
  no API key, the app uses clearly labeled demo content.
- Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_BASE_URL` to
  PayPal Sandbox values to enable checkout. Configure a PayPal webhook for
  `PAYMENT.CAPTURE.COMPLETED` and set its ID in `PAYPAL_WEBHOOK_ID`. The webhook
  endpoint must be reachable by PayPal; localhost alone is not reachable from
  PayPal.
- Set `APP_URL` to the public HTTPS origin when testing PayPal outside local
  development.

## Validation

```powershell
npm run db:check
npm run lint
npx tsc --noEmit
npm run build
```

Product generation and creator settings require the database. Payment and PDF
delivery require PayPal credentials and a verified successful capture.
