'use client';
import {useEffect,useState} from 'react';
export type Page='home'|'records'|'projects'|'evidence'|'reviews'|'settings'|'help'|'followups'|'tasks'|'trash';
export type Route={page:Page;params:Record<string,string>};
const pages=['home','records','projects','evidence','reviews','settings','help','followups','tasks','trash'];
export function readRoute():Route{const [path,query]=location.hash.replace(/^#\/?/,'').split('?');return {page:(pages.includes(path)?path:'home') as Page,params:Object.fromEntries(new URLSearchParams(query))};}
export default function useRoute(){const [route,setRoute]=useState<Route>({page:'home',params:{}});useEffect(()=>{const update=()=>{setRoute(readRoute());window.scrollTo(0,0);};update();window.addEventListener('popstate',update);window.addEventListener('hashchange',update);return()=>{window.removeEventListener('popstate',update);window.removeEventListener('hashchange',update);};},[]);function navigate(page:Page,params:Record<string,string>={},replace=false){const query=new URLSearchParams(Object.entries(params).filter(([,v])=>!!v)).toString();history[replace?'replaceState':'pushState'](null,'',`#/${page}${query?'?'+query:''}`);setRoute({page,params});if(!replace)window.scrollTo(0,0);}
 return {route,navigate,filter:(params:Record<string,string>)=>navigate(route.page,{...route.params,...params},true)};
}
