
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
    origin: ["http://localhost:8080", "https://localhost:5173"],
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
      currency: "usd",
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
