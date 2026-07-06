import { makeListHandler, makeCreateHandler } from "@/lib/frota-crud";
import { manutencoesConfig } from "@/lib/frota-schemas";

export const GET = makeListHandler(manutencoesConfig);
export const POST = makeCreateHandler(manutencoesConfig);
