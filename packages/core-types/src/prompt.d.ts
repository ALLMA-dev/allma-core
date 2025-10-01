import { z } from 'zod';
export declare const PromptTemplateTypeEnum: z.ZodEnum<["LLM1_QUERY_ANALYSIS", "LLM2_SYSTEM", "LLM3_REFINEMENT", "DATA_COLLECTION_EXTRACTION", "ADMIN_TAG_GENERATION", "ADMIN_DOC_RELEVANCY_SCORING"]>;
export type PromptTemplateType = z.infer<typeof PromptTemplateTypeEnum>;
export declare const PromptTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    type: z.ZodEnum<["LLM1_QUERY_ANALYSIS", "LLM2_SYSTEM", "LLM3_REFINEMENT", "DATA_COLLECTION_EXTRACTION", "ADMIN_TAG_GENERATION", "ADMIN_DOC_RELEVANCY_SCORING"]>;
    version: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    type: "DATA_COLLECTION_EXTRACTION" | "LLM1_QUERY_ANALYSIS" | "LLM2_SYSTEM" | "LLM3_REFINEMENT" | "ADMIN_TAG_GENERATION" | "ADMIN_DOC_RELEVANCY_SCORING";
    content: string;
    version: number;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
}, {
    id: string;
    name: string;
    type: "DATA_COLLECTION_EXTRACTION" | "LLM1_QUERY_ANALYSIS" | "LLM2_SYSTEM" | "LLM3_REFINEMENT" | "ADMIN_TAG_GENERATION" | "ADMIN_DOC_RELEVANCY_SCORING";
    content: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
    version?: number | undefined;
}>;
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;
export declare const CreatePromptTemplateInputSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    type: z.ZodEnum<["LLM1_QUERY_ANALYSIS", "LLM2_SYSTEM", "LLM3_REFINEMENT", "DATA_COLLECTION_EXTRACTION", "ADMIN_TAG_GENERATION", "ADMIN_DOC_RELEVANCY_SCORING"]>;
    version: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "id" | "createdAt" | "updatedAt"> & {
    id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "DATA_COLLECTION_EXTRACTION" | "LLM1_QUERY_ANALYSIS" | "LLM2_SYSTEM" | "LLM3_REFINEMENT" | "ADMIN_TAG_GENERATION" | "ADMIN_DOC_RELEVANCY_SCORING";
    content: string;
    version: number;
    id?: string | undefined;
    description?: string | undefined;
}, {
    name: string;
    type: "DATA_COLLECTION_EXTRACTION" | "LLM1_QUERY_ANALYSIS" | "LLM2_SYSTEM" | "LLM3_REFINEMENT" | "ADMIN_TAG_GENERATION" | "ADMIN_DOC_RELEVANCY_SCORING";
    content: string;
    id?: string | undefined;
    description?: string | undefined;
    version?: number | undefined;
}>;
export type CreatePromptTemplateInput = z.infer<typeof CreatePromptTemplateInputSchema>;
export declare const UpdatePromptTemplateInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    content: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["LLM1_QUERY_ANALYSIS", "LLM2_SYSTEM", "LLM3_REFINEMENT", "DATA_COLLECTION_EXTRACTION", "ADMIN_TAG_GENERATION", "ADMIN_DOC_RELEVANCY_SCORING"]>>;
    version: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    createdAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    type?: "DATA_COLLECTION_EXTRACTION" | "LLM1_QUERY_ANALYSIS" | "LLM2_SYSTEM" | "LLM3_REFINEMENT" | "ADMIN_TAG_GENERATION" | "ADMIN_DOC_RELEVANCY_SCORING" | undefined;
    description?: string | undefined;
    content?: string | undefined;
    version?: number | undefined;
}, {
    id: string;
    name?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    type?: "DATA_COLLECTION_EXTRACTION" | "LLM1_QUERY_ANALYSIS" | "LLM2_SYSTEM" | "LLM3_REFINEMENT" | "ADMIN_TAG_GENERATION" | "ADMIN_DOC_RELEVANCY_SCORING" | undefined;
    description?: string | undefined;
    content?: string | undefined;
    version?: number | undefined;
}>;
export type UpdatePromptTemplateInput = z.infer<typeof UpdatePromptTemplateInputSchema>;
//# sourceMappingURL=prompt.d.ts.map