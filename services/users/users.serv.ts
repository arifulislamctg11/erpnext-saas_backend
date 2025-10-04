import axios from "axios";
import {
  BASEURL,
  CmpyCreateUrl,
  EmployeeCreateUrl,
  UserCreateUrl,
} from "../../util/urls.js";
import dotenv from "dotenv";
dotenv.config();

export const CreateCmpy = async (reqBody: any) => {
  try {
    const response: any = await axios.post(
      `${BASEURL}${CmpyCreateUrl}`,
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
    console.log("test erro", err);
  }
};

export const CreateUser = async (reqBody: any) => {
  try {
    const response: any = await axios.post(
      `${BASEURL}${UserCreateUrl}`,
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
    console.log("test erro", err);
  }
};

export const CreateEmployee = async (reqBody: any) => {
  try {
    const response: any = await axios.post(
      `${BASEURL}${EmployeeCreateUrl}`,
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
    console.log("test erro", err);
  }
};

export const UpdateEmployee = async (emp_id: any, reqBody: any) => {
  try {
    const response: any = await axios.put(
      `${BASEURL}${EmployeeCreateUrl}/${emp_id}`,
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
    console.log("test erro", err);
  }
};

export const UpdateUser = async (id: any, reqBody: any) => {
  try {
    const response: any = await axios.put(
      `${BASEURL}${UserCreateUrl}/${id}`,
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
    console.log("test erro", err);
  }
};

export const ResourceEmployee = async (companyName: any) => {
  try {
    const response: any = await axios.get(`${BASEURL}${EmployeeCreateUrl}?filters=[["company","=","${companyName}"]]&fields=["*"]`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${process.env.TOKEN}`,
      },
    });
    console.log("response", response?.data);
    return response?.data;
  } catch (err) {
    console.log("test erro", err);
  }
};
