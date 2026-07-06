import { makeUpdateHandler, makeDeleteHandler } from "@/lib/frota-crud";
import { tagsConfig } from "@/lib/frota-schemas";

export const PUT = makeUpdateHandler(tagsConfig);
export const DELETE = makeDeleteHandler(tagsConfig);
