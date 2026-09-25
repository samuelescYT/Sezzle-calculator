# syntax=docker/dockerfile:1

# Build stage: the Debian-based image ships gcc, so the race detector can run.
FROM golang:1.27 AS build
WORKDIR /src

COPY go.mod ./
RUN go mod download

COPY . .
RUN go vet ./... && go test -race ./...
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Runtime stage: static binary on a minimal, non-root image.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
