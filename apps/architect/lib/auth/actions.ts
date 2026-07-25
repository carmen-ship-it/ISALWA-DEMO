"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ArchitectSession } from "@/types/auth";
import { isSupabaseConfigured } from "./config";
import { postLoginPath } from "./permissions";
import {
  authenticatePilot,
  buildSessionFromEmail,
  createPilotSessionCookieValue,
  PILOT_SESSION_COOKIE,
  readPilotSessionCookie,
} from "./session";
import { createServerSupabaseClient } from "./supabase/server";

export async function getServerSession(): Promise<ArchitectSession | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return null;
      return buildSessionFromEmail(user.email, "supabase", user.id);
    } catch {
      return null;
    }
  }

  const cookieStore = await cookies();
  return readPilotSessionCookie(cookieStore.get(PILOT_SESSION_COOKIE)?.value);
}

export async function signInAction(formData: FormData): Promise<{
  error?: string;
  redirectTo?: string;
}> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingrese su correo y contraseña." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user?.email) {
        return { error: "Correo o contraseña incorrectos." };
      }
      const session = buildSessionFromEmail(
        data.user.email,
        "supabase",
        data.user.id,
      );
      if (!session) {
        await supabase.auth.signOut();
        return { error: "Este usuario no está autorizado en el piloto." };
      }
      return { redirectTo: postLoginPath(session) };
    } catch {
      return { error: "No se pudo iniciar sesión. Intente de nuevo." };
    }
  }

  const session = authenticatePilot(email, password);
  if (!session) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const cookieStore = await cookies();
  cookieStore.set(PILOT_SESSION_COOKIE, createPilotSessionCookieValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { redirectTo: postLoginPath(session) };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // continue clearing pilot cookie
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(PILOT_SESSION_COOKIE);
  redirect("/login");
}
