/**
 * Nothing, on purpose.
 *
 * `server-only` exists to make a build fail when a Client Component imports a
 * server module. That check belongs to the bundler and runs in `next build`;
 * under vitest the package resolves to its client entry point and throws at
 * collection, which would make every server-side module here untestable —
 * including the email frame, which is the most breakable HTML in this project
 * and the least visible when it breaks.
 *
 * `vitest.config.mts` points `server-only` at this file.
 */
export {};
