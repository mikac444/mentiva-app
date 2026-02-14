import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email) {
    const { data } = await supabase
      .from("allowed_emails")
      .select("email")
      .eq("email", user.email.toLowerCase())
      .single();
    if (data) {
      redirect("/dashboard");
    } else {
      redirect("/unauthorized");
    }
  }

  return <LandingPage />;
}
