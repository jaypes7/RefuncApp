import { makeListHandler, makeCreateHandler } from "@/lib/frota-crud";
import { cartoesConfig } from "@/lib/frota-schemas";

export const GET = makeListHandler(cartoesConfig);
export const POST = makeCreateHandler(cartoesConfig);
