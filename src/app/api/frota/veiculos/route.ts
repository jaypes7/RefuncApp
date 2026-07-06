import { makeListHandler, makeCreateHandler } from "@/lib/frota-crud";
import { veiculosConfig } from "@/lib/frota-schemas";

export const GET = makeListHandler(veiculosConfig);
export const POST = makeCreateHandler(veiculosConfig);
