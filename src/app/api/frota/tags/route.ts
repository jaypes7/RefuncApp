import { makeListHandler, makeCreateHandler } from "@/lib/frota-crud";
import { tagsConfig } from "@/lib/frota-schemas";

export const GET = makeListHandler(tagsConfig);
export const POST = makeCreateHandler(tagsConfig);
