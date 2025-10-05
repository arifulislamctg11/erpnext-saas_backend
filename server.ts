import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import type { Request, Response } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import usersRoutes from "./routes/users.routes.js";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { subscriptionEmailTemp } from "./util/emailTemplate.js";
import { getWelcomeEmailTemplate } from "./util/welcomeEmailTemplate.js";
import { sendEmail } from "./services/emailSend.js";
import {
  CreateCmpy,
  CreateEmployee,
  CreateUser,
  ResourceEmployee,
  UpdateEmployee,
  UpdateUser,
} from "./services/users/users.serv.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectMongo() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}
connectMongo();

const stripe1 = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "https://innovatun-23ee3.web.app",
      "https://innovatun-23ee3.firebaseapp.com",
      "https://innovatun-4d675.web.app/",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

app.use(cookieParser());

// mount users router
app.use(usersRoutes);

// Issue JWT cookie
app.post("/jwt", (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  const token = jwt.sign(
    { sub: email, email },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "7d",
    }
  );

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

// Auth middleware
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
    const {
      priceId,
      customerEmail,
      planName,
      planAmount,
      successUrl,
      cancelUrl,
    } = req.body || {};

    const session = await stripe1.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail || undefined,
      success_url:
        successUrl ||
        "https://backend-ten-red-40.vercel.app/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl || "https://backend-ten-red-40.vercel.app/cancel",
      metadata: {
        planName: planName || "",
        planAmount: planAmount || "",
        priceId: priceId || "",
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Get session data by session ID
app.get("/get-session-data/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId }: any = req.params;

    // Retrieve the Stripe session to get metadata
    const session = await stripe1.checkout.sessions.retrieve(sessionId);

    if (session && session.metadata) {
      res.json({
        planName: session.metadata.planName,
        planAmount: session.metadata.planAmount,
        priceId: session.metadata.priceId,
        customerEmail: session.customer_email,
      });
    } else {
      res.status(404).json({ error: "Session data not found" });
    }
  } catch (error) {
    console.error("Error retrieving session data:", error);
    res.status(500).json({ error: "Failed to retrieve session data" });
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
  res.status(405).json({
    error: "Use POST /create-payment-intent with JSON body { amount }",
  });
});

// Basic routes for health checks and root access in browser
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("Backend is running.");
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

/* moved to routes/users.routes.ts

*/
/* moved to routes/users.routes.ts

*/

/* moved to routes/users.routes.ts

*/
/* moved to routes/subscriptions.routes.ts
*/
//Forgot Password OTP Sending
app.post("/sendotp", async (req: Request, res: Response) => {
  try {
    const db = client.db("erpnext_saas");
    const temp_otp = db.collection("tempOtp");
    const users = db.collection("users");

    const isUserExists = await users.findOne({ email: req.body.email });
    if (!isUserExists) {
      return res.status(200).json({
        success: true,
        message: "User not registered with this email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP Send successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      err,
    });
  }
});

app.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, password, otp }: any = req.body;
    const db = client.db("erpnext_saas");
    const temp_otp = db.collection("tempOtp");
    const users = db.collection("users");

    const isUserExists = await temp_otp.findOne({ email: email });
    if (!isUserExists) {
      return res.status(200).json({
        success: true,
        message: "User not registered with this email",
      });
    }
    const temOtpData = await temp_otp.findOne({ email: email });

    if (temOtpData?.otp !== otp) {
      return res.status(200).json({
        success: true,
        message: "OTP is Wrong",
      });
    }

    const result = await users.updateOne(
      { email: email },
      { $set: { password: password } }
    );

    return res.status(200).json({
      success: true,
      message: "Password Changed successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

//Current Plan
app.get("/current-plan", async (req: Request, res: Response) => {
  try {
    const {email} : any= req.query
    
    const db = client.db("erpnext_saas");
    const subscriptions = db.collection("subscriptions");

    const subscriptionData = await subscriptions.findOne(
      {
        email: email,
        status: "active",
      },
      {
        sort: { createdAt: -1 }, // descending order to get the latest
      }
    );

    if (!subscriptionData) {
      return res.status(404).json({
        success: false,
        data: subscriptionData,
      });
    }

    return res.status(200).json({
      success: true,
      data: subscriptionData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.get("/user-profile", async (req: Request, res: Response) => {
  try {
    const { email }: any = req.query;

    const db = client.db("erpnext_saas");
    const Users = db.collection("users");

    const userData = await Users.findOne({
      email: email,
    });

    if (!userData) {
      return res.status(404).json({
        success: false,
        data: userData,
      });
    }

    return res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.post("/update-profile", async (req: Request, res: Response) => {
  try {
    const userData: any = req.body;

    const db = client.db("erpnext_saas");
    const Users = db.collection("users");

    const result = await Users.updateOne(
      { email: userData?.email },
      { $set: userData }
    );

    return res.status(200).json({
      success: true,
      message: "updated successfully!",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.get("/profile-complete", async (req: Request, res: Response) => {
  try {
    const { email }: any = req.query;

    const db = client.db("erpnext_saas");
    const profilecompletes = db.collection("profilecompletes");

    const profileCmpltData = await profilecompletes.findOne({ email: email });

    if (!profileCmpltData) {
      return res.status(404).json({
        success: false,
        data: profileCmpltData,
      });
    }

    return res.status(200).json({
      success: true,
      data: profileCmpltData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.get("/user-company/:companyName", async (req: Request, res: Response) => {
  const { companyName } = req.params;
  try {
    const data = await ResourceEmployee(companyName);
    res.send(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.post("/create-plan", async (req: Request, res: Response) => {
  try {

    const db = client.db("erpnext_saas");
    const PlanCollection = db.collection("plans");
    const result = await PlanCollection.insertOne(req.body);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Plan creation failed',
      });
    }
    if(result){
       const product = await stripe1.products.create({
      name: req.body?.planName,
      metadata: {
        features: JSON.stringify(req.body.features)
      }
    });

    // 2. Create the price (recurring)
    const price = await stripe1.prices.create({
      unit_amount: Number(req.body?.planPrice) * 100, // amount in cents
      currency: 'usd',
      recurring: { interval: 'month' },
      product: product.id,
    });

    }
    return res.status(200).json({ 
      success: true,
      message: 'Plan Created Successfully'
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

app.get("/plans", async (req: Request, res: Response) => {
  try {

    const db = client.db("erpnext_saas");
    const PlanCollection = db.collection("plans");
    const result = await PlanCollection.find({}).toArray();
    const products = await stripe1.products.list({limit: 100});

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No plans found',
      });
    }
  
    const productsWithPrices = await Promise.all(
      products.data.map(async (product: any) => {
        const prices: any = await stripe1.prices.list({
          product: product.id,
          limit: 100,
        });

        return {
          ...product,
          prices: prices.data[0].unit_amount,
          features: JSON.parse(product?.metadata?.features)
        };
      })
    );
    return res.status(200).json({ 
      success: true,
      data: result,
      products: productsWithPrices
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" ,
      err
    });
  }
});

app.get("/plans/:id", async (req: Request, res: Response) => {
  try {
    const {id}: any = req.params
    const db = client.db("erpnext_saas");
    // const PlanCollection = db.collection("plans");

    // const result = await PlanCollection.findOne( { _id: new ObjectId(id) },)
    const result: any = await stripe1.products.retrieve(id);
    const pr: any =  await stripe1.prices.list({
          product: id,
          limit: 100,
        });
    return res.status(200).json({ 
      success: true,
      data: {...result, price: pr.data[0].unit_amount, features: JSON.parse(result?.metadata?.features)}
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" ,
      err
    });
  }
});

app.post("/update-plan", async (req: Request, res: Response) => {
  try {
    const {id, ...rest} : any= req.body
 
    const db = client.db("erpnext_saas");
   const PlanCollection = db.collection("plans");

    // const result = await PlanCollection.updateOne(
    //   { _id: new ObjectId(_id)},
    //   { $set: rest }
    // );

    const updatedProduct = await stripe1.products.update(id, {
        name: rest?.name,
        metadata: {
          features: JSON.stringify(rest.features)
        }
      });
      
      const newPrice = await stripe1.prices.create({
        unit_amount: Number(rest?.price),
        currency: 'usd',
        recurring: { interval: 'month' },
        product: id,
      });
    return res.status(200).json({ 
      success: true,
      message: 'updated successfully!'
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});


export default app;

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
