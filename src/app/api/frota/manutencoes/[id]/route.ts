import { makeUpdateHandler, makeDeleteHandler } from "@/lib/frota-crud";
import { manutencoesConfig } from "@/lib/frota-schemas";

export const PUT = makeUpdateHandler(manutencoesConfig);
export const DELETE = makeDeleteHandler(manutencoesConfig);
