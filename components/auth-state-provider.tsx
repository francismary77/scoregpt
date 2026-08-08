"use client";
import {createContext,useCallback,useContext,useEffect,useState} from "react";
import type {AuthState} from "@/modules/account/domain";
import {authService} from "@/modules/account/application";
const Context=createContext<{state:AuthState;refresh:()=>Promise<void>}>({state:{status:"checking"},refresh:async()=>{}});
export function AuthStateProvider({children,initialState}:{children:React.ReactNode;initialState?:AuthState}){const[state,setState]=useState<AuthState>(initialState??{status:"checking"});const refresh=useCallback(async()=>setState(await authService.getAuthState()),[]);useEffect(()=>{const subscription=authService.subscribe(()=>void refresh());if(!initialState)queueMicrotask(()=>void refresh());return()=>subscription?.unsubscribe()},[refresh,initialState]);return <Context.Provider value={{state,refresh}}>{children}</Context.Provider>}
export const useAuthState=()=>useContext(Context);
