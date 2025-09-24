
import express from "express";
import type { Request, Response } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);


app.use(
     cors({
    origin: true,
  })
);
app.use(express.json());


app.post("/create-payment-intent", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "tnd",
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/create-payment-intent", (_req: Request, res: Response) => {
  res.status(405).json({ error: "Use POST /create-payment-intent with JSON body { amount }" });
});

// Basic routes for health checks and root access in browser
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("Backend is running.");
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Export the Express app for serverless environments
export default app;

// Start server only when running locally (not on Vercel)
if (process.env.VERCEL !== "1") {
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
}
