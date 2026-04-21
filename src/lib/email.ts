import { Resend } from "resend";
import { getSiteUrl } from "@/lib/site-url";

let resendClient: Resend | null = null;

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

type CourseEmailOrder = {
  customerName: string;
  customerEmail: string;
  items: Array<{
    title: string;
  }>;
};

type GiftCertificateEmailInput = {
  customerName: string;
  customerEmail: string;
  code: string;
  title: string;
  amount: number;
  currency: string;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function getMailFrom() {
  const mailFrom = process.env.MAIL_FROM;

  if (!mailFrom) {
    throw new Error("MAIL_FROM is required");
  }

  return mailFrom;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatAmount(amount: number, currency: string) {
  return `${(amount / 100).toLocaleString("ru-RU")} ${currency}`;
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: getMailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: getMailFrom(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function sendCoursePaymentConfirmationEmail(order: CourseEmailOrder) {
  const siteUrl = getSiteUrl();
  const itemsHtml = order.items
    .map((item) => `<li>${escapeHtml(item.title)}</li>`)
    .join("");

  return sendTransactionalEmail({
    to: order.customerEmail,
    subject: "Оплата получена — доступ к курсу оформлен",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h1 style="font-size:22px;margin-bottom:16px">Спасибо за покупку, ${escapeHtml(order.customerName)}!</h1>
        <p>Мы получили вашу оплату и начали выдачу доступа в GetCourse.</p>
        <p>Состав заказа:</p>
        <ul>${itemsHtml}</ul>
        <p>Если доступ не появится автоматически, свяжитесь с нами, ответив на это письмо.</p>
        <p><a href="${siteUrl}" style="color:#2563eb">Перейти на сайт</a></p>
      </div>
    `,
  });
}

export async function sendGiftCertificatePurchaserEmail(input: GiftCertificateEmailInput) {
  const siteUrl = getSiteUrl();
  const amount = formatAmount(input.amount, input.currency);

  return sendTransactionalEmail({
    to: input.customerEmail,
    subject: "Подарочный сертификат оплачен",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h1 style="font-size:22px;margin-bottom:16px">Подарочный сертификат готов</h1>
        <p>${escapeHtml(input.customerName)}, мы получили оплату сертификата на <strong>${escapeHtml(
      input.title
    )}</strong>.</p>
        <p>Код сертификата: <strong>${escapeHtml(input.code)}</strong></p>
        <p>Сумма: <strong>${escapeHtml(amount)}</strong></p>
        <p><a href="${siteUrl}" style="color:#2563eb">Открыть сайт</a></p>
      </div>
    `,
  });
}

export async function sendGiftCertificateRecipientEmail(
  recipientEmail: string,
  input: Omit<GiftCertificateEmailInput, "customerEmail">
) {
  const siteUrl = getSiteUrl();
  const amount = formatAmount(input.amount, input.currency);

  return sendTransactionalEmail({
    to: recipientEmail,
    subject: "Вам подарили сертификат на курс",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h1 style="font-size:22px;margin-bottom:16px">Вам подарили онлайн-курс</h1>
        <p>Для вас оплачен подарочный сертификат на <strong>${escapeHtml(input.title)}</strong>.</p>
        <p>Код сертификата: <strong>${escapeHtml(input.code)}</strong></p>
        <p>Сумма: <strong>${escapeHtml(amount)}</strong></p>
        <p>Если для активации понадобится помощь, ответьте на это письмо.</p>
        <p><a href="${siteUrl}" style="color:#2563eb">Перейти на сайт</a></p>
      </div>
    `,
  });
}
