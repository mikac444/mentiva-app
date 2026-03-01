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

    if (email) {
      // 1. Add to Supabase allowlist
      const { error } = await supabaseAdmin
        .from("allowed_emails")
        .upsert({ email: email.toLowerCase() }, { onConflict: "email" });

      if (error) {
        console.error("Failed to add email:", error);
      } else {
        console.log("Added email to allowlist:", email);
      }

      // 2. Add to Brevo "Founding Members" list
      const brevoKey = process.env.BREVO_API_KEY;
      if (brevoKey) {
        try {
          const firstName = customerName
            ? customerName.split(/\s+/)[0]
            : email.split("@")[0];

          const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
            method: "POST",
            headers: {
              "api-key": brevoKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.toLowerCase(),
              attributes: { FIRSTNAME: firstName },
              listIds: [3],
              updateEnabled: true,
            }),
          });

          if (brevoRes.ok) {
            console.log("Added to Brevo Founding Members list:", email);
          } else {
            const errBody = await brevoRes.text();
            console.error("Brevo API error:", brevoRes.status, errBody);
          }
        } catch (brevoErr) {
          // Don't fail the webhook if Brevo is down
          console.error("Brevo API call failed:", brevoErr);
        }
      } else {
        console.warn("BREVO_API_KEY not configured, skipping email list sync");
      }
    }
  }

  return NextResponse.json({ received: true });
}
