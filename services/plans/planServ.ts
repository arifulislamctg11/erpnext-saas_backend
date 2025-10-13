import axios from "axios";
import {
  BASEURL,
  PlanCreateURL,
  SubscribeCmpyPlanURL,
} from "../../util/urls.js";
import dotenv from "dotenv";
dotenv.config();

export const CreatePlan = async (reqBody: any) => {
  try {
    const response: any = await axios.post(
      `${BASEURL}${PlanCreateURL}`,
      reqBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${process.env.TOKEN}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("Plan error", err);
  }
};

export const UpdatePlan = async (reqBody: any) => {
  try {
    const response: any = await axios.put(
      `${BASEURL}${PlanCreateURL}/${reqBody?.name}`,
      reqBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${process.env.TOKEN}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("Plan error", err);
  }
};


export const SubscribeCmpyPlan = async (reqBody: any) => {
  try {
    const response: any = await axios.put(
      `${BASEURL}${SubscribeCmpyPlanURL}/${reqBody?.companyName}`,
      {
        "custom_subscribed_plan": reqBody?.planName
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${process.env.TOKEN}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("Plan error", err);
  }
};
