export function createGreeting(runtime: string = "TypeScript"): string {
  return `hello from ${runtime}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(createGreeting());
}
