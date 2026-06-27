import { createAdminClient } from "@mirai-gikai/supabase";
import { type NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/auth/permissions";
import { getUserInfo } from "@/lib/custom-auth-provider/userinfo";
import { routes } from "@/lib/routes";
import { createAuthClient } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${origin}${routes.login()}?error=missing_code`
    );
  }

  const auth = await createAuthClient();
  const { error } = await auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}${routes.login()}?error=auth_error`);
  }

  // admin 権限チェック: 権限がなければサインアウトしてログインページにリダイレクト
  const {
    data: { user },
  } = await auth.getUser();

  if (!user) {
    await auth.signOut();
    return NextResponse.redirect(
      `${origin}${routes.login()}?error=unauthorized`
    );
  }
  if (!checkAdminPermission(user)) {
    // UniQUEのロールを確認しprocess.env.UNIQUE_ADMIN_ROLEと一致すれば管理者権限を付与
    // biome-ignore lint/suspicious/noExplicitAny: APIの値なので固定し難い
    let userinfoData: any;
    try {
      userinfoData = await getUserInfo();
    } catch {
      return NextResponse.redirect(
        `${origin}${routes.login()}?error=auth_error`
      );
    }
    if (
      process.env.UNIQUE_ADMIN_ROLE &&
      userinfoData &&
      Array.isArray(userinfoData.roles) &&
      // biome-ignore lint/suspicious/noExplicitAny: APIの値なので固定し難い
      (userinfoData.roles as Array<any>).includes(process.env.UNIQUE_ADMIN_ROLE)
    ) {
      const adminClient = createAdminClient();
      const { error } = await adminClient.auth.admin.updateUserById(user?.id, {
        app_metadata: {
          roles: ["admin"],
        },
      });
      if (error) {
        return NextResponse.redirect(
          `${origin}${routes.login()}?error=auth_error`
        );
      }
      return NextResponse.redirect(`${origin}${routes.bills()}`);
    }
    await auth.signOut();
    return NextResponse.redirect(
      `${origin}${routes.login()}?error=unauthorized`
    );
  }

  return NextResponse.redirect(`${origin}${routes.bills()}`);
}
