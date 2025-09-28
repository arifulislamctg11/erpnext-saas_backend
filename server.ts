import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import type { Request, Response } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { GenerateOTP } from "./helper/generateOTP.js";
import { getOtpEmailTemplate } from "./util/emailTemplate.js";
import { sendEmail } from "./services/emailSend.js";
import { getSingleUser } from "./services/users/users.serv.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectMongo() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}
connectMongo();


const stripe1 = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});
app.use(cors({
  origin: ['http://localhost:8080','http://localhost:8081', 'https://innovatun-23ee3.web.app','https://innovatun-23ee3.firebaseapp.com'],
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
    const { priceId, customerEmail, planName, planAmount, successUrl, cancelUrl } = req.body || {};
    
    const session = await stripe1.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail || undefined,
      success_url: successUrl || "https://backend-ten-red-40.vercel.app/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl || "https://backend-ten-red-40.vercel.app/cancel",
      metadata: {
        planName: planName || '',
        planAmount: planAmount || '',
        priceId: priceId || ''
      }
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
        customerEmail: session.customer_email
      });
    } else {
      res.status(404).json({ error: 'Session data not found' });
    }
  } catch (error) {
    console.error('Error retrieving session data:', error);
    res.status(500).json({ error: 'Failed to retrieve session data' });
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

app.post("/register", async (req: Request, res: Response) => {
  try {
    const { 
      companyName, 
      username, 
      firstName, 
      lastName, 
      email, 
      password, 
      country, 
      currency, 
      abbr, 
      tax_id, 
      domain, 
      date_established 
    } = req.body;

    console.log('Registration attempt for:', email);
    console.log('Received data:', req.body);

    // Validate required fields
    if (!email || !password || !companyName || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields: email, password, companyName, firstName, lastName" 
      });
    }

    // Insert into MongoDB
    const db = client.db("erpnext_saas");
    const users = db.collection("users");

    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({ 
        success: false,
        error: "Email already registered" 
      });
    }

    const result = await users.insertOne({
      companyName,
      username,
      firstName,
      lastName,
      email,
      password, 
      country,
      currency,
      abbr,
      tax_id,
      domain,
      date_established,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      role: 'user'
    });

    console.log('User registered successfully:', result.insertedId);

    return res.status(201).json({ 
      success: true,
      message: "User registered successfully", 
      userId: result.insertedId 
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});


// Store subscription data
app.post("/subscriptions", async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      email, 
      planName, 
      priceId, 
      amount, 
      currency, 
      sessionId, 
      status, 
      subscriptionId,
      currentPeriodStart,
      currentPeriodEnd
    } = req.body;

    console.log('Storing subscription for:', email);

    // Validate required fields
    if (!email || !planName || !sessionId) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields: email, planName, sessionId" 
      });
    }

    const db = client.db("erpnext_saas");
    const subscriptions = db.collection("subscriptions");

    // Check if subscription already exists
    const existing = await subscriptions.findOne({ sessionId });
    if (existing) {
      return res.status(400).json({ 
        success: false,
        error: "Subscription already exists" 
      });
    }

    const subscriptionDoc = {
      userId,
      email,
      planName,
      priceId,
      amount,
      currency: currency || 'USD',
      sessionId,
      status: status || 'active',
      subscriptionId,
      currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await subscriptions.insertOne(subscriptionDoc);
    
    console.log('Subscription stored successfully:', result.insertedId);

    return res.status(201).json({ 
      success: true,
      message: "Subscription stored successfully", 
      subscriptionId: result.insertedId 
    });
  } catch (err) {
    console.error("Store subscription error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

// Get user subscriptions
app.get("/subscriptions/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: "Email is required" 
      });
    }

    const db = client.db("erpnext_saas");
    const subscriptions = db.collection("subscriptions");

    const userSubscriptions = await subscriptions
      .find({ email })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ 
      success: true,
      subscriptions: userSubscriptions 
    });
  } catch (err) {
    console.error("Get subscriptions error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

// Update subscription status
app.put("/subscriptions/:subscriptionId", async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { status, currentPeriodEnd } = req.body;

    const db = client.db("erpnext_saas");
    const subscriptions = db.collection("subscriptions");

    const updateData: { status: any; updatedAt: Date; currentPeriodEnd?: Date } = {
      status,
      updatedAt: new Date()
    };

    if (currentPeriodEnd) {
      updateData.currentPeriodEnd = new Date(currentPeriodEnd);
    }

    const result = await subscriptions.updateOne(
      { _id: new ObjectId(subscriptionId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Subscription not found" 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Subscription updated successfully" 
    });
  } catch (err) {
    console.error("Update subscription error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

//Forgot Password OTP Sending
app.post("/sendotp", async (req: Request, res: Response) => {
  try {
    const singleUser = await getSingleUser(`/resource/User/${req.body.email}`);
    return res.status(200).json({ 
      success: true,
      message: "Password Changed successfully" ,
      singleUser
    });
    const db = client.db("erpnext_saas");
    const temp_otp = db.collection("tempOtp");
    const users = db.collection("users");

    const isUserExists = await users.findOne({email: req.body.email});
    if(!isUserExists){
        return res.status(200).json({ 
        success: true,
        message: "User not registered with this email" ,
      });
    }

    const otp = GenerateOTP();

    const isTempOtpExist = await temp_otp.findOne({email: req.body.email});
    if(isTempOtpExist){
          const result = await temp_otp.updateOne(
          { email: req.body.email },
          { $set: {otp: otp} }
        );
    }else{
      const emailTemplate = getOtpEmailTemplate(otp);
      
      const emailSendRes = await sendEmail(req.body.email, emailTemplate.subject, emailTemplate.email_Body)
      const result = temp_otp.insertOne({email: req.body.email, otp})
    }

    return res.status(200).json({ 
      success: true,
      message: "OTP Send successfully" ,
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" ,
      err
    });
  }
});

app.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const {email, password, otp} : any= req.body
    const db = client.db("erpnext_saas");
    const temp_otp = db.collection("tempOtp");
    const users = db.collection("users");

    const isUserExists = await temp_otp.findOne({email: email});
    if(!isUserExists){
        return res.status(200).json({ 
        success: true,
        message: "User not registered with this email" ,
      });
    }
    const temOtpData = await temp_otp.findOne({email: email});

    if(temOtpData?.otp !== otp){
      return res.status(200).json({ 
        success: true,
        message: "OTP is Wrong" ,
      });
    }

    const result = await users.updateOne(
      { email: email},
      { $set: {password: password} }
    );

    return res.status(200).json({ 
      success: true,
      message: "Password Changed successfully" ,
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

//Current Plan
app.get("/current-plan", async (req: Request, res: Response) => {
  try {
    const {email} : any= req.query
    console.log('Hitted ====>', email)
    const db = client.db("erpnext_saas");
    const subscriptions = db.collection("subscriptions");

     const subscriptionData = await subscriptions.findOne(
      {
        email: email,
        status: 'active'
      },
      {
        sort: { createdAt: -1 } // descending order to get the latest
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
      data: subscriptionData
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