import express from "express";
import type { Request, Response } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const stripe1 = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
});

app.use(
  cors({
    origin: true,
  })
);
app.use(express.json());

app.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const { priceId } = req.body || {};
    const session = await stripe1.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url:
        "https://backend-ten-red-40.vercel.app/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://backend-ten-red-40.vercel.app/cancel",
    });

    res.json({ url: session.url }); 
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      res.status(500).json({ message: error.message });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
});

app.post("/create-payment-intent", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const paymentIntent = await stripe1.paymentIntents.create({
      amount,
      currency: "usd",
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
});

app.get("/create-payment-intent", (_req: Request, res: Response) => {
  res
    .status(405)
    .json({ error: "Use POST /create-payment-intent with JSON body { amount }" });
});

// Basic routes for health checks and root access in browser
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("Backend is running.");
});

// Export the Express app for serverless environments
export default app;

// Start server only when running locally (not on Vercel)
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
