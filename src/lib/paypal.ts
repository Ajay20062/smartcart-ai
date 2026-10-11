import "server-only";

const defaultPayPalBaseUrl = "https://api-m.sandbox.paypal.com";

function getPayPalBaseUrl() {
  const baseUrl = process.env.PAYPAL_BASE_URL || defaultPayPalBaseUrl;
  const parsed = new URL(baseUrl);

  if (
    parsed.protocol !== "https:" ||
    !["api-m.sandbox.paypal.com", "api-m.paypal.com"].includes(
      parsed.hostname,
    ) ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("PAYPAL_BASE_URL must be a valid PayPal API origin.");
  }

  return parsed.origin;
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are missing.");
  }

  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`PayPal authentication failed (${response.status}).`);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("access_token" in data) ||
    typeof data.access_token !== "string"
  ) {
    throw new Error("PayPal returned an invalid access token response.");
  }

  return data.access_token;
}

async function paypalRequest<T>(
  path: string,
  options: { body?: unknown; requestId?: string } = {},
): Promise<T> {
  const accessToken = await getAccessToken();
  const hasBody = options.body !== undefined;
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method: hasBody ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(options.requestId
        ? { "PayPal-Request-Id": options.requestId }
        : {}),
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    console.error("PayPal API request failed:", response.status);
    throw new Error(`PayPal request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

type PayPalCheckout = {
  id?: string;
  links?: Array<{ rel?: string; href?: string }>;
};

type PayPalCaptureResult = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
};

type PayPalWebhookVerification = {
  verification_status?: string;
};

export async function createPayPalCheckout(input: {
  priceCents: number;
  currency: string;
  title: string;
  localOrderId: string;
}) {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is missing.");
  }

  const parsedAppUrl = new URL(appUrl);
  if (
    !["http:", "https:"].includes(parsedAppUrl.protocol) ||
    parsedAppUrl.username ||
    parsedAppUrl.password
  ) {
    throw new Error("APP_URL must be a valid HTTP(S) origin.");
  }

  return paypalRequest<PayPalCheckout>("/v2/checkout/orders", {
    requestId: input.localOrderId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.localOrderId,
          custom_id: input.localOrderId,
          description: input.title.slice(0, 127),
          amount: {
            currency_code: input.currency,
            value: (input.priceCents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: process.env.CREATOR_NAME || "SmartCart AI",
        user_action: "PAY_NOW",
        return_url: `${parsedAppUrl.origin}/checkout/success`,
        cancel_url: `${parsedAppUrl.origin}/checkout/cancel`,
      },
    },
  });
}

export async function capturePayPalOrder(
  paypalOrderId: string,
  requestId: string,
) {
  return paypalRequest<PayPalCaptureResult>(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    { body: {}, requestId },
  );
}

export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  webhookEvent: unknown,
) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is missing.");
  }

  return paypalRequest<PayPalWebhookVerification>(
    "/v1/notifications/verify-webhook-signature",
    {
      body: {
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      },
    },
  );
}
