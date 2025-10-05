import type { Request, Response } from "express";
import express from "express";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { subscriptionEmailTemp } from "../util/emailTemplate.js";
import { sendEmail } from "../services/emailSend.js";

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

// Store subscription data
router.post("/subscriptions", async (req: Request, res: Response) => {
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
  
      return res.status(201).json({
        success: true,
        message: "Subscription stored successfully",
        subscriptionId: result.insertedId,
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
  router.get("/subscriptions/:email", async (req: Request, res: Response) => {
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
  router.put(
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
  router.get("/subscriptions", async (req: Request, res: Response) => {
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

export default router;