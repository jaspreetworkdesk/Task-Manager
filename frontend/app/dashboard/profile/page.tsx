"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { getUserDetail, updateUser } from "@/services/userService";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";

type Errors = { name?:string; email?:string; password?:string; password_confirmation?:string };
type DetailResponse = { user?: { name?:string; email?:string }; employee?: { user?: { name?:string; email?:string } } | null };

export default function ProfilePage(){
  const[name,setName]=useState("");const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[confirmation,setConfirmation]=useState("");const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[errors,setErrors]=useState<Errors>({});
  const load=useCallback(async()=>{try{setLoading(true);const r=await getUserDetail();const data=r.data as DetailResponse;setName(data.employee?.user?.name||data.user?.name||"");setEmail(data.employee?.user?.email||data.user?.email||"")}catch{await Swal.fire("Error","Could not load your profile.","error")}finally{setLoading(false)}},[]);
  useEffect(()=>{load()},[load]);
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const next:Errors={};if(!name.trim())next.name="Name is required.";if(!/^\S+@\S+\.\S+$/.test(email.trim()))next.email="Enter a valid email address.";if(password&&password.length<8)next.password="Use at least 8 characters.";if(password&&password!==confirmation)next.password_confirmation="Passwords do not match.";setErrors(next);if(Object.keys(next).length)return;try{setSaving(true);const r=await updateUser({name:name.trim(),email:email.trim(),password:password||undefined,password_confirmation:password?confirmation:undefined});const updated=r.data?.user;if(updated){localStorage.setItem("user",JSON.stringify(updated))}setPassword("");setConfirmation("");await Swal.fire("Saved","Your profile has been updated.","success")}catch(err:unknown){if(axios.isAxiosError(err)&&err.response?.status===422){const be=err.response.data?.errors||{};setErrors({name:be.name?.[0],email:be.email?.[0],password:be.password?.[0],password_confirmation:be.password_confirmation?.[0]});return}await Swal.fire("Error",axios.isAxiosError(err)?(err.response?.data?.message||"Could not update your profile."):"Could not update your profile.","error")}finally{setSaving(false)}};
  if(loading)return <div className="dashboard-panel">Loading profile...</div>;
  return <div style={{maxWidth:760}} className="space-y-6"><div className="dashboard-hero"><div><div className="dashboard-eyebrow">Account</div><h1>My profile</h1><p>Keep your sign-in details current. Leave the password fields blank if you do not want to change it.</p></div></div><form onSubmit={submit} className="dashboard-panel space-y-5"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormInput label="Full name" value={name} error={errors.name} onChange={setName}/><FormInput label="Email address" type="email" value={email} error={errors.email} onChange={setEmail}/></div><div style={{borderTop:"1px solid #e7eaf0",paddingTop:20}}><h2 style={{fontSize:14,margin:"0 0 4px"}}>Change password</h2><div className="panel-caption" style={{marginBottom:14}}>Optional. Use at least 8 characters.</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormInput label="New password" type="password" value={password} error={errors.password} onChange={setPassword}/><FormInput label="Confirm password" type="password" value={confirmation} error={errors.password_confirmation} onChange={setConfirmation}/></div></div><Button type="submit" loading={saving}>Save changes</Button></form></div>
}
