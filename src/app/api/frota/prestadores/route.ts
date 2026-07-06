import { makeListHandler, makeCreateHandler } from "@/lib/frota-crud";
import { prestadoresConfig } from "@/lib/frota-schemas";

export const GET = makeListHandler(prestadoresConfig);
export const POST = makeCreateHandler(prestadoresConfig);
