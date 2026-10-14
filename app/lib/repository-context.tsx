'use client';
import {createContext,useContext,useMemo} from 'react';
import {legacySession,type Session} from './profile-store';
import {repository} from './repository';
export const RepositoryContext=createContext<Session>(legacySession);
export function useRepository(){const session=useContext(RepositoryContext);return useMemo(()=>repository(session),[session]);}
