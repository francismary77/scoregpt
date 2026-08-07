export class ApplicationError extends Error { constructor(message: string, readonly code: string) { super(message); this.name = new.target.name; } }
export class NotFoundError extends ApplicationError { constructor(entity: string, id: string) { super(`${entity} '${id}' was not found.`, "NOT_FOUND"); } }
export class DataUnavailableError extends ApplicationError { constructor(message = "Football intelligence data is temporarily unavailable.") { super(message, "DATA_UNAVAILABLE"); } }
export class ProviderError extends ApplicationError { constructor(message: string) { super(message, "PROVIDER_ERROR"); } }
export class FeatureDisabledError extends ApplicationError { constructor(feature: string) { super(`${feature} is not enabled.`, "FEATURE_DISABLED"); } }
