import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/account");
  }

  return session;
}

export async function requireCustomer(callbackUrl = "/account") {
  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/account/login", "https://local");
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    redirect(`${loginUrl.pathname}${loginUrl.search}`);
  }

  return session;
}

export async function requireAdminSession() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}
