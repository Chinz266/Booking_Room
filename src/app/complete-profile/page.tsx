import {redirect} from "next/navigation";
import {pendingGoogleIdentity} from "@/lib/google-auth";
import {GoogleProfileForm} from "@/components/google-profile-form";
export default async function Page(){const identity=await pendingGoogleIdentity();if(!identity)redirect("/login");return <main className="shell page-content"><GoogleProfileForm name={identity.name} email={identity.email}/></main>;}
