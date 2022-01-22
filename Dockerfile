FROM golang:1.17
WORKDIR /app
COPY . /app
RUN go build
EXPOSE 9992
ENTRYPOINT ["./rain"]
