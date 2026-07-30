import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
