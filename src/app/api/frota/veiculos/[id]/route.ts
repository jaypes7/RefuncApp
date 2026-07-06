import { makeUpdateHandler, makeDeleteHandler } from "@/lib/frota-crud";
import { veiculosConfig } from "@/lib/frota-schemas";

export const PUT = makeUpdateHandler(veiculosConfig);
export const DELETE = makeDeleteHandler(veiculosConfig);
