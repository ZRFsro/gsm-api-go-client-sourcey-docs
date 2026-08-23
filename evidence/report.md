# Sourcey documentation adoption report

Target: `grafana/gsm-api-go-client` at commit `cb525870bd3b32dd1b33265eb8b8b22ff65b3b99`.

The repository is maintained by Grafana and has 126 commits, but its README contains only a title and one sentence. It has no API reference link. The checked-in `openapi.yaml` is the canonical source contract.

Sourcey 3.6.5 validated the contract and generated a static documentation site through its OpenAPI adapter: 7 operations, 7 schemas, 9 generated files, 1,137,042 bytes. The proposed upstream change links the generated reference and documents the exact reproducible build command.

The public site is a deployment of the exact generated output. The upstream PR is the adoption path; maintainers can merge the small README addition and later move deployment under Grafana ownership without changing the Sourcey build.

Runx note: the official `runx/sourcey@sha-60f1861aafe3` package was resolved from `https://api.runx.ai`, but its managed agent step could not be completed in this host. The deterministic Sourcey validation/build output and full command evidence are published here; no successful runx receipt is claimed.
