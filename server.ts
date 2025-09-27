import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import type { Request, Response } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const stripe1 = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});
app.use(cors({
  origin: ['http://localhost:8080', 'https://innovatun-23ee3.web.app','https://innovatun-23ee3.firebaseapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

app.use(cookieParser());



// Issue JWT cookie
app.post("/jwt", (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  const token = jwt.sign({ sub: email, email }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });

  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return res.status(200).json({ ok: true });
});

// Logout clears the same cookie
app.post("/logout", (_req: Request, res: Response) => {
  res
    .clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    })
    .send({ success: true });
});

// Auth middleware (reads the same cookie)
function requireAuth(req: Request, res: Response, next: () => void) {
  const token = (req as any).cookies?.session as string | undefined;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = req.body || {};
    
    const session = await stripe1.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail || undefined,
      success_url: successUrl || "https://backend-ten-red-40.vercel.app/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl || "https://backend-ten-red-40.vercel.app/cancel",
    });

    res.json({ url: session.url }); 
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
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

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});


app.get("/success", (req: Request, res: Response) => {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: "Missing session_id" });
  }
  res.status(200).json({ 
    message: "Payment successful", 
    session_id,
   
  });
});


app.get("/cancel", (_req: Request, res: Response) => {
  res.status(200).json({ 
    message: "Payment cancelled",
  
  });
});


export default app;


if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
