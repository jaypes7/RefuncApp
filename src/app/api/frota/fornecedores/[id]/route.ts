import { makeUpdateHandler, makeDeleteHandler } from "@/lib/frota-crud";
import { fornecedoresConfig } from "@/lib/frota-schemas";

export const PUT = makeUpdateHandler(fornecedoresConfig);
export const DELETE = makeDeleteHandler(fornecedoresConfig);
