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
  SetUserPermission,
  UpdateEmployee,
  UpdateUser,
  UserCmpyInfoCheck,
} from "./services/users/users.serv.js";
import { CreatePlan, SubscribeCmpyPlan, UpdatePlan } from "./services/plans/planServ.js";

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

const getStripeInst = async (): Promise<any> => {
    const db = client.db("erpnext_saas");
    const PlanCollection = db.collection("admin_secret");
    const result: any = await PlanCollection.find({}).toArray();

    return result[0].stripe_secret
}

const stripe1 = async() => {
  const secretKey = await getStripeInst()
  const  stripeData = new Stripe(secretKey as any, {
      apiVersion: "2025-08-27.basil",
  });
  return stripeData
}

app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "https://innovatun-23ee3.web.app",
      "https://innovatun-23ee3.firebaseapp.com",
      "https://innovatun-4d675.web.app"
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
    const stripe = await stripe1();
    const session = await stripe.checkout.sessions.create({
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
    const stripe = await stripe1();
    // Retrieve the Stripe session to get metadata
    const session = await stripe.checkout.sessions.retrieve(sessionId);

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
    const stripe = await stripe1()
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
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

app.get("/users", async (req: Request, res: Response) => {
  try {
    const { email } = req.query as { email?: string };
    if (!email) {
      return res.status(400).json({ success: false, error: "email required" });
    }

    const db = client.db("erpnext_saas");
    const users = db.collection("users");

    const user = await users.findOne(
      { email: String(email).toLowerCase() },
      { projection: { email: 1, role: 1, _id: 0 } }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("Get user error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});


app.get("/customers", async (req: Request, res: Response) => {
  try {
    const db = client.db("erpnext_saas");
    const users = db.collection("users");

    const customers = await users
      .aggregate([
        {
          $project: {
            _id: 0,
            email: 1,
            username: 1,
            firstName: 1,
            lastName: 1,
            companyName: 1,
            createdAt: 1,
            updatedAt: 1,
            isActive: 1,
            currency: 1,
            country: 1,
            tax_id: 1,
            domain: 1,
            abbr: 1,
            date_established: 1
          },
        },

        // Lookup latest subscription by email
        {
          $lookup: {
            from: "subscriptions",
            let: { userEmail: "$email" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$email", "$$userEmail"] },
                },
              },
              { $sort: { createdAt: -1 } }, // latest subscription first
              { $limit: 1 },
            ],
            as: "latestSub",
          },
        },

        // Flatten subscription fields
        {
          $addFields: {
            planName: {
              $ifNull: [{ $arrayElemAt: ["$latestSub.planName", 0] }, null],
            },
            planStatus: {
              $ifNull: [{ $arrayElemAt: ["$latestSub.status", 0] }, null],
            },
            planAmount: {
              $ifNull: [{ $arrayElemAt: ["$latestSub.amount", 0] }, null],
            },
          },
        },

        {
          $project: {
            email: 1,
            username: 1,
            firstName: 1,
            lastName: 1,
            companyName: 1,
            createdAt: 1,
            lastLogin: "$updatedAt",
            planName: 1,
            planAmount: 1,
            currency: 1,
            country: 1,
            tax_id: 1,
            domain: 1,
            abbr: 1,
            date_established: 1,
            status: {
              $ifNull: [
                "$planStatus",
                { $cond: [{ $eq: ["$isActive", true] }, "active", "inactive"] },
              ],
            },
          },
        },

        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      customers,
    });
  } catch (err) {
    console.error("Get customers error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// app.post("/register", async (req: Request, res: Response) => {
   
//   try {
//     const {
//       companyName,
//       username,
//       firstName,
//       lastName,
//       email,
//       password,
//       country,
//       currency,
//       abbr,
//       tax_id,
//       domain,
//       date_established,
//     } = req.body;

//     // Validate required fields
//     if (!email || !password || !companyName || !firstName || !lastName) {
//       return res.status(400).json({
//         success: false,
//         error:
//           "Missing required fields: email, password, companyName, firstName, lastName",
//       });
//     }

//     // Insert into MongoDB
//     const db = client.db("erpnext_saas");
//     const users = db.collection("users");
//     const profileComplete = db.collection("profilecompletes");

//     const existing = await users.findOne({ email });
//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         error: "Email already registered",
//       });
//     }

//     const result = await users.insertOne({
//       companyName,
//       username,
//       firstName,
//       lastName,
//       email,
//       password,
//       country,
//       currency,
//       abbr,
//       tax_id,
//       domain,
//       date_established,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//       isActive: true,
//       role: "user",
//     });


//     if (result.insertedId) {
//       const cmpy_obj = {
//         company_name: companyName,
//         abbr: abbr,
//         default_currency: currency,
//       };
//       const cmpy_create = await CreateCmpy(cmpy_obj);

//       const user_obj = {
//         email,
//         first_name: firstName,
//         last_name: lastName,
//         enabled: 1,
//       };
//       const user_create = await CreateUser(user_obj);

//       const employee_obj = {
//         employee_name: `${firstName} ${lastName}`,
//         first_name: firstName,
//         last_name: lastName,
//         gender: "Male",
//         date_of_birth: "1990-05-10",
//         date_of_joining: "2023-09-01",
//         company: companyName,
//         employment_type: "Full-time",
//       };
//       const exmployee_create = await CreateEmployee(employee_obj);

//       const employee_updateobj = {
//         user_id: email,
//       };
//       const exmployee_update = await UpdateEmployee(
//         exmployee_create?.data?.name,
//         employee_updateobj
//       );

//       const user_updateobj = {
//         new_password: "My$ecureP@ssw0rd",
//       };
//       const user_update = await UpdateUser(email, user_updateobj);
//       const setUserPermission =await SetUserPermission(email)
    



//       const profileCompleteResult = await profileComplete.insertOne({
//         Company_Creation: true,
//         Company_Creation_prcnt: 25,
//         User_Creation: true,
//         User_Creation_prcnt: 25,
//         Employee_Creation: true,
//         Employee_Creation_prcnt: 25,
//         Assignment_Creation: true,
//         Assignment_Creation_prcnt: 25,
//         email,
//       });

//       // Send welcome email after successful registration
//       try {
//         const welcomeEmailTemplate = getWelcomeEmailTemplate(firstName, companyName, email);
//         const emailSendRes = await sendEmail(email, welcomeEmailTemplate.subject, welcomeEmailTemplate.email_Body);
//         console.log('Welcome email sent:', emailSendRes);
//       } catch (emailError) {
//         console.error('Welcome email failed:', emailError);
//       }

//       return res.status(201).json({
//         success: true,
//         message: "User registered successfully",
//         userId: result.insertedId,
     
//       });
//     } else {
//       return res.status(201).json({
//         success: true,
//         message: "User registration failed",
//       });
//     }
//   } catch (err) {
//     console.error("Register error:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Internal server error",
//     });
//   }
// });

app.post("/testing",async (req:Request, res: Response)=>{
     const setUserPermission =await SetUserPermission("july@gmail.com");
   
console.log(setUserPermission);
res.send(setUserPermission)
})

app.post("/set-role", async (req: Request, res: Response) => {

  const { email, roles , blockRoles} = req.body;

  const update_user_roles = await UpdateUser(email, {roles: roles});
  const blockUserRoles = await UpdateUser(email, {block_modules: blockRoles});

  res.send({update_user_roles, blockUserRoles});
})


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
      currentPeriodEnd,
      companyName
    } = req.body;

    // Validate required fields
    if (!email || !planName || !sessionId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: email, planName, sessionId",
      });
    }

    const db = client.db("erpnext_saas");
    const subscriptions = db.collection("subscriptions");

    const existing = await subscriptions.findOne({ sessionId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Subscription already exists",
      });
    }

    const subscriptionDoc = {
      userId,
      email,
      planName,
      priceId,
      amount,
      currency: currency || "USD",
      sessionId,
      status: status || "active",
      subscriptionId,
      currentPeriodStart: currentPeriodStart
        ? new Date(currentPeriodStart)
        : new Date(),
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await subscriptions.insertOne(subscriptionDoc);

    const emailTemplate = subscriptionEmailTemp({
      currentPeriodStart: currentPeriodStart
        ? new Date(currentPeriodStart)
        : new Date(),
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      planName,
      amount,
    });
    const emailSendRes = await sendEmail(
      email,
      emailTemplate.subject,
      emailTemplate.email_Body
    );
    const subscribeCmpyPlan = await SubscribeCmpyPlan({companyName: companyName, planName: planName})
    return res.status(201).json({
      success: true,
      message: "Subscription stored successfully",
      subscriptionId: result.insertedId,
      subscribeCmpyPlan
    });
  } catch (err) {
    console.error("Store subscription error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
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
        error: "Email is required",
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
      subscriptions: userSubscriptions,
    });
  } catch (err) {
    console.error("Get subscriptions error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Update subscription status
app.put(
  "/subscriptions/:subscriptionId",
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const { status, currentPeriodEnd } = req.body;

      const db = client.db("erpnext_saas");
      const subscriptions = db.collection("subscriptions");

      const updateData: {
        status: any;
        updatedAt: Date;
        currentPeriodEnd?: Date;
      } = {
        status,
        updatedAt: new Date(),
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
          error: "Subscription not found",
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

// Get all subscriptions (admin) with filters
app.get("/subscriptions", async (req: Request, res: Response) => {
  try {
    const {
      status,          // "active" | "canceled" | etc.
      customer,        // matches email substring
      startDate,       // ISO string or yyyy-mm-dd
      endDate,         // ISO string or yyyy-mm-dd
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const db = client.db("erpnext_saas");
    const subscriptions = db.collection("subscriptions");

    const query: any = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (customer) {
      // since you store only email, filter against email
      query.email = { $regex: new RegExp(customer, "i") };
    }

    // date filter uses createdAt as the payment date surrogate
    if (startDate || endDate) {
      const createdAt: any = {};
      if (startDate) createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        // include the whole day when only a date is provided
        if (!endDate.includes("T")) end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }
      query.createdAt = createdAt;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      subscriptions.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      subscriptions.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      subscriptions: items,
    });
  } catch (err) {
    console.error("Admin list subscriptions error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

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
    const { email }: any = req.query

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
    const stripe = await stripe1()
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Plan creation failed',
      });
    }
    if (result) {
      const product = await stripe.products.create({
        name: req.body?.name,
        metadata: {
          features: JSON.stringify(req.body.features),
          access_roles: JSON.stringify(req.body.access_roles),
          accessItem: JSON.stringify(req.body.accessItem),
        }
      });

      // 2. Create the price (recurring)
      const price = await stripe.prices.create({
        unit_amount: Number(req.body?.price) * 100, // amount in cents
        currency: 'usd',
        recurring: { interval: 'month' },
        product: product.id,
      });

        const reqObj = {
              "name": req?.body?.name,
              "price": Number(req?.body?.price),
              "number_of_user": Number(req?.body?.accessItem?.numOfUser),
              "number_of_quotation": Number(req?.body?.accessItem?.numOfQoutation),
              "number_of_invoice": Number(req?.body?.accessItem?.numOfInvoice),
              "number_of_supplier": Number(req?.body?.accessItem?.numOfSupplier),
              "number_if_customer": Number(req?.body?.accessItem?.numOfCustomer),
            }

      const createErpPlan = await CreatePlan(reqObj);
      
       return res.status(200).json({
        success: true,
        message: 'Plan Created Successfully',
        createErpPlan
      });
    }
 
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err
    });
  }
});

app.get("/plans", async (req: Request, res: Response) => {
  try {

    const db = client.db("erpnext_saas");
    const PlanCollection = db.collection("plans");
    const result = await PlanCollection.find({}).toArray();
    const stripe = await stripe1()
    const products = await stripe.products.list({ limit: 100 });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No plans found',
      });
    }

    const productsWithPrices = await Promise.all(
      products.data.map(async (product: any) => {
        const prices: any = await stripe.prices.list({
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
      error: "Internal server error",
      err
    });
  }
});

app.get("/plans/:id", async (req: Request, res: Response) => {
  try {
    const { id }: any = req.params
    const db = client.db("erpnext_saas");
    const stripe = await stripe1()
    // const PlanCollection = db.collection("plans");

    // const result = await PlanCollection.findOne( { _id: new ObjectId(id) },)
    const result: any = await stripe.products.retrieve(id);
    const pr: any = await stripe.prices.list({
      product: id,
      limit: 100,
    });
    return res.status(200).json({
      success: true,
      data: { ...result, price: pr.data[0].unit_amount, features: JSON.parse(result?.metadata?.features), access_roles: result?.metadata?.access_roles ? JSON.parse(result?.metadata?.access_roles) : {}, accessItem: result?.metadata?.accessItem ? JSON.parse(result?.metadata?.accessItem) : {} }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      err
    });
  }
});

app.post("/update-plan", async (req: Request, res: Response) => {
  try {
    const { id, ...rest }: any = req.body

    const db = client.db("erpnext_saas");
    const PlanCollection = db.collection("plans");
    const stripe = await stripe1()
    // const result = await PlanCollection.updateOne(
    //   { _id: new ObjectId(_id)},
    //   { $set: rest }
    // );

    const updatedProduct = await stripe.products.update(id, {
      name: rest?.name,
      metadata: {
        features: JSON.stringify(rest.features),
         access_roles: JSON.stringify(req.body.access_roles),
         accessItem: JSON.stringify(req.body.accessItem),
      }
    });

    const newPrice = await stripe.prices.create({
      unit_amount: Number(rest?.price),
      currency: 'usd',
      recurring: { interval: 'month' },
      product: id,
    });

      const reqObj = {
        "name": req?.body?.name,
        "price": Number(req?.body?.price),
        "number_of_user": Number(req?.body?.accessItem?.numOfUser),
        "number_of_quotation": Number(req?.body?.accessItem?.numOfQoutation),
        "number_of_invoice": Number(req?.body?.accessItem?.numOfInvoice),
        "number_of_supplier": Number(req?.body?.accessItem?.numOfSupplier),
        "number_if_customer": Number(req?.body?.accessItem?.numOfCustomer),
      }

      const updateErpPlan = await UpdatePlan(reqObj);

    return res.status(200).json({
      success: true,
      message: 'updated successfully!',
      updateErpPlan
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err
    });
  }
});

app.post("/create-user-and-employee", async (req: Request, res: Response) => {

  const {
    firstName,
    lastName,
    email,
    companyName,
    dateOfBirth,
    joiningDate,
    password,
    gender
  } = req.body;

  try {
    const db = client.db("erpnext_saas");
    const users = db.collection("users");

    const existing = await users.findOne({ email });
    if (!existing) {
      const user_obj = {
        email,
        first_name: firstName,
        last_name: lastName,
        enabled: 1,
      };
      const user_create = await CreateUser(user_obj);
      const employee_obj = {
        employee_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        gender,
        date_of_birth: dateOfBirth,
        date_of_joining: joiningDate,
        company: companyName,
        employment_type: "Full-time",
      };
      console.log("01", employee_obj);
      const exmployee_create = await CreateEmployee(employee_obj);
      console.log("03", exmployee_create);

      const employee_updateobj = {
        user_id: email,
      };
      const exmployee_update = await UpdateEmployee(
        exmployee_create?.data?.name,
        employee_updateobj
      );

      const user_updateobj = {
        new_password: password,
      };
      const user_update = await UpdateUser(email, user_updateobj);
    
       const setUserPermission =await SetUserPermission(email)
         console.log("02",setUserPermission);

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        user_update,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });
    }


  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.get("/home-plans", async (req: Request, res: Response) => {
  try {

    const db = client.db("erpnext_saas");
    const PlanCollection = db.collection("plans");
    const stripe = await stripe1()
    const products = await stripe.products.list({ limit: 100 });

    const productsWithPrices = await Promise.all(
      products.data.map(async (product: any) => {
        const prices: any = await stripe.prices.list({
          product: product.id,
          limit: 100,
        });

        return {
          ...product,
          price: prices.data[0],
          features: JSON.parse(product?.metadata?.features),
          access_roles: JSON.parse(product?.metadata?.access_roles),
          accessItem: product?.metadata?.accessItem ? JSON.parse(product?.metadata?.accessItem) : {},
        };
      })
    );
    return res.status(200).json({
      success: true,
      products: productsWithPrices
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      err
    });
  }
});

app.get("/admin-secret", async (req: Request, res: Response) => {
  try {

    const db = client.db("erpnext_saas");
    const SecretCollection = db.collection("admin_secret");
    const result = await SecretCollection.find({}).toArray();

    return res.status(200).json({
      success: true,
      result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      err
    });
  }
});

// async function fetchSubscriptionsByPage(page = 1) {
//   const limit = 100;
//   let startingAfter = null;

//   // If requesting page 1, fetch directly
//   if (page === 1) {
//     const response = await stripe1.subscriptions.list({ limit });
//     return response.data;
//   }

//   // Get the correct starting point by iterating to the (page - 1) * limit
//   let allItems: any = [];
//   let hasMore = true;

//   while (hasMore && allItems.length < (page - 1) * limit) {
//     const response: any = await stripe1.subscriptions.list({
//       limit,
//       ...(startingAfter && { starting_after: startingAfter }),
//     });

//     allItems = allItems.concat(response.data);
//     hasMore = response.has_more;

//     if (hasMore) {
//       startingAfter = response.data[response.data.length - 1].id;
//     }
//   }

//   // Now fetch the actual page
//   const pageResponse = await stripe1.subscriptions.list({
//     limit,
//     ...(startingAfter && { starting_after: startingAfter }),
//   });

//   return pageResponse.data;
// }

app.get("/stripe-subscription", async (req: Request, res: Response) => {
  try {
    const { page }: any = req.query
    const pageNo: any = parseInt(page) || 1;
    const stripe = await stripe1()
    // const subscriptions = await fetchSubscriptionsByPage(pageNo);
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        expand: ['data.customer', 'data.plan.product', 'data.latest_invoice.payment_intent' ], // This expands the customer field in each subscription
      });

    return res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      err
    });
  }
});

app.post("/user-cmpyinfo-check", async (req: Request, res: Response) => {
  try {
    const filter = req.body
    console.log('filter ===>', filter)
    const userCmpyInfo = await UserCmpyInfoCheck(filter);

    return res.status(200).json({
      success: true,
      userCmpyInfo
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      err
    });
  }
});

app.post("/update-admin-secret", async (req: Request, res: Response) => {
  try {
    const { _id, ...rest }: any = req.body

    const db = client.db("erpnext_saas");
    const SecretCollection = db.collection("admin_secret");

    const result = await SecretCollection.updateOne(
      { _id: new ObjectId(_id)},
      { $set: rest }
    );

    return res.status(200).json({
      success: true,
      message: 'updated successfully!'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err
    });
  }
});


export default app;

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
