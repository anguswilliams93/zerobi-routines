"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "zb-auth";

export async function login(formData: FormData) {
  const password = formData.get("password")?.toString() ?? "";
  const next = formData.get("next")?.toString() || "/";

  if (password !== process.env.DASHBOARD_PASSWORD) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const jar = await cookies();
  jar.set(COOKIE, process.env.DASHBOARD_SESSION_TOKEN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect("/login");
}
