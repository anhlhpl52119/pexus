import type { AppRPC } from "@shared/rpc";
import { Electroview } from "electrobun/view";

let electroview: ReturnType<typeof setupElectroview>;

export function setupElectroview() {
  const rpc = Electroview.defineRPC<AppRPC>({
    maxRequestTime: 120_000,
    handlers: {
      messages: {
        agentEvent: () => {},
      },
    },
  });
  return new Electroview({ rpc });
}

function getElectroView() {
  if (electroview?.rpc?.request) {
    return electroview;
  }
  return setupElectroview();
}

export const rpcRequest = getElectroView();
