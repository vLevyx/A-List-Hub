export async function withTimeout<T>(
  promiseOrBuilder: Promise<T> | PromiseLike<T>,
  ms = 20000,
  errorMessage = "Request timed out"
): Promise<T> {
  // Convert to a proper Promise
  const promise = Promise.resolve(promiseOrBuilder);
  
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );

  return Promise.race([promise, timeout]);
}