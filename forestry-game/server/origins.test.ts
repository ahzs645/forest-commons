import { expect, it } from "vitest";
import { allowedOrigin } from "./origins";
it("accepts exact configured frontend origins without granting suffix, wildcard or URL lookalikes", () => {
 const configured="https://example.github.io, https://forest.example.org";
 expect(allowedOrigin("https://example.github.io","backend.example.org",configured)).toBe(true);
 expect(allowedOrigin("https://backend.example.org","backend.example.org")).toBe(true);
 expect(allowedOrigin(undefined,"backend.example.org")).toBe(true);
 for(const origin of ["https://evil.example.github.io","https://example.github.io.evil.test","https://example.github.io/","https://example.github.io@evil.test","null","file://example.github.io"])
  expect(allowedOrigin(origin,"backend.example.org",configured)).toBe(false);
 expect(allowedOrigin("https://example.github.io","backend.example.org","*")).toBe(false);
});
