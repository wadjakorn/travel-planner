import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEV_USER_ID = "dev-bypass-user";
const DEV_USER_EMAIL = "dev@localhost";

/** Returns a mock session when AUTH_BYPASS=true, otherwise calls NextAuth's auth(). */
export async function getSession() {
  if (process.env.AUTH_BYPASS === "true") {
    // Upsert a stable dev user so trip ownership works.
    // Wrapped in try/catch so static builds (no DB) don't fail.
    try {
      await prisma.user.upsert({
        where: { id: DEV_USER_ID },
        create: {
          id: DEV_USER_ID,
          email: DEV_USER_EMAIL,
          name: "Dev User",
        },
        update: {},
      });
    } catch {
      // DB not available (e.g. during build) — session still returned below
    }

    return {
      user: {
        id: DEV_USER_ID,
        name: "Dev User",
        email: DEV_USER_EMAIL,
        image: null,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return auth();
}
