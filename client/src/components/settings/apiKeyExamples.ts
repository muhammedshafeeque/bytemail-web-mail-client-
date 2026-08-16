export interface CodeExample {
  id: string;
  label: string;
  code: string;
}

export function buildApiExamples(origin: string, key = 'bm_YOUR_KEY'): CodeExample[] {
  const url = `${origin}/api/v1/mail/send`;
  const payload = '{"to":"someone@example.com","subject":"Hello","text":"Sent via API"}';

  return [
    {
      id: 'curl',
      label: 'cURL',
      code: `curl -X POST ${url} \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '${payload}'`,
    },
    {
      id: 'js',
      label: 'JavaScript',
      code: `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    "X-API-Key": "${key}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: "someone@example.com",
    subject: "Hello",
    text: "Sent via API",
  }),
});

const data = await res.json();
console.log(data);`,
    },
    {
      id: 'python',
      label: 'Python',
      code: `import requests

res = requests.post(
    "${url}",
    headers={"X-API-Key": "${key}"},
    json={
        "to": "someone@example.com",
        "subject": "Hello",
        "text": "Sent via API",
    },
)
print(res.json())`,
    },
    {
      id: 'java',
      label: 'Java',
      code: `HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${url}"))
    .header("X-API-Key", "${key}")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        "${payload.replace(/"/g, '\\"')}"
    ))
    .build();

HttpResponse<String> res = HttpClient.newHttpClient()
    .send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(res.body());`,
    },
    {
      id: 'ruby',
      label: 'Ruby',
      code: `require "net/http"
require "json"
require "uri"

uri = URI("${url}")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == "https"

req = Net::HTTP::Post.new(uri)
req["X-API-Key"] = "${key}"
req["Content-Type"] = "application/json"
req.body = {
  to: "someone@example.com",
  subject: "Hello",
  text: "Sent via API",
}.to_json

puts http.request(req).body`,
    },
    {
      id: 'rust',
      label: 'Rust',
      code: `use reqwest::Client;
use serde_json::json;

let client = Client::new();
let res = client
    .post("${url}")
    .header("X-API-Key", "${key}")
    .json(&json!({
        "to": "someone@example.com",
        "subject": "Hello",
        "text": "Sent via API"
    }))
    .send()
    .await?;

println!("{}", res.text().await?);`,
    },
    {
      id: 'go',
      label: 'Go',
      code: `req, _ := http.NewRequest("POST", "${url}", strings.NewReader(\`${payload}\`))
req.Header.Set("X-API-Key", "${key}")
req.Header.Set("Content-Type", "application/json")

res, err := http.DefaultClient.Do(req)
if err != nil {
    log.Fatal(err)
}
defer res.Body.Close()
body, _ := io.ReadAll(res.Body)
fmt.Println(string(body))`,
    },
    {
      id: 'php',
      label: 'PHP',
      code: `$ch = curl_init("${url}");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "X-API-Key: ${key}",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => '${payload}',
    CURLOPT_RETURNTRANSFER => true,
]);
echo curl_exec($ch);
curl_close($ch);`,
    },
    {
      id: 'c',
      label: 'C',
      code: `#include <curl/curl.h>

CURL *curl = curl_easy_init();
struct curl_slist *headers = NULL;
headers = curl_slist_append(headers, "X-API-Key: ${key}");
headers = curl_slist_append(headers, "Content-Type: application/json");

curl_easy_setopt(curl, CURLOPT_URL, "${url}");
curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "${payload.replace(/"/g, '\\"')}");
curl_easy_perform(curl);

curl_slist_free_all(headers);
curl_easy_cleanup(curl);`,
    },
    {
      id: 'cpp',
      label: 'C++',
      code: `#include <cpr/cpr.h>
#include <iostream>

cpr::Response r = cpr::Post(
    cpr::Url{"${url}"},
    cpr::Header{
        {"X-API-Key", "${key}"},
        {"Content-Type", "application/json"}
    },
    cpr::Body{R"(${payload})"}
);
std::cout << r.text << std::endl;`,
    },
  ];
}
