import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  beforeLoad: async ({ location }) => {
    // getSession() reads the locally cached session (no network round-trip), so
    // navigating between authenticated pages is instant.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    return { user };
  },
  component: () => <Outlet />,
});
