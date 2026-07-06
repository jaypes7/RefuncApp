import { makeListHandler, makeCreateHandler } from "@/lib/frota-crud";
import { fornecedoresConfig } from "@/lib/frota-schemas";

export const GET = makeListHandler(fornecedoresConfig);
export const POST = makeCreateHandler(fornecedoresConfig);
