FROM golang:1.24.2

RUN GO111MODULE="on" go get github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb
RUN go get github.com/google/go-jsonnet/cmd/jsonnet
RUN curl -fSL -o "/usr/local/bin/grr" "https://github.com/grafana/grizzly/releases/download/v0.1.0/grr-linux-amd64" && chmod a+x "/usr/local/bin/grr"

WORKDIR /grafana

COPY grafana .
RUN jb install 

ENV GRAFANA_URL=http://admin:admin@grafana:3000

ENTRYPOINT [ "/bin/sh" ]
