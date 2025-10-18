import axios from "axios";
import {
  BASEURL,
  PlanCreateURL,
  SubscribeCmpyPlanURL,
} from "../../util/urls.js";
import dotenv from "dotenv";
import { getAppSecret } from "../../server.js";
dotenv.config();

export const CreatePlan = async (reqBody: any) => {
  const appSecret = await getAppSecret();
  
  try {
    const response: any = await axios.post(
      `${appSecret.api_url}${PlanCreateURL}`,
      reqBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${appSecret.api_token}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("Plan error", err);
  }
};

export const UpdatePlan = async (reqBody: any) => {
    const appSecret = await getAppSecret();

  try {
    const response: any = await axios.put(
      `${appSecret.api_url}${PlanCreateURL}/${reqBody?.name}`,
      reqBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${appSecret.api_token}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("Plan error", err);
  }
};

export const SubscribeCmpyPlan = async (reqBody: any) => {
      const appSecret = await getAppSecret();
  
  try {
    const response: any = await axios.put(
      `${appSecret.api_url}${SubscribeCmpyPlanURL}/${reqBody?.companyName}`,
      {
        "custom_subscribed_plan": reqBody?.planName
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${appSecret.api_token}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("Plan error", err);
  }
};
