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

export const SetUserPermission = async (email:any) => {
  try {
    const userPermissionData = {
      "user": email,
      "allow": "User",
      "for_value": email,
      "apply_to_all_doctypes": 1
    }

    const userPermissionResponse: any = await axios.post(
      `${BASEURL}${UserPermissionUrl}`,
      userPermissionData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${process.env.TOKEN}`,
        },
      }
    );
    return userPermissionResponse?.data;
  } catch (err) {
    console.log("test erro", err);
  }
}

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

export const UserCmpyInfoCheck = async (filterValue: any) => {
  try {
    const response: any = await axios.get(`${BASEURL}${filterValue?.name == 'email' || filterValue?.name == 'username' ? UserInfoCheck : CmpyInfoCheck}?filters=[["${filterValue?.name}","=","${filterValue?.value}"]]`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${process.env.TOKEN}`,
      },
    });
    console.log("UserCmpyInfoCheck ===>", response?.data);
    return response?.data;
  } catch (err) {
    console.log("UserCmpyInfoCheck err", err);
  }
};


export const GetCountry = async () => {
  try {
    const response: any = await axios.get(`${BASEURL}${CountryURL}`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${process.env.TOKEN}`,
      },
    });
  
    return response?.data;
  } catch (err) {
    console.log("GetCountry err", err);
  }
};

export const GetCurrency = async () => {
  try {
    const response: any = await axios.get(`${BASEURL}/resource/Currency`, {
      headers: {
        accept: "application/json",
        Authorization: `token ${process.env.TOKEN}`,
      },
    });
  
    return response?.data;
  } catch (err) {
    console.log("GetCurrency err", err);
  }
};

export const GetUserSingle = async (email: any) => {
  try {
    const response: any = await axios.get(
      `${BASEURL}${UserCreateUrl}/${email}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${process.env.TOKEN}`,
        },
      }
    );
    return response?.data;
  } catch (err) {
    console.log("GetUserSingle erro", err);
  }
};

export const UpdateCmpy = async (reqBody: any, cmpyName: any) => {
  try {
    const response: any = await axios.put(
      `${BASEURL}${CmpyCreateUrl}/${cmpyName}`,
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
