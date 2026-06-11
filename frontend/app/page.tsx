"use client";
import { useRouter } from "next/navigation";
import { Landing } from "../components/shale/screens/Landing";

export default function Page() {
  const r = useRouter();
  return <Landing onLaunch={() => r.push("/app")} />;
}
