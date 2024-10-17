FROM ghcr.io/grpc-ecosystem/grpc-health-probe:v0.4.33@sha256:4ff348432968a70ea2a97bf2c61641dc6495b08a552b5e9038d9166aea1c4969 as grpc_health_probe
FROM cgr.dev/chainguard/go:1.22@sha256:80ebff2d788e242fa5c03a0788f7cf0660d4ab470df95839b3eeb6ced45b3108 AS builder

WORKDIR /app

# install and cache dependencies
RUN --mount=type=cache,target=/root/go/pkg/mod \
    --mount=type=bind,source=go.sum,target=go.sum \
    --mount=type=bind,source=go.mod,target=go.mod \
    go mod download -x

# build with cache
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/root/go/pkg/mod \
    --mount=type=bind,target=. \
    CGO_ENABLED=0 go build -o /bin/openfga ./cmd/openfga

FROM cgr.dev/chainguard/static@sha256:d7518504f59dacbc90852349c0878871199cefd4bed7952d2eeb7cc3ddbe69e5

EXPOSE 8081
EXPOSE 8080
EXPOSE 3000

COPY --from=grpc_health_probe /ko-app/grpc-health-probe /usr/local/bin/grpc_health_probe
COPY --from=builder /bin/openfga /openfga

# Healthcheck configuration for the container using grpc_health_probe
# The container will be considered healthy if the gRPC health probe returns a successful response.
HEALTHCHECK --interval=5s --timeout=30s --retries=3 CMD ["/usr/local/bin/grpc_health_probe", "-addr=:8081"]

ENTRYPOINT ["/openfga"]
