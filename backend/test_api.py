import json
import urllib.request


url = "http://127.0.0.1:8000/api/investigate"

files = [
    (
        r"..\test-images\red.png",
        "red.png",
        "image/png",
    ),
    (
        r"..\test-images\laboratory.jpg",
        "laboratory.jpg",
        "image/jpeg",
    ),
]

boundary = "----TrustLayerTest"

parts = []

for path, filename, content_type in files:
    with open(path, "rb") as file:
        data = file.read()

    parts.append(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="artifacts"; '
            f'filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n"
            f"\r\n"
        ).encode()
        + data
        + b"\r\n"
    )

body = (
    b"".join(parts)
    + f"--{boundary}--\r\n".encode()
)

request = urllib.request.Request(
    url,
    data=body,
    headers={
        "Content-Type": (
            f"multipart/form-data; boundary={boundary}"
        )
    },
    method="POST",
)

with urllib.request.urlopen(request) as response:
    result = json.load(response)


print()
print("ARTIFACT SCORES")
print("----------------")
print(result["comparison"].get("artifact_scores"))
print()
print("IMAGE FORENSICS")
print("----------------")

for artifact in result["artifacts"]:
    forensic = artifact.get("image_forensics") or {}

    print(
        artifact["filename"],
        "| entropy:",
        forensic.get("entropy"),
    )

print()
print("RELATIONSHIPS")
print("----------------")

for relationship in result["comparison"]["relationships"]:
    print(
        relationship["source"],
        "->",
        relationship["target"],
        "|",
        relationship["relationship"],
        "| score:",
        relationship.get("consistency_score"),
    )
    print()
print("VERDICT")
print("----------------")

print(
    result["verdict"]["verdict"]
)

print(
    "Confidence:",
    result["verdict"]["confidence"]
)

print(
    "Uncertainty:",
    result["verdict"]["uncertainty"]
)

print()
print("REASONING")
print("----------------")

for reason in result["verdict"]["reasoning"]:
    print("-", reason)