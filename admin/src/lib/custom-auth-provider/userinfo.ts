import { createAuthClient } from "../supabase/auth";

export async function getUserInfo() {
  const auth = await createAuthClient();
  const { data: userIdentitiesData } = await auth.getUserIdentities();
  if (userIdentitiesData && userIdentitiesData.identities.length >= 1) {
    const identity = userIdentitiesData.identities.find(
      (identity) => identity.provider === "custom:unique"
    );
    if (!identity) return null;
    const { data: sessionData } = await auth.getSession();
    if (typeof identity.identity_data?.iss === "string") {
      const openidConfigRes = await fetch(
        `${identity.identity_data.iss}/.well-known/openid-configuration`
      );
      const openidConfig = await openidConfigRes.json();
      if (
        openidConfigRes.ok &&
        typeof openidConfig.userinfo_endpoint === "string"
      ) {
        const userinfoRes = await fetch(openidConfig.userinfo_endpoint, {
          headers: {
            Authorization: `${sessionData.session?.token_type} ${sessionData.session?.provider_token}`,
          },
        });
        if (!userinfoRes.ok) {
          throw `Faild to fetch userinfo endpoint: ${userinfoRes.status} - ${userinfoRes.text()}`;
        }
        return await userinfoRes.json();
      }
    }
  }
}
