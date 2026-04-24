import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const SETUP_TOKEN_TTL_HOURS = 48;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashAccountToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordSetupExpiresAt() {
  return new Date(Date.now() + SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

export async function linkOrdersToUserByEmail(input: { email: string; userId: string }) {
  const email = normalizeEmail(input.email);

  return db.order.updateMany({
    where: {
      userId: null,
      customerEmail: {
        equals: email,
        mode: "insensitive",
      },
    },
    data: {
      customerEmail: email,
      userId: input.userId,
    },
  });
}

export async function ensureCustomerAccount(input: { email: string; name: string }) {
  const email = normalizeEmail(input.email);
  const fallbackName = email.split("@")[0] || "Покупатель";
  const name = input.name.trim() || fallbackName;
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    await linkOrdersToUserByEmail({ email, userId: existingUser.id });
    return existingUser;
  }

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: null,
      role: "CUSTOMER",
    },
  });

  await linkOrdersToUserByEmail({ email, userId: user.id });
  return user;
}

export async function createPasswordSetupToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashAccountToken(token);
  const expiresAt = getPasswordSetupExpiresAt();

  await db.passwordSetupToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  await db.passwordSetupToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return { expiresAt, token };
}

export async function getValidPasswordSetupToken(token: string) {
  if (!token.trim()) {
    return null;
  }

  return db.passwordSetupToken.findFirst({
    where: {
      tokenHash: hashAccountToken(token),
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function consumePasswordSetupToken(input: {
  passwordHash: string;
  token: string;
}) {
  const tokenHash = hashAccountToken(input.token);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const setupToken = await tx.passwordSetupToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: true,
      },
    });

    if (!setupToken) {
      return null;
    }

    const user = await tx.user.update({
      where: { id: setupToken.userId },
      data: {
        passwordHash: input.passwordHash,
      },
    });

    await tx.passwordSetupToken.update({
      where: { id: setupToken.id },
      data: {
        usedAt: now,
      },
    });

    await tx.order.updateMany({
      where: {
        userId: null,
        customerEmail: {
          equals: user.email,
          mode: "insensitive",
        },
      },
      data: {
        customerEmail: user.email,
        userId: user.id,
      },
    });

    return user;
  });
}
