export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, "Route not found"));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  let errors;
  if (error.code === 11000) {
    status = 409;
    message = 'This username or record already exists';
  } else if (error.name === "ValidationError") {
    status = 400;
    message = "Validation failed";
    errors = Object.fromEntries(Object.entries(error.errors).map(([field, detail]) => [field, detail.message]));
  } else if (error.name === "CastError") {
    status = 400;
    message = `Invalid value for ${error.path}`;
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Request body must contain valid JSON";
  }
  if (error.code === 20 || error.codeName === "IllegalOperation") {
    status = 503;
    message = "This operation requires MongoDB transaction support. Use Atlas or a replica set.";
  } else if (error.hasErrorLabel?.("TransientTransactionError") || error.hasErrorLabel?.("UnknownTransactionCommitResult")) {
    status = 503;
    message = "Transaction could not be confirmed. Reload the auction and bid history before retrying.";
  } else if (status >= 500) {
    console.error(error);
    message = "Internal server error";
  }
  res.status(status).json({ success: false, message, ...(errors && { errors }) });
}
