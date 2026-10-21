# Builds the API and the migrate tool into one small image.
# The build stage runs on the build machine and cross-compiles, so multi-arch builds stay fast.
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS build
ARG TARGETOS TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# timetzdata embeds the timezone database, so the runtime image needs no tzdata package.
RUN export CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
 && go build -trimpath -tags timetzdata -ldflags="-s -w" -o /out/api ./cmd/api \
 && go build -trimpath -tags timetzdata -ldflags="-s -w" -o /out/migrate ./cmd/migrate

# No RUN steps here, so images for other architectures build without CPU emulation.
FROM alpine:3.22
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/api /out/migrate /app/
USER 10001:10001
WORKDIR /app
EXPOSE 8787 9091
ENTRYPOINT ["/app/api"]
