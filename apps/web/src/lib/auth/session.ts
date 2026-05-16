import { getServerSession } from "next-auth";
import { authOptions } from "./options";
import { redirect } from "next/navigation";

/** Gets the session or redirects to /login. Use in server components. */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return session;
}
