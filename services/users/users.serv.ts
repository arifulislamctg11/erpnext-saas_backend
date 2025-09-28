import axios from "axios";
import { BASEURL } from "../../util/urls.js";


export const getSingleUser = async (url: any, ) => {
   try{
     const response: any = await axios.get(`${BASEURL}${url}`, {
        headers: {
        'Content-Type': 'application/json',
        'Authorization': 'token fcfd1baff1e2b85:b983b4130054f87'
        }
    })
    const formatedRes = await response
    return formatedRes;
   }catch(err) {
    console.log('test erro', err)
   }
}

