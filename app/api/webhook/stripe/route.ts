import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-02-24.acacia",
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_email || session.customer_details?.email;
    const customerName = session.customer_details?.name || "";
    const clientRefId = session.client_reference_id || "";

    if (email) {
      const normalizedEmail = email.toLowerCase();

      // 1. Add to Supabase allowlist
      const { error } = await supabaseAdmin
        .from("allowed_emails")
        .upsert({ email: normalizedEmail }, { onConflict: "email" });

      if (error) {
        console.error("Failed to add email:", error);
      }

      // 2. Credit referrer if this purchase came from a referral link
      if (clientRefId.startsWith("ref_")) {
        const refCode = clientRefId.replace("ref_", "");
        try {
          // Update existing "clicked" referral to "converted", or insert new one
          const { data: existing } = await supabaseAdmin
            .from("referrals")
            .select("id")
            .eq("referrer_code", refCode)
            .eq("referred_email", normalizedEmail)
            .single();

          if (existing) {
            await supabaseAdmin
              .from("referrals")
              .update({ status: "converted" })
              .eq("id", existing.id);
          } else {
            await supabaseAdmin
              .from("referrals")
              .insert({
                referrer_code: refCode,
                referred_email: normalizedEmail,
                status: "converted",
              });
          }
          // Referral conversion tracked
        } catch (refErr) {
          console.error("Referral tracking failed:", refErr);
        }
      }

      // 3. Add to Brevo "Founding Members" list
      const brevoKey = process.env.BREVO_API_KEY;
      if (brevoKey) {
        try {
          const firstName = customerName
            ? customerName.split(/\s+/)[0]
            : email.split("@")[0];

          // Include UTM source if available
          const utmSource = clientRefId.startsWith("utm_") ? clientRefId.replace("utm_", "") : "";

          const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
            method: "POST",
            headers: {
              "api-key": brevoKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: normalizedEmail,
              attributes: {
                FIRSTNAME: firstName,
                ...(utmSource ? { UTM_SOURCE: utmSource } : {}),
              },
              listIds: [3],
              updateEnabled: true,
            }),
          });

          if (!brevoRes.ok) {
            const errBody = await brevoRes.text();
            console.error("Brevo API error:", brevoRes.status, errBody);
          }
        } catch (brevoErr) {
          // Don't fail the webhook if Brevo is down
          console.error("Brevo API call failed:", brevoErr);
        }
      } else {
        // BREVO_API_KEY not configured, skipping email list sync
      }
    }
  }

  return NextResponse.json({ received: true });
}
