import axios from "axios";
import {
  BASEURL,
  CmpyCreateUrl,
  CmpyInfoCheck,
  CountryURL,
  EmployeeCreateUrl,
  UserCreateUrl,
  UserInfoCheck,
  UserPermissionUrl,
} from "../../util/urls.js";
import dotenv from "dotenv";
import { getAppSecret } from "../../server.js";
dotenv.config();

export const CreateCmpy = async (reqBody: any) => {
  const appSecret = await getAppSecret();

  try {
    const response: any = await axios.post(
      `${appSecret.api_url}${CmpyCreateUrl}`,
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
    console.log("test erro", err);
  }
};

export const CreateUser = async (reqBody: any) => {
  const appSecret = await getAppSecret();

  try {
    const response: any = await axios.post(
      `${appSecret.api_url}${UserCreateUrl}`,
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
    console.log("test erro", err);
  }
};

export const SetUserPermission = async (email:any) => {
  const appSecret = await getAppSecret();

  try {
    const userPermissionData = {
      "user": email,
      "allow": "User",
      "for_value": email,
      "apply_to_all_doctypes": 1
    }

    const userPermissionResponse: any = await axios.post(
      `${appSecret.api_url}${UserPermissionUrl}`,
      userPermissionData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${appSecret.api_token}`,
        },
      }
    );
    return userPermissionResponse?.data;
  } catch (err) {
    console.log("test erro", err);
  }
}

export const CreateEmployee = async (reqBody: any) => {
  const appSecret = await getAppSecret();

  try {
    const response: any = await axios.post(
      `${appSecret.api_url}${EmployeeCreateUrl}`,
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
    console.log("test erro", err);
  }
};

export const UpdateEmployee = async (emp_id: any, reqBody: any) => {
  const appSecret = await getAppSecret();

  try {
    const response: any = await axios.put(
      `${appSecret.api_url}${EmployeeCreateUrl}/${emp_id}`,
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
    console.log("test erro", err);
  }
};

export const UpdateUser = async (id: any, reqBody: any) => {
  const appSecret = await getAppSecret();

  try {
    const response: any = await axios.put(
      `${appSecret.api_url}${UserCreateUrl}/${id}`,
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
    console.log("test erro", err);
  }
};

export const ResourceEmployee = async (companyName: any) => {
  const appSecret = await getAppSecret();

  try {
    const response: any = await axios.get(`${appSecret.api_url}${EmployeeCreateUrl}?filters=[["company","=","${companyName}"]]&fields=["*"]`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${appSecret.api_token}`,
      },
    });
    console.log("response", response?.data);
    return response?.data;
  } catch (err) {
    console.log("test erro", err);
  }
};

export const UserCmpyInfoCheck = async (filterValue: any) => {
  const appSecret = await getAppSecret();
  try {
    const response: any = await axios.get(`${appSecret.api_url}${filterValue?.name == 'email' || filterValue?.name == 'username' ? UserInfoCheck : CmpyInfoCheck}?filters=[["${filterValue?.name}","=","${filterValue?.value}"]]`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${appSecret.api_token}`,
      },
    });
    console.log("UserCmpyInfoCheck ===>", response?.data);
    return response?.data;
  } catch (err) {
    console.log("UserCmpyInfoCheck err", err);
  }
};

export const GetCountry = async () => {
  const appSecret = await getAppSecret();
  try {
    const response: any = await axios.get(`${appSecret.api_url}${CountryURL}`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${appSecret.api_token}`,
      },
    });
  
    return response?.data;
  } catch (err) {
    console.log("GetCountry err", err);
  }
};

export const GetCurrency = async () => {
    const appSecret = await getAppSecret();
  try {
    const response: any = await axios.get(`${appSecret.api_url}/resource/Currency?limit_page_length=500`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${appSecret.api_token}`,
      },
    });
  
    return response?.data;
  } catch (err) {
    console.log("GetCurrency err", err);
  }
};

export const GetUserSingle = async (email: any) => {
      const appSecret = await getAppSecret();

  try {
    const response: any = await axios.get(
      `${appSecret.api_url}${UserCreateUrl}/${email}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${appSecret.api_token}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("GetUserSingle erro", err);
  }
};

export const UpdateCmpy = async (reqBody: any, cmpyName: any) => {
        const appSecret = await getAppSecret();
  try {
    const response: any = await axios.put(
      `${appSecret.api_url}${CmpyCreateUrl}/${cmpyName}`,
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
    console.log("test erro", err);
  }
};

export const GetUserEmployee = async (email: any) => {
      const appSecret = await getAppSecret();

  try {
    const response: any = await axios.get(
      `${appSecret.api_url}${EmployeeCreateUrl}/${email}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${appSecret.api_token}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("GetUserSingle erro", err);
  }
};