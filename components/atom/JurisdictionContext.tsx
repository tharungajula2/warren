"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

export type ActiveJurisdiction = "universal" | "IN" | "UK" | "EU" | "US" | "all";

interface JurisdictionContextType {
  jurisdiction: ActiveJurisdiction;
  setJurisdiction: (jur: ActiveJurisdiction) => void;
}

const JurisdictionContext = createContext<JurisdictionContextType>({
  jurisdiction: "universal",
  setJurisdiction: () => {},
});

const COOKIE_NAME = "warren_jurisdiction";

export function JurisdictionProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdictionState] = useState<ActiveJurisdiction>("universal");

  useEffect(() => {
    const saved = Cookies.get(COOKIE_NAME) as ActiveJurisdiction;
    if (saved && ["universal", "IN", "UK", "EU", "US", "all"].includes(saved)) {
      setJurisdictionState(saved);
    }
  }, []);

  const setJurisdiction = (jur: ActiveJurisdiction) => {
    setJurisdictionState(jur);
    Cookies.set(COOKIE_NAME, jur, { expires: 365, path: "/" });
  };

  return (
    <JurisdictionContext.Provider value={{ jurisdiction, setJurisdiction }}>
      {children}
    </JurisdictionContext.Provider>
  );
}

export function useJurisdiction() {
  return useContext(JurisdictionContext);
}
