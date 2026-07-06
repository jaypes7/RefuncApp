import { makeUpdateHandler, makeDeleteHandler } from "@/lib/frota-crud";
import { cartoesConfig } from "@/lib/frota-schemas";

export const PUT = makeUpdateHandler(cartoesConfig);
export const DELETE = makeDeleteHandler(cartoesConfig);
