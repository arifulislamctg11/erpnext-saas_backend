import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
import { getWelcomeEmailTemplate } from "../util/welcomeEmailTemplate.js";
import { sendEmail } from "../services/emailSend.js";
import {
  CreateCmpy,
  CreateEmployee,
  CreateUser,
  SetUserPermission,
  UpdateEmployee,
  UpdateUser,
} from "../services/users/users.serv.js";

dotenv.config();

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const router = express.Router();

router.get("/users", async (req: Request, res: Response) => {
  try {
    const { email } = req.query as { email?: string };
    if (!email) {
      return res.status(400).json({ success: false, error: "email required" });
    }

    const db = client.db("erpnext_saas");
    const users = db.collection("users");

    const user = await users.findOne(
      { email: String(email).toLowerCase() },
      { projection: { email: 1, role: 1, _id: 0 , isActive: 1} }
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

router.get("/customers", async (_req: Request, res: Response) => {
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
            date_established: 1,
          },
        },
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
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "latestSub",
          },
        },
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
            isActive: 1
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

router.post("/register", async (req: Request, res: Response) => {

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
      date_established,
    } = req.body;

    if (!email || !password || !companyName || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: email, password, companyName, firstName, lastName",
      });
    }

    const db = client.db("erpnext_saas");
    const users = db.collection("users");
    const profileComplete = db.collection("profilecompletes");

    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
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
      role: "user",
    });

    if (result.insertedId) {
      const cmpy_obj = {
        company_name: companyName,
        abbr: abbr,
        default_currency: currency,
        country: country,
        tax_id: tax_id,
        domain: domain,
        date_of_establishment: date_established
      };
      
      const cmpy_create = await CreateCmpy(cmpy_obj);

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
        gender: "Male",
        date_of_birth: "1990-05-10",
        date_of_joining: "2023-09-01",
        company: companyName,
        employment_type: "Full-time",
      };

      const exmployee_create = await CreateEmployee(employee_obj);

      const employee_updateobj = {
        user_id: email,
      };

      const exmployee_update = await UpdateEmployee(
        exmployee_create?.data?.name,
        employee_updateobj
      );

      const user_updateobj = {
        new_password: "My$ecureP@ssw0rd",
      };
      const user_update = await UpdateUser(email, user_updateobj);
      const setUserPermission = await SetUserPermission(email);

      const profileCompleteResult = await profileComplete.insertOne({
        Company_Creation: true,
        Company_Creation_prcnt: 25,
        User_Creation: true,
        User_Creation_prcnt: 25,
        Employee_Creation: true,
        Employee_Creation_prcnt: 25,
        Assignment_Creation: true,
        Assignment_Creation_prcnt: 25,
        email,
      });
      
      // Send welcome email after successful registration

      try {
        const welcomeEmailTemplate = getWelcomeEmailTemplate(firstName, companyName,email);
        await sendEmail(email, welcomeEmailTemplate.subject, welcomeEmailTemplate.email_Body);
      } catch (emailError) {
        console.error('Welcome email failed:', emailError);
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        userId: result.insertedId,
        user_update,
        setUserPermission,
        exmployee_update,
        exmployee_create,
        user_create,
        cmpy_create
      });
    } else {
      return res.status(201).json({
        success: true,
        message: "User registration failed",
      });
    }
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;


