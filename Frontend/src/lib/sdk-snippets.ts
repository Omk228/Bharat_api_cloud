import { BASE_URL, resolvePath, type ApiEndpoint } from "./api-catalog";

export const LANGUAGES = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "php", label: "PHP" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const INSTALL_COMMANDS: Record<LanguageId, string> = {
  curl: "# cURL ships with macOS and most Linux distros\ncurl --version",
  node: "npm install @verokyc/sdk\n# or\npnpm add @verokyc/sdk",
  python: "pip install verokyc",
  go: "go get github.com/verokyc/verokyc-go",
  java: `<dependency>
  <groupId>io.verokyc</groupId>
  <artifactId>verokyc-java</artifactId>
  <version>2.4.0</version>
</dependency>`,
  php: "composer require verokyc/verokyc-php",
};

function pathValues(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) out[k] = String(v);
  return out;
}

function urlFor(endpoint: ApiEndpoint, input: Record<string, unknown>): string {
  const values = pathValues(input);
  const path = resolvePath(endpoint.path, values);
  const placeholders = [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const query = Object.entries(values).filter(([k]) => !placeholders.includes(k));
  const qs = query.length
    ? "?" + query.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
    : "";
  return `${BASE_URL}${path}${qs}`;
}

function jsonBody(endpoint: ApiEndpoint, input: Record<string, unknown>): string | null {
  if (endpoint.method === "GET") return null;
  const placeholders = [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const body = Object.fromEntries(Object.entries(input).filter(([k]) => !placeholders.includes(k)));
  return JSON.stringify(body, null, 2);
}

function sdkMethodName(endpoint: ApiEndpoint): string {
  return endpoint.id.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

function snakeMethodName(endpoint: ApiEndpoint): string {
  return endpoint.id.replace(/-/g, "_");
}

export function generateSnippet(
  lang: LanguageId,
  endpoint: ApiEndpoint,
  input: Record<string, unknown>,
  apiKey = "sk_test_YOUR_KEY",
): string {
  const url = urlFor(endpoint, input);
  const body = jsonBody(endpoint, input);
  const method = endpoint.method;

  switch (lang) {
    case "curl":
      return [
        `curl -X ${method} "${url}" \\`,
        `  -H "Authorization: Bearer ${apiKey}" \\`,
        body ? `  -H "Content-Type: application/json" \\` : null,
        body ? `  -d '${body.replace(/\n/g, "").replace(/\s{2,}/g, " ")}'` : `  -H "Accept: application/json"`,
      ]
        .filter(Boolean)
        .join("\n");

    case "node":
      return `import { VeroKYC } from "@verokyc/sdk";

const client = new VeroKYC("${apiKey}", { environment: "sandbox" });

const result = await client.${sdkMethodName(endpoint)}(${body ?? JSON.stringify(input, null, 2)});
console.log(result);

// --- or with plain fetch ---
const res = await fetch("${url}", {
  method: "${method}",
  headers: {
    Authorization: "Bearer ${apiKey}",${body ? `\n    "Content-Type": "application/json",` : ""}
  },${body ? `\n  body: JSON.stringify(${body}),` : ""}
});
console.log(await res.json());`;

    case "python":
      return `from verokyc import VeroKYC

client = VeroKYC("${apiKey}", environment="sandbox")
result = client.${snakeMethodName(endpoint)}(${
        body ? `**${body.replace(/"(\w+)":/g, '"$1":')}` : ""
      })
print(result)

# --- or with requests ---
import requests

res = requests.${method.toLowerCase()}(
    "${url}",
    headers={"Authorization": "Bearer ${apiKey}"},${body ? `\n    json=${body},` : ""}
    timeout=15,
)
print(res.json())`;

    case "go":
      return `package main

import (
\t"bytes"
\t"fmt"
\t"io"
\t"net/http"
)

func main() {
${body ? `\tpayload := []byte(\`${body}\`)\n\treq, _ := http.NewRequest("${method}", "${url}", bytes.NewBuffer(payload))\n\treq.Header.Set("Content-Type", "application/json")` : `\treq, _ := http.NewRequest("${method}", "${url}", nil)`}
\treq.Header.Set("Authorization", "Bearer ${apiKey}")

\tres, err := http.DefaultClient.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer res.Body.Close()

\tout, _ := io.ReadAll(res.Body)
\tfmt.Println(string(out))
}`;

    case "java":
      return `import java.net.URI;
import java.net.http.*;

public class VeroKycExample {
  public static void main(String[] args) throws Exception {
    HttpClient client = HttpClient.newHttpClient();

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("${url}"))
        .header("Authorization", "Bearer ${apiKey}")${body ? `\n        .header("Content-Type", "application/json")` : ""}
        .${method === "GET" ? "GET()" : `method("${method}", HttpRequest.BodyPublishers.ofString("""\n${body ?? "{}"}\n"""))`}
        .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    System.out.println(response.body());
  }
}`;

    case "php":
      return `<?php
require 'vendor/autoload.php';

$ch = curl_init("${url}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => "${method}",
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer ${apiKey}",${body ? `\n        "Content-Type: application/json",` : ""}
    ],${body ? `\n    CURLOPT_POSTFIELDS => json_encode(${body.replace(/"(\w+)":/g, "'$1' =>").replace(/\{/g, "[").replace(/\}/g, "]")}),` : ""}
]);

$response = curl_exec($ch);
curl_close($ch);
print_r(json_decode($response, true));`;
  }
}
