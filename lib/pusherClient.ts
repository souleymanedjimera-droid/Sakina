import PusherClient from "pusher-js";

let instance: PusherClient | null = null;

export function getPusherClient() {
  if (!instance) {
    instance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY ?? "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      authEndpoint: "/api/pusher/auth",
    });
  }
  return instance;
}
