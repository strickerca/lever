import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

const AnimationPlayground = dynamic(() => import("./PlaygroundClient"));

export default function PlaygroundPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <AnimationPlayground />;
}
