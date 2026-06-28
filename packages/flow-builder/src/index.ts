/**
 * `@allma/flow-builder` — author Allma flow definitions in TypeScript with
 * compile-time type safety, refactor-safe references, a strict build-time
 * validation gate, and a deterministic JSON artifact.
 */

export { defineFlow, STABLE_EXPORTED_AT } from './define-flow.js';
export type { FlowBuilder, DefineFlowOptions } from './define-flow.js';

export { Flow } from './flow-class.js';

export { jp } from './jp.js';
export type { JsonPath, Comparable, Jp } from './jp.js';

export type { StepDraft, StepRef, OnErrorInput, Checkpoint, Position } from './step.js';

export * from './factories.js';

export { deployVar, ALLOWED_DEPLOY_TOKENS, scanForMisplacedTokens } from './deploy-var.js';
export type { DeployVar, AllowedDeployToken, TokenIssue } from './deploy-var.js';

export { external, isExternal } from './external.js';

export {
  definePrompt,
  defineStep,
  defineMcpConnection,
  STABLE_TIMESTAMP,
} from './artifacts.js';
export type {
  DefinedArtifact,
  DefinedPrompt,
  DefinedStepDefinition,
  DefinedMcpConnection,
  PromptInput,
  McpConnectionInput,
  StepDefinitionMeta,
} from './artifacts.js';

export { refId } from './refs.js';
export type { PromptRef, FlowRef, StepDefRef, McpConnectionRef, AnyArtifactRef } from './refs.js';

export { flowContext } from './typed-context.js';
export type { TypedJp, ContextPaths } from './typed-context.js';

export { FlowBuildError, ArtifactBuildError } from './validate.js';

export { stableStringify, sortKeysDeep } from './serialize.js';

export { collectFlowReferences, resolveReferences } from './catalog.js';
export type { Catalog, ArtifactReference, ReferenceKind, ResolutionIssue } from './catalog.js';

export { ejectFlow, flowToBuilderSpec, renderBuilderSource } from './eject.js';
export type { EjectOptions, BuilderSpec } from './eject.js';

export { detectDrift } from './drift.js';
export type { DriftIssue, LocalCodeFlow, DeployedFlow, FetchDeployed } from './drift.js';

export { planDeploy, executeDeploy } from './deploy.js';
export type {
  DeployOptions,
  DeployPlan,
  DeployAdapter,
  DeployResult,
  PublishTarget,
  ImportResultSummary,
  ImportItemError,
} from './deploy.js';
