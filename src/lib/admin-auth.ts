import "server-only";
import {currentUser,bootstrap,logout,equal} from "./auth";
export function credentialsAreValid(username:string,password:string){return Boolean(process.env.ADMIN_USERNAME&&process.env.ADMIN_PASSWORD&&equal(username,process.env.ADMIN_USERNAME)&&equal(password,process.env.ADMIN_PASSWORD));}
export async function createAdminSession(){await bootstrap();}
export async function verifyAdminSession(){return (await currentUser())?.role==="admin";}
export const deleteAdminSession=logout;
