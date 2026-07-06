import { makeUpdateHandler, makeDeleteHandler } from "@/lib/frota-crud";
import { prestadoresConfig } from "@/lib/frota-schemas";

export const PUT = makeUpdateHandler(prestadoresConfig);
export const DELETE = makeDeleteHandler(prestadoresConfig);
