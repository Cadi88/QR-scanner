# Chaos tests (E10)

`docker-compose up` starts Toxiproxy. Tests register proxies against it and add
toxics (latency, `timeout`, `limit_data`) to reproduce a network partition
during sync.

- **E10** — partition injected mid-sync; no scans lost, chain intact on heal.

Scenarios are written in F2-06 (`sync_batch()` + reconciliation). This directory
currently holds only the compose skeleton.
